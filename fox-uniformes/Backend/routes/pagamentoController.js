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
        const { clienteId, pedidos, valorTotal, telefone, nomeCliente } = req.body;

        if (!clienteId || !valorTotal) {
            return res.status(400).json({ error: 'ClienteId e valorTotal são obrigatórios' });
        }

        const resultado = await pagamentoService.criarPagamento({
            clienteId,
            pedidos,
            valorTotal,
            telefone,
            nomeCliente,
        });

        res.status(201).json(resultado);
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Confirmar pagamento manualmente (admin)
router.post('/pagamento/:id/confirmar', async (req, res) => {
    try {
        const { metodoPagamento } = req.body;
        const pagamento = await pagamentoService.confirmarPagamentoManual(
            req.params.id, 
            metodoPagamento || 'PIX'
        );
        
        if (pagamento) {
            res.json({ message: 'Pagamento confirmado com sucesso', pagamento });
        } else {
            res.status(404).json({ error: 'Pagamento não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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
router.post('/webhook/mercadopago', async (req, res) => {
    try {
        const resultado = await pagamentoService.processarWebhookPagamento(req.body);
        res.json(resultado);
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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
