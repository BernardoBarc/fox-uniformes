import pedidoService from "../services/pedidoService.js";
import express from "express";
import upload from "../middleware/multer.js";
import {uploadToCloudinary} from "../middleware/cloudinary.js";

const router = express.Router();

router.get("/pedidos", async (req, res) => {
    try {
        const pedidos = await pedidoService.getAllPedidos();
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
        let imagemUrl = null;

        if (req.file) {
            imagemUrl = await uploadToCloudinary(req.file.path);
        }

        const dadosPedido = {
            ...req.body,
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
        let imagemUrl = undefined;

        if (req.file) {
            imagemUrl = await uploadToCloudinary(req.file.path);
        }

        const dadosPedido = {
            ...req.body,
            photo: imagemUrl
        }

        const updatedPedido = await pedidoService.updatePedido(req.params.id, dadosPedido);
        if (!updatedPedido) {
            return res.status(404).json({ error: "Pedido não encontrado" });
        }
        res.json(updatedPedido);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/pedidos/:id", async (req, res) => {
    try {
        await pedidoService.deletePedido(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;