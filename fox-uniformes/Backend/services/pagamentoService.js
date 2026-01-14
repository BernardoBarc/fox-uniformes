import pagamentoRepository from '../repository/pagamentoRepository.js';
import Pedido from '../models/pedido.js';
import Cliente from '../models/cliente.js';

import {
  gerarNotaFiscal,
  getUrlNotaFiscal
} from './notaFiscalService.js';

import emailService from './emailService.js';

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

/* =====================================================
   CONFIGURAÇÕES
===================================================== */

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'https://fox-uniformes.vercel.app';

const mpClient = new MercadoPagoConfig({
  accessToken: MERCADO_PAGO_ACCESS_TOKEN
});

const preferenceApi = new Preference(mpClient);
const paymentApi = new Payment(mpClient);

/* =====================================================
   AUXILIAR - VALIDA CPF
===================================================== */

const validarCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, '');

  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;

  return resto === parseInt(cpf[10]);
};

/* =====================================================
   CONSULTAS
===================================================== */

const getAllPagamentos = () =>
  pagamentoRepository.getAllPagamentos();

const getPagamentoById = (id) =>
  pagamentoRepository.getPagamentoById(id);

const getPagamentosByCliente = (clienteId) =>
  pagamentoRepository.getPagamentosByCliente(clienteId);

const getPagamentosPendentes = () =>
  pagamentoRepository.getPagamentosPendentes();

/* =====================================================
   CRIAÇÃO DO PAGAMENTO
===================================================== */

const criarPagamento = async ({
  clienteId,
  pedidos,
  valorTotal,
  nomeCliente
}) => {
  const cliente = await Cliente.findById(clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  const pagamento = await pagamentoRepository.savePagamento({
    clienteId,
    pedidos,
    valorTotal,
    status: 'Pendente',
    processadoWebhook: false
  });

  const pedidosDb = await Pedido.find({
    _id: { $in: pedidos }
  }).populate('produtoId');

  const items = pedidosDb.map(p => ({
    title: p.produtoId?.name || 'Produto',
    quantity: p.quantidade,
    unit_price: Number(p.preco),
    currency_id: 'BRL'
  }));

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
        success: `${FRONTEND_URL}/pagamento/sucesso`,
        failure: `${FRONTEND_URL}/pagamento/erro`,
        pending: `${FRONTEND_URL}/pagamento/pendente`
      },
      auto_return: 'approved'
    }
  });

  await pagamentoRepository.updatePagamento(pagamento._id, {
    preferenceId: preference.body?.id
  });

  await emailService.enviarLinkPagamento({
    para: cliente.email,
    nome: cliente.nome,
    valorTotal,
    linkPagamento: `${FRONTEND_URL}/pagamento/${pagamento._id}`
  });

  return pagamento;
};

/* =====================================================
   PIX (INALTERADO)
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

  const payment =
    response.body || response.response || response;

  const pixData =
    payment.point_of_interaction?.transaction_data;

  if (!pixData) {
    throw new Error('Não foi possível gerar dados PIX');
  }

  await pagamentoRepository.updatePagamento(pagamentoId, {
    metodoPagamento: 'PIX',
    externalId: payment.id,
    pix: {
      copiaECola: pixData.qr_code,
      qrCodeBase64: pixData.qr_code_base64
    }
  });

  return {
    copiaECola: pixData.qr_code,
    qrCodeBase64: pixData.qr_code_base64
  };
};

/* =====================================================
   CARTÃO DE CRÉDITO (CORRIGIDO)
===================================================== */

const processarPagamentoCartao = async (pagamentoId, dadosCartao) => {
  const pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
  if (!pagamento) throw new Error('Pagamento não encontrado');

  const cliente = await Cliente.findById(pagamento.clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  if (!validarCPF(dadosCartao.cpf)) {
    throw new Error('CPF inválido');
  }

 const response = await paymentApi.create({
  body: {
    transaction_amount: Number(pagamento.valorTotal),
    token: dadosCartao.token,
    installments: dadosCartao.installments,
    payer: {
      email: cliente.email,
      first_name: cliente.nome,
      identification: {
        type: 'CPF',
        number: dadosCartao.cpf
      }
    },
    external_reference: pagamentoId,
    notification_url: `${BACKEND_URL}/webhook/mercadopago`
  }
});

const payment = response.body;

await pagamentoRepository.updatePagamento(pagamentoId, {
  metodoPagamento: 'Cartão de Crédito',
  externalId: payment.id,
  parcelas: dadosCartao.installments,
  status: 'Em processamento'
});


  return {
    sucesso: true,
    status: payment.status
  };
};

/* =====================================================
   WEBHOOK
===================================================== */

const confirmarPagamentoPorExternalId = async (
  pagamentoId,
  paymentId,
  metodoPagamento
) => {
  const pagamento =
    await pagamentoRepository.getPagamentoById(pagamentoId);

  if (!pagamento || pagamento.processadoWebhook) return;

  const cliente = await Cliente.findById(pagamento.clienteId);

  await pagamentoRepository.updatePagamento(pagamento._id, {
    status: 'Aprovado',
    metodoPagamento,
    externalId: paymentId,
    pagamentoConfirmadoEm: new Date(),
    processadoWebhook: true
  });

  await atualizarStatusPedidos(pagamento.pedidos, 'Pendente');

  const notaFiscal = await gerarNotaFiscalPagamento(
    pagamento,
    cliente,
    metodoPagamento
  );

  await emailService.enviarNotaFiscal({
    para: cliente.email,
    nome: cliente.nome,
    numeroNota: notaFiscal.numero,
    caminhoPdf: notaFiscal.caminho
  });
};

/* =====================================================
   NOTA FISCAL
===================================================== */

const gerarNotaFiscalPagamento = async (
  pagamento,
  cliente,
  metodoPagamento
) => {
  const pedidos = await Pedido.find({
    _id: { $in: pagamento.pedidos }
  }).populate('produtoId');

  const itens = pedidos.map(p => ({
    produtoNome: p.produtoId?.name || 'Produto',
    quantidade: p.quantidade,
    precoUnitario: p.preco / p.quantidade,
    precoTotal: p.preco
  }));

  const {
    numeroNota,
    caminho
  } = await gerarNotaFiscal({
    cliente,
    itens,
    valorTotal: pagamento.valorTotal,
    formaPagamento: metodoPagamento.toLowerCase(),
    parcelas: pagamento.parcelas || 1,
    dataEmissao: new Date()
  });

  const notaFiscal = {
    numero: numeroNota,
    caminho,
    url: `${BACKEND_URL}${getUrlNotaFiscal(caminho)}`,
    geradaEm: new Date()
  };

  await pagamentoRepository.updatePagamento(pagamento._id, {
    notaFiscal
  });

  return notaFiscal;
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
  pagamentoRepository.updatePagamento(id, {
    status: 'Cancelado'
  });

/* =====================================================
   EXPORTAÇÃO
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
