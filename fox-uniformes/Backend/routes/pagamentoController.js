import express from 'express';
import pagamentoService from '../services/pagamentoService.js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const router = express.Router();

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

const paymentApi = new Payment(mpClient);

// ============================
// BUSCAS
// ============================

// Buscar pagamentos por cliente (rota mais específica primeiro)
router.get('/pagamentos/cliente/:clienteId', async (req, res) => {
  try {
    const pagamentos = await pagamentoService.getPagamentosByCliente(req.params.clienteId);
    res.json(pagamentos);
  } catch (error) {
    console.error('Erro ao buscar pagamentos do cliente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar todos os pagamentos
router.get('/pagamentos', async (req, res) => {
  try {
    const pagamentos = await pagamentoService.getAllPagamentos();
    res.json(pagamentos);
  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar pagamentos pendentes
router.get('/pagamentos/pendentes', async (req, res) => {
  try {
    const pagamentos = await pagamentoService.getPagamentosPendentes();
    res.json(pagamentos);
  } catch (error) {
    console.error('Erro ao buscar pagamentos pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar pagamento por ID
router.get('/pagamentos/:id', async (req, res) => {
  try {
    const pagamento = await pagamentoService.getPagamentoById(req.params.id);
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    res.json(pagamento);
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================
// CRIAÇÃO DE PAGAMENTO
// ============================

router.post('/pagamento/criar', async (req, res) => {
  try {
    const {
      clienteId,
      pedidos,
      valorTotal,
      nomeCliente,
      metodoPagamento,
    } = req.body;

    if (!clienteId || !valorTotal) {
      return res.status(400).json({ error: 'clienteId e valorTotal são obrigatórios' });
    }

    console.log('=== [DEBUG] Payload recebido em /pagamento/criar ===');
    console.log(JSON.stringify(req.body, null, 2));

    let resultado;
    try {
      resultado = await pagamentoService.criarPagamento({ clienteId, pedidos, valorTotal, nomeCliente })
    } catch (serviceError) {
      console.error('Erro em pagamentoService.criarPagamento:', serviceError);
      return res.status(500).json({
        error: serviceError.message || 'Erro ao processar pagamento'
      });
    }

    console.log('=== [DEBUG] Resultado pagamentoService.criarPagamento ===');
    console.log(JSON.stringify(resultado, null, 2));

    if (metodoPagamento === 'PIX' && !resultado.pixData) {
      return res.status(500).json({
        error: 'Falha ao gerar cobrança PIX'
      });
    }

    if (metodoPagamento === 'CREDIT_CARD' && !resultado.cardData) {
      return res.status(500).json({
        error: 'Falha ao processar pagamento com cartão'
      });
    }

    res.status(201).json(resultado);
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================
// AÇÕES ADMIN
// ============================

router.post('/pagamento/:id/cancelar', async (req, res) => {
  try {
    const pagamento = await pagamentoService.cancelarPagamento(req.params.id);

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json({ message: 'Pagamento cancelado', pagamento });
  } catch (error) {
    console.error('Erro ao cancelar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ============================
// NOVOS ENDPOINTS: PIX e CARTÃO
// ============================

// Gerar dados PIX para o pagamento
router.get('/pagamento/:id/pix', async (req, res) => {
  try {
    const pixData = await pagamentoService.gerarPixParaPagamento(req.params.id);
    res.json(pixData);
  } catch (error) {
    console.error('Erro ao gerar dados PIX:', error);
    res.status(500).json({ error: error.message || 'Erro ao gerar dados PIX' });
  }
});

// Processar pagamento via cartão
router.post('/pagamento/:id/cartao', async (req, res) => {
  try {
    const dadosCartao = req.body;
    const resultado = await pagamentoService.processarPagamentoCartao(req.params.id, dadosCartao);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao processar pagamento cartão:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================
// WEBHOOK MERCADO PAGO (BLINDADO)
// ============================

router.post('/webhook/mercadopago', express.json(), async (req, res) => {
  try {
    console.log('=== [WEBHOOK MERCADO PAGO] Payload recebido ===');
    console.log(JSON.stringify(req.body, null, 2));

    const { type, data } = req.body;

    // Ignora eventos que não são de pagamento
    if (type !== 'payment' || !data?.id) {
      return res.status(200).send('Evento ignorado');
    }

    const payment = await paymentApi.get({ id: data.id });

    console.log('=== [WEBHOOK] Detalhes do pagamento ===');
    console.log(JSON.stringify(payment, null, 2));

    // 🔐 Validação crítica
    if (!payment.external_reference) {
      console.error('Pagamento sem external_reference');
      return res.status(200).send('Ignorado');
    }

    // 🔁 Confirmação
    if (payment.status === 'approved') {
      await pagamentoService.confirmarPagamentoPorExternalId(
        payment.external_reference,
        payment.id,
        payment.payment_method_id
      );

      console.log('✅ Pagamento aprovado processado');
    }
  } catch (error) {
    console.error('Erro no webhook Mercado Pago:', error);
    return res.status(500).send('Erro interno');
  }
});

// ============================
// WHATSAPP
// ============================

router.post('/pagamento/:id/reenviar-whatsapp', async (req, res) => {
  try {
    const pagamento = await pagamentoService.getPagamentoById(req.params.id);

    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // TODO: implementar reenvio
    res.json({ message: 'WhatsApp reenviado (em implementação)', pagamento });
  } catch (error) {
    console.error('Erro ao reenviar WhatsApp:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;