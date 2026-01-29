import express from 'express';
import cupomService from '../services/cupomService.js';

const router = express.Router();

// GET /cupons - Listar todos os cupons
router.get('/cupons', async (req, res) => {
    try {
        const cupons = await cupomService.getAllCupons();
        res.json(cupons);
    } catch (error) {
        console.error('Erro ao buscar cupons:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /cupons/ativos - Listar cupons ativos
router.get('/cupons/ativos', async (req, res) => {
    try {
        const cupons = await cupomService.getCuponsAtivos();
        res.json(cupons);
    } catch (error) {
        console.error('Erro ao buscar cupons ativos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /cupons/:id - Buscar cupom por ID
router.get('/cupons/:id', async (req, res) => {
    try {
        const cupom = await cupomService.getCupom(req.params.id);
        if (cupom) {
            res.json(cupom);
        } else {
            res.status(404).json({ error: 'Cupom não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar cupom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /cupons/validar - Validar cupom para uso
router.post('/cupons/validar', async (req, res) => {
    try {
        const { codigo, valorPedido, clienteId } = req.body;
        
        if (!codigo) {
            return res.status(400).json({ error: 'Código do cupom é obrigatório' });
        }

        const resultado = await cupomService.validarCupom(codigo, valorPedido || 0, clienteId || null);
        res.json(resultado);
    } catch (error) {
        console.error('Erro ao validar cupom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /cupons - Criar novo cupom
router.post('/cupons', async (req, res) => {
    try {
        const { codigo, desconto, valorMinimo, dataValidade, usoMaximo, criadoPor, notificarClientes } = req.body;

        if (!codigo || !desconto || !criadoPor) {
            return res.status(400).json({ error: 'Código, desconto e criadoPor são obrigatórios' });
        }

        if (desconto < 1 || desconto > 100) {
            return res.status(400).json({ error: 'Desconto deve ser entre 1 e 100%' });
        }

        const cupomData = {
            codigo: codigo.toUpperCase(),
            desconto,
            valorMinimo: valorMinimo || 0,
            dataValidade: dataValidade || null,
            usoMaximo: usoMaximo || null,
            criadoPor
        };

        const novoCupom = await cupomService.criarCupom(cupomData, notificarClientes !== false);
        res.status(201).json(novoCupom);
    } catch (error) {
        console.error('Erro ao criar cupom:', error);
        if (error.message === 'Já existe um cupom com este código') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /cupons/:id - Atualizar cupom
router.put('/cupons/:id', async (req, res) => {
    try {
        const cupom = await cupomService.updateCupom(req.params.id, req.body);
        if (cupom) {
            res.json(cupom);
        } else {
            res.status(404).json({ error: 'Cupom não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao atualizar cupom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /cupons/:id/ativar - Ativar cupom
router.put('/cupons/:id/ativar', async (req, res) => {
    try {
        const cupom = await cupomService.ativarCupom(req.params.id);
        if (cupom) {
            res.json({ message: 'Cupom ativado com sucesso', cupom });
        } else {
            res.status(404).json({ error: 'Cupom não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao ativar cupom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /cupons/:id/desativar - Desativar cupom
router.put('/cupons/:id/desativar', async (req, res) => {
    try {
        const cupom = await cupomService.desativarCupom(req.params.id);
        if (cupom) {
            res.json({ message: 'Cupom desativado com sucesso', cupom });
        } else {
            res.status(404).json({ error: 'Cupom não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao desativar cupom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /cupons/:id/aplicar - Aplicar cupom (incrementar uso)
router.post('/cupons/:id/aplicar', async (req, res) => {
    try {
        const { clienteId } = req.body;
        const cupom = await cupomService.aplicarCupom(req.params.id, clienteId || null);
        if (cupom) {
            res.json({ message: 'Cupom aplicado com sucesso', cupom });
        } else {
            res.status(404).json({ error: 'Cupom não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao aplicar cupom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// DELETE /cupons/:id - Deletar cupom
router.delete('/cupons/:id', async (req, res) => {
    try {
        const cupom = await cupomService.deleteCupom(req.params.id);
        if (cupom) {
            res.json({ message: 'Cupom excluído com sucesso' });
        } else {
            res.status(404).json({ error: 'Cupom não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao deletar cupom:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /cupons/:id/reenviar - Reenviar notificação do cupom para todos os clientes
router.post('/cupons/:id/reenviar', async (req, res) => {
    try {
        const cupom = await cupomService.getCupom(req.params.id);
        if (!cupom) {
            return res.status(404).json({ error: 'Cupom não encontrado' });
        }

        const resultado = await cupomService.notificarClientesSobreCupom(cupom);
        res.json({ 
            message: 'Notificações enviadas',
            ...resultado 
        });
    } catch (error) {
        console.error('Erro ao reenviar notificações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
