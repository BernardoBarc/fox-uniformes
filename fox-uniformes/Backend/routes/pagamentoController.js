import express from 'express';
import pagamentoService from '../services/pagamentoService.js';

const router = express.Router();

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
        if (pagamento) {
            res.json(pagamento);
        } else {
            res.status(404).json({ error: 'Pagamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar pagamentos por cliente
router.get('/pagamentos/cliente/:clienteId', async (req, res) => {
    try {
        const pagamentos = await pagamentoService.getPagamentosByCliente(req.params.clienteId);
        res.json(pagamentos);
    } catch (error) {
        console.error('Erro ao buscar pagamentos do cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar novo pagamento e gerar link
router.post('/pagamento/criar', async (req, res) => {
    try {
        const { clienteId, pedidos, valorTotal, telefone, nomeCliente, metodoPagamento, cardToken, installments, payer } = req.body;

        if (!clienteId || !valorTotal) {
            return res.status(400).json({ error: 'ClienteId e valorTotal são obrigatórios' });
        }

        // Loga o payload recebido
        console.log('=== [DEBUG] Payload recebido em /pagamento/criar ===');
        console.log(JSON.stringify(req.body, null, 2));

        let resultado;
        try {
            resultado = await pagamentoService.criarPagamento({
                clienteId,
                pedidos,
                valorTotal,
                telefone,
                nomeCliente,
                metodoPagamento,
                cardToken,
                installments,
                payer
            });
        } catch (serviceError) {
            // Retorna erro detalhado do service para o frontend
            return res.status(500).json({ error: serviceError.message || 'Erro ao processar pagamento' });
        }

        // Loga o resultado retornado pelo service
        console.log('=== [DEBUG] Resultado do pagamentoService.criarPagamento ===');
        console.log(JSON.stringify(resultado, null, 2));

        // Se for PIX e não vier pixData, retorna erro detalhado
        if (metodoPagamento === 'PIX' && !resultado.pixData) {
            return res.status(500).json({ error: 'Falha ao gerar cobrança PIX. Nenhum dado de PIX retornado.' });
        }
        // Se for cartão e não vier cardData, retorna erro detalhado
        if (metodoPagamento === 'CREDIT_CARD' && !resultado.cardData) {
            return res.status(500).json({ error: 'Falha ao processar pagamento com cartão. Nenhum dado de cartão retornado.' });
        }

        res.status(201).json(resultado);
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
});

// Confirmar pagamento manualmente (admin)
router.post('/pagamento/:id/confirmar', async (req, res) => {
    try {
        const { metodoPagamento, parcelas } = req.body;
        const resultado = await pagamentoService.confirmarPagamentoManual(
            req.params.id, 
            metodoPagamento || 'PIX',
            parcelas || 1
        );
        
        if (resultado) {
            res.json({ 
                message: 'Pagamento confirmado com sucesso', 
                pagamento: resultado.pagamento,
                notaFiscal: resultado.notaFiscal
            });
        } else {
            res.status(404).json({ error: 'Pagamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
        res.status(500).json({ error: error.message || 'Erro interno do servidor' });
    }
});

// Cancelar pagamento
router.post('/pagamento/:id/cancelar', async (req, res) => {
    try {
        const pagamento = await pagamentoService.cancelarPagamento(req.params.id);
        
        if (pagamento) {
            res.json({ message: 'Pagamento cancelado', pagamento });
        } else {
            res.status(404).json({ error: 'Pagamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao cancelar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Webhook do Mercado Pago
router.post('/webhook/mercadopago', express.json(), async (req, res) => {
    try {
        const { type, data } = req.body;
        if (type === 'payment' && data && data.id) {
            // Buscar detalhes do pagamento no Mercado Pago
            const mpPayment = await import('mercadopago').then(mp => mp.default.payment.findById(data.id));
            const payment = mpPayment.body;
            if (payment.status === 'approved' && payment.payment_method_id === 'pix') {
                // Atualizar status do pagamento no banco
                await pagamentoService.confirmarPagamentoPorExternalId(payment.external_reference, payment.id);
            }
        }
        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro no webhook Mercado Pago:', error);
        res.status(500).send('Erro interno');
    }
});

// Reenviar WhatsApp
router.post('/pagamento/:id/reenviar-whatsapp', async (req, res) => {
    try {
        const pagamento = await pagamentoService.getPagamentoById(req.params.id);
        
        if (!pagamento) {
            return res.status(404).json({ error: 'Pagamento não encontrado' });
        }

        // TODO: Implementar reenvio de WhatsApp
        res.json({ message: 'WhatsApp reenviado (em implementação)', pagamento });
    } catch (error) {
        console.error('Erro ao reenviar WhatsApp:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
