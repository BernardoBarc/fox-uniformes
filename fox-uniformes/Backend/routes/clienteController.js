import express from 'express';
import clienteService from '../services/clienteService.js';

const router = express.Router();

// Buscar todos os clientes
router.get('/clientes', async (req, res) => {
    try {
        const clientes = await clienteService.getAllClientes();
        res.json(clientes);
    } catch (error) {
        console.error('Erro ao buscar clientes:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar clientes por vendedor
router.get('/clientes/vendedor/:vendedorId', async (req, res) => {
    try {
        const clientes = await clienteService.getClientesByVendedor(req.params.vendedorId);
        res.json(clientes);
    } catch (error) {
        console.error('Erro ao buscar clientes do vendedor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar cliente por CPF
router.get('/clientes/cpf/:cpf', async (req, res) => {
    try {
        const cpf = req.params.cpf.replace(/\D/g, ''); // Remove formatação
        const cliente = await clienteService.getClienteByCPF(cpf);
        if (cliente) {
            res.json(cliente);
        } else {
            res.status(404).json({ error: 'Cliente não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar cliente por CPF:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar cliente por ID
router.get('/clientes/:id', async (req, res) => {
    try {
        const cliente = await clienteService.getCliente(req.params.id);
        if (cliente) {
            res.json(cliente);
        } else {
            res.status(404).json({ error: 'Cliente não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar novo cliente
router.post('/clientes', async (req, res) => {
    try {
        const newCliente = await clienteService.saveCliente(req.body);
        res.status(201).json(newCliente);
    } catch (error) {
        console.error('Erro ao criar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar cliente
router.put('/clientes/:id', async (req, res) => {
    try {
        const updatedCliente = await clienteService.updateCliente(req.params.id, req.body);
        if (updatedCliente) {
            res.json(updatedCliente);
        } else {
            res.status(404).json({ error: 'Cliente não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar cliente
router.delete('/clientes/:id', async (req, res) => {
    try {
        await clienteService.deleteCliente(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
