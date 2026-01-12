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
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://fox-uniformes.vercel.app';

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
   CRIAR PAGAMENTO (BASE)
===================================================== */

const criarPagamento = async ({ clienteId, pedidos, valorTotal, nomeCliente }) => {
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  const pagamento = await pagamentoRepository.savePagamento({
    clienteId,
    pedidos,
    valorTotal,
    status: 'Pendente',
    processadoWebhook: false
  });

  // Cria preference apenas para checkout/cartão
  const pedidosDb = await Pedido.find({ _id: { $in: pedidos } }).populate('produtoId');

  const items = pedidosDb.map(p => ({
    title: p.produtoId?.name || 'Produto',
    quantity: p.quantidade,
    unit_price: Number(p.preco),
    currency_id: 'BRL'
  }));

  const preference = await preferenceApi.create({
    body: {
      items,
      payer: { email: cliente.email, name: nomeCliente },
      external_reference: pagamento._id.toString(),
      notification_url: `${BACKEND_URL}/webhook/mercadopago`,
      back_urls: {
        success: `${FRONTEND_URL}/pagamento/sucesso`,
        failure: `${FRONTEND_URL}/pagamento/erro`,
        pending: `${FRONTEND_URL}/pagamento/pendente`
      },
      auto_return: 'approved'
    }
  });

  const preferenceId = preference.body?.id;
  await pagamentoRepository.updatePagamento(pagamento._id, { preferenceId });

  // Envia e-mail com link do sistema
  await emailService.enviarLinkPagamento({
    para: cliente.email,
    nome: cliente.nome,
    valorTotal,
    linkPagamento: `${FRONTEND_URL}/pagamento/${pagamento._id}`
  });

  return { pagamento };
};

/* =====================================================
   GERAR PIX (CORRIGIDO)
===================================================== */

const gerarPixParaPagamento = async (pagamentoId) => {
  const pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
  if (!pagamento) throw new Error('Pagamento não encontrado');

  const cliente = await Cliente.findById(pagamento.clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  const response = await paymentApi.create({
    body: {
      transaction_amount: Number(pagamento.valorTotal),
      payment_method_id: 'pix',
      description: `Pedido ${pagamentoId}`,
      payer: {
        email: cliente.email,
        first_name: cliente.nome
      },
      external_reference: pagamentoId,
      notification_url: `${BACKEND_URL}/webhook/mercadopago`
    }
  });

  // 🔥 CORREÇÃO CRÍTICA AQUI
  const payment =
    response.body ||
    response.response ||
    response;

  const pixData =
    payment.point_of_interaction?.transaction_data;

  if (!pixData) {
    console.error('[ERRO] Resposta MP PIX:', JSON.stringify(payment, null, 2));
    throw new Error('Não foi possível gerar dados PIX');
  }

  await pagamentoRepository.updatePagamento(pagamentoId, {
    metodoPagamento: 'PIX',
    externalId: payment.id,
    pix: {
      qrCode: pixData.qr_code,
      copiaECola: pixData.qr_code,
      qrCodeBase64: pixData.qr_code_base64
    }
  });

  return {
    qrCodeBase64: pixData.qr_code_base64,
    copiaECola: pixData.qr_code,
    paymentId: payment.id
  };
};

/* =====================================================
   CARTÃO
===================================================== */

const processarPagamentoCartao = async (pagamentoId, dadosCartao) => {
  const pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
  if (!pagamento) throw new Error('Pagamento não encontrado');

  const cliente = await Cliente.findById(pagamento.clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  const response = await paymentApi.create({
    body: {
      transaction_amount: Number(pagamento.valorTotal),
      token: dadosCartao.token,
      installments: dadosCartao.installments,
      payment_method_id: dadosCartao.payment_method_id,
      issuer_id: dadosCartao.issuer_id,
      payer: {
        email: cliente.email,
        first_name: cliente.nome
      },
      external_reference: pagamentoId,
      notification_url: `${BACKEND_URL}/webhook/mercadopago`
    }
  });

  const payment = response.body || response;

  await pagamentoRepository.updatePagamento(pagamentoId, {
    metodoPagamento: 'Cartão de Crédito',
    externalId: payment.id
  });

  return payment;
};

/* =====================================================
   CONFIRMAÇÃO (WEBHOOK)
===================================================== */

const confirmarPagamentoPorExternalId = async (
  externalReference,
  paymentId,
  metodoPagamento
) => {
  const pagamento = await pagamentoRepository.getPagamentoById(externalReference);
  if (!pagamento || pagamento.processadoWebhook) return;

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
  const pedidos = await Pedido.find({ _id: { $in: pagamento.pedidos } })
    .populate('produtoId');

  const itens = pedidos.map(p => ({
    produtoNome: p.produtoId?.name || 'Produto',
    quantidade: p.quantidade,
    precoUnitario: p.preco / p.quantidade,
    precoTotal: p.preco
  }));

  const numeroNota = gerarNumeroNota();
  const caminhoNota = await gerarNotaFiscal({
    numeroNota,
    cliente,
    itens,
    valorTotal: pagamento.valorTotal,
    formaPagamento: metodoPagamento.toLowerCase(),
    parcelas: pagamento.parcelas || 1,
    dataEmissao: new Date()
  });

  await pagamentoRepository.updatePagamento(pagamento._id, {
    notaFiscal: {
      numero: numeroNota,
      caminho: caminhoNota,
      url: `${BACKEND_URL}${getUrlNotaFiscal(caminhoNota)}`,
      geradaEm: new Date()
    }
  });
};

/* =====================================================
   AUX
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
  gerarPixParaPagamento,
  processarPagamentoCartao,
  confirmarPagamentoPorExternalId,
  cancelarPagamento
};
