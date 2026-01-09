import pagamentoRepository from '../repository/pagamentoRepository.js';
import Pedido from '../models/pedido.js';
import Cliente from '../models/cliente.js';
import { gerarNotaFiscal, gerarNumeroNota, getUrlNotaFiscal } from './notaFiscalService.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const mpClient = new MercadoPagoConfig({ accessToken: MERCADO_PAGO_ACCESS_TOKEN });
const paymentInstance = new Payment(mpClient);

/* =====================================================
   CRUD BÁSICO
===================================================== */

const getAllPagamentos = () => pagamentoRepository.getAllPagamentos();
const getPagamentoById = (id) => pagamentoRepository.getPagamentoById(id);
const getPagamentosByCliente = (clienteId) =>
  pagamentoRepository.getPagamentosByCliente(clienteId);
const getPagamentosPendentes = () => pagamentoRepository.getPagamentosPendentes();

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
    payer,
  } = data;

  const cliente = await Cliente.findById(clienteId);

  const pagamento = await pagamentoRepository.savePagamento({
    clienteId,
    pedidos,
    valorTotal,
    status: 'Pendente',
    processadoWebhook: false, // ✅ SUGESTÃO 6
  });

  let pixData = null;
  let cardData = null;

  try {
    if (metodoPagamento === 'PIX') {
      pixData = await criarPagamentoPixMercadoPago(
        pagamento,
        nomeCliente,
        valorTotal
      );
    }

    if (metodoPagamento === 'CREDIT_CARD') {
      cardData = await criarPagamentoCartaoMercadoPago(
        pagamento,
        nomeCliente,
        valorTotal,
        cardToken,
        installments,
        payer
      );
    }
  } catch (err) {
    throw new Error(err.message);
  }

  return { pagamento, pixData, cardData };
};

/* =====================================================
   PIX MERCADO PAGO
===================================================== */

const criarPagamentoPixMercadoPago = async (pagamento, nomeCliente, valorTotal) => {
  const response = await paymentInstance.create({
    body: {
      transaction_amount: Number(valorTotal),
      description: `Pedido Fox Uniformes - ${nomeCliente}`,
      payment_method_id: 'pix',
      payer: {
        email: 'comprador@foxuniformes.com',
        first_name: nomeCliente,
      },
      external_reference: pagamento._id.toString(),
      notification_url: `${BACKEND_URL}/api/webhook/mercadopago`,
    },
  });

  const payment = response.body || response;

  if (payment.status !== 'pending') {
    throw new Error('PIX criado em estado inválido');
  }

  const pix = payment.point_of_interaction?.transaction_data;

  await pagamentoRepository.updatePagamento(pagamento._id, {
    externalId: payment.id,
    gatewayResponse: payment,
  });

  return {
    qr_code: pix.qr_code,
    qr_code_base64: pix.qr_code_base64,
    ticket_url: pix.ticket_url,
  };
};

/* =====================================================
   CARTÃO MERCADO PAGO
===================================================== */

const criarPagamentoCartaoMercadoPago = async (
  pagamento,
  nomeCliente,
  valorTotal,
  cardToken,
  installments = 1,
  payer
) => {
  const result = await paymentInstance.create({
    body: {
      transaction_amount: valorTotal,
      token: cardToken,
      description: `Pedido Fox Uniformes - ${nomeCliente}`,
      installments,
      payment_method_id: 'credit_card',
      payer,
      external_reference: pagamento._id.toString(),
      notification_url: `${BACKEND_URL}/api/webhook/mercadopago`,
    },
  });

  const payment = result.body;

  await pagamentoRepository.updatePagamento(pagamento._id, {
    externalId: payment.id,
    status: payment.status === 'approved' ? 'Aprovado' : 'Pendente',
    metodoPagamento: 'Cartão de Crédito',
    parcelas: installments,
    gatewayResponse: payment,
  });

  // ✅ SUGESTÃO 7 – cartão aprovado usa a MESMA lógica do webhook
  if (payment.status === 'approved') {
    await confirmarPagamentoPorExternalId(
      pagamento._id.toString(),
      payment.id,
      'Cartão de Crédito'
    );
  }

  return {
    payment_id: payment.id,
    status: payment.status,
  };
};

/* =====================================================
   CONFIRMAÇÃO (WEBHOOK / CARTÃO / PIX)
===================================================== */

const confirmarPagamentoPorExternalId = async (
  externalReference,
  paymentId,
  metodoPagamento
) => {
  const pagamento = await pagamentoRepository.getPagamentoById(externalReference);

  if (!pagamento) return;
  if (pagamento.status === 'Aprovado') return;
  if (pagamento.processadoWebhook) return;

  const cliente = await Cliente.findById(pagamento.clienteId);

  await pagamentoRepository.updatePagamento(pagamento._id, {
    status: 'Aprovado',
    metodoPagamento,
    externalId: paymentId,
    pagamentoConfirmadoEm: new Date(),
    processadoWebhook: true,
  });

  await atualizarStatusPedidos(pagamento.pedidos, 'Em Progresso');

  const pedidos = await Pedido.find({
    _id: { $in: pagamento.pedidos },
  }).populate('produtoId');

  const itens = pedidos.map((p) => ({
    produtoNome: p.produtoId?.name || 'Produto',
    quantidade: p.quantidade,
    precoUnitario: p.preco / p.quantidade,
    precoTotal: p.preco,
  }));

  const numeroNota = gerarNumeroNota();

  const caminhoNota = await gerarNotaFiscal({
    numeroNota,
    cliente: {
      nome: cliente.nome,
      cpf: cliente.cpf,
      email: cliente.email,
      telefone: cliente.telefone,
    },
    itens,
    valorTotal: pagamento.valorTotal,
    formaPagamento: metodoPagamento.toLowerCase(),
    parcelas: pagamento.parcelas || 1,
    dataEmissao: new Date(),
  });

  const urlNota = `${BACKEND_URL}${getUrlNotaFiscal(caminhoNota)}`;

  await pagamentoRepository.updatePagamento(pagamento._id, {
    notaFiscal: {
      numero: numeroNota,
      caminho: caminhoNota,
      url: urlNota,
      geradaEm: new Date(),
    },
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

export default {
  getAllPagamentos,
  getPagamentoById,
  getPagamentosByCliente,
  getPagamentosPendentes,
  criarPagamento,
  confirmarPagamentoPorExternalId,
  cancelarPagamento,
};
