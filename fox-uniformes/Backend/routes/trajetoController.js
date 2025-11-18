import trajetoService from '../services/trajetoService.js';
import express from 'express';

const router = express.Router();

router.get('/trajeto/:id', async (req, res) => {
    try {
        const trajeto = await trajetoService.getTrajeto(req.params.id);
        if (!trajeto) {
            return res.status(404).json({ message: 'Trajeto not found' });
        }
        res.json(trajeto);
    } catch (error) {
        console.error('Error fetching trajeto:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/trajetos', async (req, res) => {
    try {
        const trajetos = await trajetoService.getAllTrajetos();
        res.json(trajetos);
    } catch (error) {
        console.error('Error fetching trajetos:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/trajeto', async (req, res) => {
    try {
        const newTrajeto = await trajetoService.saveTrajeto(req.body);
        res.status(201).json(newTrajeto);
    } catch (error) {
        console.error('Error creating trajeto:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/trajeto/:id', async (req, res) => {
    try {
        const updatedTrajeto = await trajetoService.updateTrajeto(req.params.id, req.body);
        if (!updatedTrajeto) {
            return res.status(404).json({ message: 'Trajeto not found' });
        }
        res.json(updatedTrajeto);
    } catch (error) {
        console.error('Error updating trajeto:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/trajeto/:id', async (req, res) => {
    try {
        const deleted = await trajetoService.deleteTrajeto(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Trajeto not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting trajeto:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
