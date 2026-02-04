import pedidoService from "../services/pedidoService.js";
import express from "express";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get("/pedidos", async (req, res) => {
    try {
        const pedidos = await pedidoService.getAllPedidos();
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar pedidos por vendedor
router.get("/pedidos/vendedor/:vendedorId", async (req, res) => {
    try {
        const pedidos = await pedidoService.getPedidosByVendedor(req.params.vendedorId);
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar pedidos por cliente (para acompanhamento)
router.get("/pedidos/cliente/:clienteId", async (req, res) => {
    try {
        const pedidos = await pedidoService.getPedidosByCliente(req.params.clienteId);
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/pedidos/:id", async (req, res) => {
    try {
        const pedido = await pedidoService.getPedido(req.params.id);
        if (!pedido) {
            return res.status(404).json({ error: "Pedido não encontrado" });
        }
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/pedidos", upload.single("photo"), async (req, res) => {
    try {
        let imagemUrl = undefined;

        if (req.file) {
            // Salva o caminho local da imagem
            imagemUrl = `/uploads/${req.file.filename}`;
        }

        // Se items vier via form-data como string JSON, tentar parsear
        let items = undefined;
        if (req.body.items) {
            try {
                items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
            } catch (err) {
                console.warn('Não foi possível parsear items:', err);
            }
        }

        const dadosPedido = {
            ...req.body,
            items,
            photo: imagemUrl
        }

        const newPedido = await pedidoService.savePedido(dadosPedido);
        res.status(201).json(newPedido);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/pedidos/:id", upload.single("photo"), async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (req.file) {
            // Salva o caminho local da imagem
            updateData.photo = `/uploads/${req.file.filename}`;
        }

        const updatedPedido = await pedidoService.updatePedido(req.params.id, updateData);
        if (!updatedPedido) {
            return res.status(404).json({ error: "Pedido não encontrado" });
        }

        // Se status foi atualizado para 'Em Progresso', calcular e salvar entrega
        if (updateData.status === 'Em Progresso') {
            try {
                const p = await pedidoService.calcularEAtualizarEntrega(req.params.id);
                // retornar pedido atualizado com entrega
                return res.json(p);
            } catch (err) {
                console.error('Erro ao calcular entrega:', err);
                // mesmo se falhar no cálculo, retornar o pedido atualizado sem bloquear
                return res.json(updatedPedido);
            }
        }

        res.json(updatedPedido);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/pedidos/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await pedidoService.deletePedido(id);
        res.status(204).send();
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

export default router;