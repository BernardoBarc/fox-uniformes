import produtoService from '../services/produtoService.js';
import express from 'express';

const router = express.Router();

router.get('/produtos', async (req, res) => {
    try {
        const produtos = await produtoService.getAllProdutos();
        res.json(produtos);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.get('/produtos/:id', async (req, res) => {
    try {
        const produto = await produtoService.getProduto(req.params.id);
        if (produto) {
            res.json(produto);
        } else {
            res.status(404).json({ error: 'Produto não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.post('/produtos', async (req, res) => {
    try {
        const newProduto = await produtoService.saveProduto(req.body);
        res.status(201).json(newProduto);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.put('/produtos/:id', async (req, res) => {
    try {
        const updatedProduto = await produtoService.updateProduto(req.params.id, req.body);
        if (updatedProduto) {
            res.json(updatedProduto);
        } else {
            res.status(404).json({ error: 'Produto não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.delete('/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await produtoService.deleteProduto(id);
        res.status(204).send();
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

export default router;