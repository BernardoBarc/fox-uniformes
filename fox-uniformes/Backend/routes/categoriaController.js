import express from 'express';
import categoriaService from '../services/categoriaService.js';

const router = express.Router();

// Buscar todas as categorias
router.get('/categorias', async (req, res) => {
    try {
        const categorias = await categoriaService.getAllCategorias();
        res.json(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar apenas categorias ativas (para uso em selects)
router.get('/categorias/ativas', async (req, res) => {
    try {
        const categorias = await categoriaService.getCategoriasAtivas();
        res.json(categorias);
    } catch (error) {
        console.error('Erro ao buscar categorias ativas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar categoria por ID
router.get('/categorias/:id', async (req, res) => {
    try {
        const categoria = await categoriaService.getCategoriaById(req.params.id);
        if (categoria) {
            res.json(categoria);
        } else {
            res.status(404).json({ error: 'Categoria não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao buscar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Criar nova categoria
router.post('/categorias', async (req, res) => {
    try {
        const { name, descricao } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
        }
        const novaCategoria = await categoriaService.saveCategoria({ name: name.trim(), descricao });
        res.status(201).json(novaCategoria);
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Atualizar categoria
router.put('/categorias/:id', async (req, res) => {
    try {
        const { name, descricao, ativo } = req.body;
        const updated = await categoriaService.updateCategoria(req.params.id, { name, descricao, ativo });
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({ error: 'Categoria não encontrada' });
        }
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Já existe uma categoria com este nome' });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar categoria
router.delete('/categorias/:id', async (req, res) => {
    try {
        await categoriaService.deleteCategoria(req.params.id);
        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;
