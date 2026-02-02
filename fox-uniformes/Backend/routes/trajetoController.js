import trajetoService from '../services/trajetoService.js';
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// helper: normaliza strings para comparação (remove acentos, pontuação e lower case)
const normalize = (s = '') => s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase();

// Valida CEP usando ViaCEP e verifica cidade/estado
const validateCepMatches = async (cepRaw, cidadeRaw, estadoRaw) => {
  if (!cepRaw) return { ok: false, error: 'CEP é obrigatório' };
  const cep = cepRaw.toString().replace(/\D/g, '');
  if (cep.length !== 8) return { ok: false, error: 'CEP inválido (deve conter 8 dígitos)' };

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return { ok: false, error: 'Erro ao validar CEP' };
    const data = await res.json();
    if (data.erro) return { ok: false, error: 'CEP não encontrado' };

    // Compare cidade e estado se fornecidos
    if (cidadeRaw) {
      const cidadeApi = normalize(data.localidade || '');
      const cidadeUser = normalize(cidadeRaw || '');
      if (cidadeApi && cidadeUser && cidadeApi !== cidadeUser) {
        return { ok: false, error: `CEP não corresponde à cidade informada (${data.localidade})` };
      }
    }
    if (estadoRaw) {
      const ufApi = (data.uf || '').toUpperCase();
      const ufUser = (estadoRaw || '').toUpperCase();
      if (ufApi && ufUser && ufApi !== ufUser) {
        return { ok: false, error: `CEP não corresponde ao estado informado (${data.uf})` };
      }
    }

    return { ok: true, data };
  } catch (err) {
    console.error('Erro ao consultar ViaCEP:', err);
    return { ok: false, error: 'Erro ao validar CEP' };
  }
};

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

// Buscar trajetos por vendedor
router.get('/trajetos/vendedor/:vendedorId', async (req, res) => {
    try {
        const trajetos = await trajetoService.getTrajetosByVendedor(req.params.vendedorId);
        res.json(trajetos);
    } catch (error) {
        console.error('Error fetching trajetos by vendedor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Criar trajeto (requer autenticação)
router.post('/trajeto', authMiddleware, async (req, res) => {
    try {
        // valida CEP/cidade/estado
        const { cep, cidade, estado } = req.body;
        const cepValidation = await validateCepMatches(cep, cidade, estado);
        if (!cepValidation.ok) return res.status(400).json({ error: cepValidation.error });

        // garante que vendedorId seja o usuário autenticado (ou explicitamente enviado por admin)
        const payload = { ...req.body };
        if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
        if (req.user.role === 'vendedor') {
            payload.vendedorId = req.user._id;
        } else if (req.user.role === 'admin' && payload.vendedorId) {
            // admin pode criar em nome de outro vendedor
            // manter payload.vendedorId
        } else if (req.user.role === 'admin') {
            // admin sem vendedorId: deixa em branco ou retorna erro
            // optamos por obrigar vendedorId quando admin cria
            return res.status(400).json({ message: 'vendedorId é obrigatório ao criar trajeto como admin' });
        }

        const newTrajeto = await trajetoService.saveTrajeto(payload);
        res.status(201).json(newTrajeto);
    } catch (error) {
        console.error('Error creating trajeto:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Atualizar trajeto (requer autenticação e autorização)
router.put('/trajeto/:id', authMiddleware, async (req, res) => {
    try {
        const existing = await trajetoService.getTrajeto(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Trajeto not found' });
        if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

        // normaliza owner id (pode ser string ou objeto com _id)
        const existingOwnerId = existing.vendedorId && existing.vendedorId._id ? String(existing.vendedorId._id) : String(existing.vendedorId);
        if (req.user.role === 'vendedor' && existingOwnerId !== String(req.user._id)) {
            console.debug('Autorização negada (PUT) - req.user:', { id: String(req.user._id), role: req.user.role }, 'existing.vendedorId:', existing.vendedorId, 'existingOwnerId:', existingOwnerId);
            // também tentar comparar com campos alternativos
            const altUserId = req.user.id ? String(req.user.id) : null;
            if (altUserId && altUserId === existingOwnerId) {
              // permitir
            } else {
              return res.status(403).json({ message: 'Acesso negado' });
            }
        }

        // validar cep/cidade/estado se fornecidos
        const { cep, cidade, estado } = req.body;
        if (cep || cidade || estado) {
          const cepValidation = await validateCepMatches(cep || existing.cep, cidade || existing.cidade, estado || existing.estado);
          if (!cepValidation.ok) return res.status(400).json({ error: cepValidation.error });
        }

        // vendedores não podem transferir propriedade; remover vendedorId do payload se presente
        const payload = { ...req.body };
        if (req.user.role === 'vendedor') delete payload.vendedorId;

        const updatedTrajeto = await trajetoService.updateTrajeto(req.params.id, payload);
        res.json(updatedTrajeto);
    } catch (error) {
        console.error('Error updating trajeto:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Deletar trajeto (requer autenticação e autorização)
router.delete('/trajeto/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await trajetoService.getTrajeto(id);
        if (!existing) return res.status(404).json({ message: 'Trajeto not found' });
        if (!req.user) return res.status(401).json({ message: 'Não autenticado' });

        // normaliza owner id (pode ser string ou objeto com _id)
        const existingOwnerIdDel = existing.vendedorId && existing.vendedorId._id ? String(existing.vendedorId._id) : String(existing.vendedorId);
        console.debug('DELETE request by user:', { id: String(req.user._id), role: req.user.role }, 'existing.vendedorId:', existing.vendedorId, 'existingOwnerId:', existingOwnerIdDel);
        if (req.user.role === 'vendedor' && existingOwnerIdDel !== String(req.user._id)) {
            const altUserId = req.user.id ? String(req.user.id) : null;
            if (!(altUserId && altUserId === existingOwnerIdDel)) {
              return res.status(403).json({ message: 'Acesso negado' });
            }
        }

        await trajetoService.deleteTrajeto(id);
        res.status(204).send();
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

export default router;
