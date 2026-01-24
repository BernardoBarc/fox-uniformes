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
  console.log('[DEBUG] iniciar criarPagamento', { clienteId, pedidos, valorTotal, nomeCliente });
  try {
    const cliente = await Cliente.findById(clienteId);
    console.log('[DEBUG] cliente encontrado em criarPagamento', { clienteId, email: cliente?.email, nome: cliente?.nome });
    if (!cliente) throw new Error('Cliente não encontrado');

    const pagamento = await pagamentoRepository.savePagamento({
      clienteId,
      pedidos,
      valorTotal,
      status: 'Pendente',
      webhookProcessado: false
    });
    console.log('[DEBUG] pagamento salvo', { pagamentoId: pagamento._id });

    const pedidosDb = await Pedido.find({
      _id: { $in: pedidos }
    }).populate('produtoId');
    console.log('[DEBUG] pedidos carregados para preference', { count: pedidosDb.length });

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

    console.log('[DEBUG] preference criada', { preferenceId: preference.body?.id });

    await pagamentoRepository.updatePagamento(pagamento._id, {
      preferenceId: preference.body?.id
    });

    console.log('[DEBUG] pagamento atualizado com preferenceId', { pagamentoId: pagamento._id, preferenceId: preference.body?.id });

    // Envia link de pagamento por e-mail
    console.log('[DEBUG] chamando emailService.enviarLinkPagamento', { to: cliente.email });
    await emailService.enviarLinkPagamento({
      para: cliente.email,
      nome: cliente.nome,
      valorTotal,
      linkPagamento: `${FRONTEND_URL}/pagamento/${pagamento._id}`
    });
    console.log('[DEBUG] emailService.enviarLinkPagamento concluído');

    return pagamento;
  } catch (error) {
    console.error('Erro em criarPagamento:', error);
    throw error;
  }
};

/* =====================================================
   PIX (INALTERADO)
===================================================== */

const gerarPixParaPagamento = async (pagamentoId) => {
  console.log('[DEBUG] iniciar gerarPixParaPagamento', { pagamentoId });
  const pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
  console.log('[DEBUG] pagamento obtido para PIX', { pagamentoId, pagamento });
  if (!pagamento) {
    console.error('Pagamento não encontrado em gerarPixParaPagamento', { pagamentoId });
    return { error: 'Pagamento não encontrado' };
  }

  // Se já temos dados PIX gravados, retorna imediatamente (fallback)
  if (pagamento.pix && (pagamento.pix.copiaECola || pagamento.pix.qrCodeBase64)) {
    console.log('[DEBUG] usando dados PIX já presentes no pagamento', { pagamentoId });
    return {
      copiaECola: pagamento.pix.copiaECola,
      qrCodeBase64: pagamento.pix.qrCodeBase64
    };
  }

  const cliente = await Cliente.findById(pagamento.clienteId);
  console.log('[DEBUG] cliente obtido para PIX', { clienteId: cliente?._id, email: cliente?.email });
  if (!cliente) {
    console.error('Cliente não encontrado em gerarPixParaPagamento', { pagamentoId });
    return { error: 'Cliente não encontrado' };
  }

  const [firstName, ...lastNameParts] = (cliente.nome || '').split(' ');

  let response;
  try {
    response = await paymentApi.create({
      body: {
        transaction_amount: Number(pagamento.valorTotal),
        payment_method_id: 'pix',
        description: `Pedido ${pagamentoId}`,
        payer: {
          email: cliente.email,
          first_name: firstName,
          last_name: lastNameParts.join(' ') || 'Cliente'
        },
        external_reference: pagamentoId,
        notification_url: `${BACKEND_URL}/webhook/mercadopago`
      }
    });
  } catch (err) {
    console.error('Erro ao chamar paymentApi.create (PIX):', err?.response?.data || err);
    // Tentar fallback: se já existirem dados no pagamento, retornar; senão, tentar novo retry abaixo
  }

  let payment = response?.body;

  // Função auxiliar para extrair pixData de várias possíveis localizações
  const extractPixData = (p) => {
    if (!p) return null;
    return p.point_of_interaction?.transaction_data || p.transaction_data || p.transaction_details?.point_of_interaction?.transaction_data || null;
  };

  let pixData = extractPixData(payment);

  // Se não obteve pixData, tentar um retry rápido (uma tentativa)
  if (!pixData) {
    try {
      console.log('[DEBUG] pixData ausente, tentando retry paymentApi.create (uma vez)');
      const retryResp = await paymentApi.create({
        body: {
          transaction_amount: Number(pagamento.valorTotal),
          payment_method_id: 'pix',
          description: `Pedido ${pagamentoId}`,
          payer: {
            email: cliente.email,
            first_name: firstName,
            last_name: lastNameParts.join(' ') || 'Cliente'
          },
          external_reference: pagamentoId,
          notification_url: `${BACKEND_URL}/webhook/mercadopago`
        }
      });
      payment = retryResp?.body;
      pixData = extractPixData(payment);
      console.log('[DEBUG] retry response:', { paymentPresent: !!payment, pixDataPresent: !!pixData });
    } catch (retryErr) {
      console.error('Retry falhou ao chamar paymentApi.create (PIX):', retryErr?.response?.data || retryErr);
    }
  }

  // Caso ainda não tenha pixData, verificar se o objeto payment possui campos diretos de qr
  if (!pixData && payment) {
    // Algumas respostas podem vir com qr_code direto
    if (payment.qr_code || payment.qr_code_base64) {
      pixData = {
        qr_code: payment.qr_code || payment.qr_code,
        qr_code_base64: payment.qr_code_base64 || payment.qr_code_base64
      };
    }
  }

  // Se ainda sem pixData, e se o pagamento agora contém algo nos campos gateway salvos, usar como fallback
  if (!pixData && pagamento.pix && pagamento.pix.copiaECola) {
    console.log('[DEBUG] retorno usando copiaECola já salva no pagamento como fallback');
    return {
      copiaECola: pagamento.pix.copiaECola,
      qrCodeBase64: pagamento.pix.qrCodeBase64
    };
  }

  if (!pixData) {
    console.error('Erro: pixData não disponível na resposta do MP depois de tentativas', { payment });
    return { error: 'Não foi possível gerar dados PIX (pixData ausente)' };
  }

  try {
    // Monta campos de atualização sem forçar externalId nulo
    const updateFields = {
      metodoPagamento: 'PIX',
      pix: {
        qrCode: pixData.qr_code,
        copiaECola: pixData.qr_code,
        qrCodeBase64: pixData.qr_code_base64
      }
    };
    if (payment && payment.id !== null && payment.id !== undefined) {
      updateFields.externalId = String(payment.id);
    }

    await pagamentoRepository.updatePagamento(pagamentoId, updateFields);

    console.log('[DEBUG] pagamento atualizado com dados PIX', { pagamentoId });
  } catch (err) {
    console.error('Erro ao atualizar pagamento com dados PIX:', err);
    return { error: 'Erro interno ao salvar dados PIX' };
  }

  return {
    copiaECola: pixData.qr_code,
    qrCodeBase64: pixData.qr_code_base64
  };
};

/* =====================================================
   CARTÃO DE CRÉDITO (VISA / MASTERCARD)
===================================================== */

const processarPagamentoCartao = async (pagamentoId, dadosCartao) => {
  const pagamento = await pagamentoRepository.getPagamentoById(pagamentoId);
  if (!pagamento) throw new Error('Pagamento não encontrado');

  const cliente = await Cliente.findById(pagamento.clienteId);
  if (!cliente) throw new Error('Cliente não encontrado');

  if (!validarCPF(dadosCartao.cpf)) {
    throw new Error('CPF inválido');
  }

  if (!dadosCartao.paymentMethodId) {
    throw new Error('Bandeira do cartão não identificada');
  }


  const [firstName, ...lastNameParts] = cliente.nome.split(' ');
  const lastName = lastNameParts.join(' ') || 'Cliente';

  try {
    const paymentBody = {
      transaction_amount: Number(pagamento.valorTotal),
      token: dadosCartao.token,
      installments: Number(dadosCartao.installments) || 1,
      payment_method_id: dadosCartao.paymentMethodId,
      payer: {
        email: dadosCartao.email || cliente.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: dadosCartao.cpf
        }
      },
      external_reference: pagamentoId,
      notification_url: `${BACKEND_URL}/webhook/mercadopago`,
      binary_mode: true // IMPORTANTE
    };

// 👉 Só adiciona issuer_id se existir
    if (dadosCartao.issuerId) {
      paymentBody.issuer_id = dadosCartao.issuerId;
    }

    const response = await paymentApi.create({ body: paymentBody });
    const payment = response.body;

    await pagamentoRepository.updatePagamento(pagamentoId, {
      metodoPagamento: 'CREDIT_CARD',
      externalId: payment.id,
      parcelas: dadosCartao.installments,
      status: payment.status === 'approved' ? 'Aprovado' : 'Pendente'
    });

    return {
      sucesso: true,
      status: payment.status,
      paymentId: payment.id
    };

  } catch (error) {
    console.error(
      '❌ Erro Mercado Pago Cartão:',
      error?.response?.data || error
    );

    return {
      sucesso: true,
      status: 'processing'
    };
  }
};

/* =====================================================
   WEBHOOK
===================================================== */

const confirmarPagamentoPorExternalId = async (
  pagamentoId,
  paymentId,
  metodoPagamento
) => {
  console.log('[DEBUG] iniciar confirmarPagamentoPorExternalId', { pagamentoId, paymentId, metodoPagamento });
  const pagamento =
    await pagamentoRepository.getPagamentoById(pagamentoId);

  if (!pagamento || pagamento.webhookProcessado) {
    console.log('[DEBUG] pagamento não existe ou webhook já processado', { pagamentoId });
    return;
  }

  const cliente = await Cliente.findById(pagamento.clienteId);
  console.log('[DEBUG] cliente obtido em confirmarPagamentoPorExternalId', { clienteId: cliente?._id, email: cliente?.email });

  await pagamentoRepository.updatePagamento(pagamento._id, {
    status: 'Aprovado',
    metodoPagamento,
    externalId: paymentId,
    pagamentoConfirmadoEm: new Date(),
    webhookProcessado: true
  });

  console.log('[DEBUG] pagamento marcado como Aprovado', { pagamentoId });

  await atualizarStatusPedidos(pagamento.pedidos, 'Pendente');

  const notaFiscal = await gerarNotaFiscalPagamento(
    pagamento,
    cliente,
    metodoPagamento
  );

  console.log('[DEBUG] nota fiscal gerada', { numero: notaFiscal.numero, caminho: notaFiscal.caminho });

  await emailService.enviarNotaFiscal({
    para: cliente.email,
    nome: cliente.nome,
    numeroNota: notaFiscal.numero,
    caminhoPdf: notaFiscal.caminho
  });

  console.log('[DEBUG] email de nota fiscal enviado');
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

  const { numeroNota, caminho } = await gerarNotaFiscal({
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
