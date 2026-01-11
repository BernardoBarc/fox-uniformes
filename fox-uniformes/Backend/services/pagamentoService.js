import pagamentoRepository from '../repository/pagamentoRepository.js';
import Pedido from '../models/pedido.js';
import Cliente from '../models/cliente.js';
import {
  gerarNotaFiscal,
  gerarNumeroNota,
  getUrlNotaFiscal
} from './notaFiscalService.js';
import emailService from './emailService.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

/* =====================================================
   CONFIG
===================================================== */

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const mpClient = new MercadoPagoConfig({
  accessToken: MERCADO_PAGO_ACCESS_TOKEN
});

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
   CRIAR PAGAMENTO
===================================================== */

const criarPagamento = async (data) => {
  const {
    clienteId,
    pedidos,
    valorTotal,
    nomeCliente,
    metodoPagamento,
    cardToken,
    installments,
    payer
  } = data;

  const cliente = await Cliente.findById(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  // 1️⃣ Cria pagamento local
  const pagamento = await pagamentoRepository.savePagamento({
    clienteId,
    pedidos,
    valorTotal,
    status: 'Pendente',
    processadoWebhook: false
  });

  let pix = null;
  let card = null;

  // 2️⃣ PIX
  if (metodoPagamento === 'PIX') {
    pix = await criarPagamentoPix(
      pagamento,
      cliente,
      nomeCliente,
      valorTotal
    );

    // 📧 Envia e-mail com link + copia e cola
    try {
      await emailService.enviarLinkPagamento({
        para: cliente.email,
        nome: cliente.nome,
        valorTotal,
        linkPagamento: pix.ticketUrl,
        pixCopiaECola: pix.copiaECola
      });
    } catch (err) {
      console.error('Erro ao enviar e-mail de pagamento:', err);
    }
  }

  // 3️⃣ CARTÃO
  if (metodoPagamento === 'CREDIT_CARD') {
    card = await criarPagamentoCartao(
      pagamento,
      nomeCliente,
      valorTotal,
      cardToken,
      installments,
      payer
    );
  }

  return {
    pagamento,
    pix,
    card
  };
};

/* =====================================================
   PIX
===================================================== */

const criarPagamentoPix = async (
  pagamento,
  cliente,
  nomeCliente,
  valorTotal
) => {
  const response = await paymentApi.create({
    body: {
      transaction_amount: Number(valorTotal),
      description: `Pedido - ${nomeCliente}`,
      payment_method_id: 'pix',
      payer: {
        email: cliente.email,
        first_name: nomeCliente
      },
      external_reference: pagamento._id.toString(),
      notification_url: `${BACKEND_URL}/api/webhook/mercadopago`
    }
  });

  const payment = response.body || response;

  const pixData =
    payment.point_of_interaction?.transaction_data;

  if (!pixData) {
    throw new Error('Erro ao gerar dados PIX');
  }

  // Atualiza pagamento com dados do PIX
  await pagamentoRepository.updatePagamento(pagamento._id, {
    externalId: payment.id,
    metodoPagamento: 'PIX',
    linkPagamento: pixData.ticket_url,
    gatewayResponse: payment
  });

  return {
    qrCodeBase64: pixData.qr_code_base64,
    copiaECola: pixData.qr_code,
    ticketUrl: pixData.ticket_url
  };
};

/* =====================================================
   CARTÃO
===================================================== */

const criarPagamentoCartao = async (
  pagamento,
  nomeCliente,
  valorTotal,
  cardToken,
  installments = 1,
  payer
) => {
  const response = await paymentApi.create({
    body: {
      transaction_amount: Number(valorTotal),
      token: cardToken,
      description: `Pedido - ${nomeCliente}`,
      installments,
      payment_method_id: 'credit_card',
      payer,
      external_reference: pagamento._id.toString(),
      notification_url: `${BACKEND_URL}/api/webhook/mercadopago`
    }
  });

  const payment = response.body;

  await pagamentoRepository.updatePagamento(pagamento._id, {
    externalId: payment.id,
    metodoPagamento: 'Cartão de Crédito',
    parcelas: installments,
    gatewayResponse: payment
  });

  // Cartão aprovado não espera webhook
  if (payment.status === 'approved') {
    await confirmarPagamentoPorExternalId(
      pagamento._id.toString(),
      payment.id,
      'Cartão de Crédito'
    );
  }

  return {
    paymentId: payment.id,
    status: payment.status
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
