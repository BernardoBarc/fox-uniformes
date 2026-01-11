import pagamentoRepository from '../repository/pagamentoRepository.js';
import Pedido from '../models/pedido.js';
import Cliente from '../models/cliente.js';
import {
  gerarNotaFiscal,
  gerarNumeroNota,
  getUrlNotaFiscal
} from './notaFiscalService.js';
import emailService from './emailService.js';
import { MercadoPagoConfig, Preference } from 'mercadopago';

/* =====================================================
   CONFIG
===================================================== */

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const mpClient = new MercadoPagoConfig({
  accessToken: MERCADO_PAGO_ACCESS_TOKEN
});

const preferenceApi = new Preference(mpClient);

/* =====================================================
   CONSULTAS
===================================================== */

const getAllPagamentos = () => pagamentoRepository.getAllPagamentos();
const getPagamentoById = (id) => pagamentoRepository.getPagamentoById(id);
const getPagamentosByCliente = (clienteId) =>
  pagamentoRepository.getPagamentosByCliente(clienteId);
const getPagamentosPendentes = () =>
  pagamentoRepository.getPagamentosPendentes();

/* =====================================================
   CRIAR PAGAMENTO (Checkout Preference)
===================================================== */

const criarPagamento = async (data) => {
  const {
    clienteId,
    pedidos,
    valorTotal,
    nomeCliente
  } = data;

  const cliente = await Cliente.findById(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  const pagamento = await pagamentoRepository.savePagamento({
    clienteId,
    pedidos,
    valorTotal,
    status: 'Pendente',
    processadoWebhook: false
  });

  // Busca os pedidos para montar os itens do checkout
  const pedidosDb = await Pedido.find({ _id: { $in: pedidos } }).populate('produtoId');
  const items = pedidosDb.map((p) => ({
    title: p.produtoId?.name || 'Produto',
    quantity: p.quantidade,
    unit_price: Number(p.preco),
    currency_id: 'BRL'
  }));

  let checkoutUrl = null;
  try {
    // Cria a preference do Mercado Pago
    const preference = await preferenceApi.create({
      body: {
        items,
        payer: {
          email: cliente.email,
          name: nomeCliente
        },
        external_reference: pagamento._id.toString(),
        notification_url: `${BACKEND_URL}/webhook/mercadopago`,
        back_urls: {
          success: `${BACKEND_URL}/pagamento/sucesso`,
          failure: `${BACKEND_URL}/pagamento/erro`,
          pending: `${BACKEND_URL}/pagamento/pendente`
        },
        auto_return: 'approved'
      }
    });
    console.log('[DEBUG] Resposta completa da preference:', JSON.stringify(preference, null, 2));
    checkoutUrl = preference.body?.init_point;
    if (!checkoutUrl) throw new Error('Preference criada mas não retornou init_point. Veja o log acima.');
    console.log('[DEBUG] Preference criada com sucesso:', checkoutUrl);
  } catch (err) {
    console.error('[ERRO] Falha ao criar preference Mercado Pago:', err?.message || err);
    throw new Error('Erro ao criar link de pagamento Mercado Pago.');
  }

  // Envia o e-mail com o link de pagamento
  try {
    await emailService.enviarLinkPagamento({
      para: cliente.email,
      nome: cliente.nome,
      valorTotal,
      linkPagamento: checkoutUrl
    });
    console.log('[DEBUG] E-mail de pagamento enviado para', cliente.email);
  } catch (err) {
    console.error('Erro ao enviar e-mail de pagamento:', err);
  }

  return {
    pagamento,
    checkoutUrl
  };
};

/* =====================================================
   CONFIRMAÇÃO (WEBHOOK / CARTÃO)
===================================================== */

const confirmarPagamentoPorExternalId = async (
  externalReference,
  paymentId,
  metodoPagamento
) => {
  const pagamento =
    await pagamentoRepository.getPagamentoById(externalReference);

  if (!pagamento) return;
  if (pagamento.status === 'Aprovado') return;
  if (pagamento.processadoWebhook) return;

  const cliente = await Cliente.findById(pagamento.clienteId);

  await pagamentoRepository.updatePagamento(pagamento._id, {
    status: 'Aprovado',
    metodoPagamento,
    externalId: paymentId,
    pagamentoConfirmadoEm: new Date(),
    processadoWebhook: true
  });

  await atualizarStatusPedidos(pagamento.pedidos, 'Em Progresso');

  await gerarNota(pagamento, cliente, metodoPagamento);
};

/* =====================================================
   NOTA FISCAL
===================================================== */

const gerarNota = async (pagamento, cliente, metodoPagamento) => {
  const pedidos = await Pedido.find({
    _id: { $in: pagamento.pedidos }
  }).populate('produtoId');

  const itens = pedidos.map((p) => ({
    produtoNome: p.produtoId?.name || 'Produto',
    quantidade: p.quantidade,
    precoUnitario: p.preco / p.quantidade,
    precoTotal: p.preco
  }));

  const numeroNota = gerarNumeroNota();

  const caminhoNota = await gerarNotaFiscal({
    numeroNota,
    cliente: {
      nome: cliente.nome,
      cpf: cliente.cpf,
      email: cliente.email,
      telefone: cliente.telefone
    },
    itens,
    valorTotal: pagamento.valorTotal,
    formaPagamento: metodoPagamento.toLowerCase(),
    parcelas: pagamento.parcelas || 1,
    dataEmissao: new Date()
  });

  const urlNota = `${BACKEND_URL}${getUrlNotaFiscal(caminhoNota)}`;

  await pagamentoRepository.updatePagamento(pagamento._id, {
    notaFiscal: {
      numero: numeroNota,
      caminho: caminhoNota,
      url: urlNota,
      geradaEm: new Date()
    }
  });
};

/* =====================================================
   AUXILIARES
===================================================== */

const atualizarStatusPedidos = async (ids, status) => {
  for (const id of ids) {
    await Pedido.findByIdAndUpdate(id, { status });
  }
};

const cancelarPagamento = (id) =>
  pagamentoRepository.updatePagamento(id, { status: 'Cancelado' });

/* =====================================================
   EXPORT
===================================================== */

export default {
  getAllPagamentos,
  getPagamentoById,
  getPagamentosByCliente,
  getPagamentosPendentes,
  criarPagamento,
  confirmarPagamentoPorExternalId,
  cancelarPagamento
};
