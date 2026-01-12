import pagamentoRepository from '../repository/pagamentoRepository.js';
import Pedido from '../models/pedido.js';
import Cliente from '../models/cliente.js';
import {
  gerarNotaFiscal,
  gerarNumeroNota,
  getUrlNotaFiscal
} from './notaFiscalService.js';
import emailService from './emailService.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

/* =====================================================
   CONFIG
===================================================== */

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const mpClient = new MercadoPagoConfig({
  accessToken: MERCADO_PAGO_ACCESS_TOKEN
});

const preferenceApi = new Preference(mpClient);
const paymentApi = new Payment(mpClient);

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

  // Cria a preference do Mercado Pago (mas não envia o link para o cliente)
  let preferenceId = null;
  try {
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
    preferenceId = preference.body?.id || preference.response?.id || preference.id;
    if (!preferenceId) throw new Error('Preference criada mas não retornou id.');
    // Salva o id da preference no pagamento
    await pagamentoRepository.updatePagamento(pagamento._id, { preferenceId });
    console.log('[DEBUG] Preference Mercado Pago criada, id:', preferenceId);
  } catch (err) {
    console.error('[ERRO] Falha ao criar preference Mercado Pago:', err?.message || err);
    throw new Error('Erro ao criar preference Mercado Pago.');
  }

  // Envia o e-mail com o link para a página de pagamento do sistema
  try {
    const linkPagamento = `${process.env.FRONTEND_URL || 'https://fox-uniformes.vercel.app'}/pagamento/${pagamento._id}`;
    await emailService.enviarLinkPagamento({
      para: cliente.email,
      nome: cliente.nome,
      valorTotal,
      linkPagamento
    });
    console.log('[DEBUG] E-mail de pagamento enviado para', cliente.email);
  } catch (err) {
    console.error('Erro ao enviar e-mail de pagamento:', err);
  }

  return {
    pagamento
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

/**
 * Gera dados PIX (QR Code e copia e cola) para o pagamento
 */
const gerarPixParaPagamento = async (pagamentoId) => {
  let pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
  if (!pagamento) throw new Error('Pagamento não encontrado');

  // Fallback: se não houver preferenceId, cria uma preference agora
  if (!pagamento.preferenceId) {
    // Busca os pedidos para montar os itens do checkout
    const pedidosDb = await Pedido.find({ _id: { $in: pagamento.pedidos } }).populate('produtoId');
    const items = pedidosDb.map((p) => ({
      title: p.produtoId?.name || 'Produto',
      quantity: p.quantidade,
      unit_price: Number(p.preco),
      currency_id: 'BRL'
    }));
    const cliente = await Cliente.findById(pagamento.clienteId);
    if (!cliente) throw new Error('Cliente não encontrado');
    const preference = await preferenceApi.create({
      body: {
        items,
        payer: {
          email: cliente.email,
          name: cliente.nome
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
    const preferenceId = preference.body?.id || preference.response?.id || preference.id;
    if (!preferenceId) throw new Error('Falha ao criar preference Mercado Pago.');
    await pagamentoRepository.updatePagamento(pagamento._id, { preferenceId });
    pagamento = await pagamentoRepository.getPagamentoById(pagamentoId); // Atualiza o objeto
  }

  // ...continua fluxo normal...
  const valor = pagamento.valorTotal;
  const cliente = await Cliente.findById(pagamento.clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  try {
    const payment = await paymentApi.create({
      body: {
        transaction_amount: Number(valor),
        payment_method_id: 'pix',
        payer: {
          email: cliente.email,
          first_name: cliente.nome
        },
        description: `Pedido ${pagamentoId}`,
        external_reference: pagamentoId
      }
    });
    const pixData = payment.body?.point_of_interaction?.transaction_data;
    if (!pixData) throw new Error('Não foi possível gerar dados PIX.');
    await pagamentoRepository.updatePagamento(pagamentoId, { paymentId: payment.body.id });
    return {
      qrCode: pixData.qr_code,
      qrCodeBase64: pixData.qr_code_base64,
      copiaECola: pixData.qr_code,
      paymentId: payment.body.id
    };
  } catch (err) {
    console.error('[ERRO] Falha ao gerar pagamento PIX:', err?.message || err);
    throw new Error('Erro ao gerar pagamento PIX.');
  }
};

/**
 * Processa pagamento via cartão de crédito
 * @param {string} pagamentoId
 * @param {object} dadosCartao { token, installments, payment_method_id, issuer_id }
 */
const processarPagamentoCartao = async (pagamentoId, dadosCartao) => {
  const pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
  if (!pagamento) throw new Error('Pagamento não encontrado');
  const valor = pagamento.valorTotal;
  const cliente = await Cliente.findById(pagamento.clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  try {
    const payment = await paymentApi.create({
      body: {
        transaction_amount: Number(valor),
        token: dadosCartao.token,
        installments: dadosCartao.installments,
        payment_method_id: dadosCartao.payment_method_id,
        issuer_id: dadosCartao.issuer_id,
        payer: {
          email: cliente.email,
          first_name: cliente.nome
        },
        description: `Pedido ${pagamentoId}`,
        external_reference: pagamentoId
      }
    });
    // Salva o paymentId no pagamento
    await pagamentoRepository.updatePagamento(pagamentoId, { paymentId: payment.body.id });
    return payment.body;
  } catch (err) {
    console.error('[ERRO] Falha ao processar pagamento cartão:', err?.message || err);
    throw new Error('Erro ao processar pagamento cartão.');
  }
};

/* ====================================================
   EXPORT
====================================================== */

export default {
  getAllPagamentos,
  getPagamentoById,
  getPagamentosByCliente,
  getPagamentosPendentes,
  criarPagamento,
  confirmarPagamentoPorExternalId,
  cancelarPagamento,
  gerarPixParaPagamento,
  processarPagamentoCartao
};
