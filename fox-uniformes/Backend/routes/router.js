import express from "express";
import userController from "./userController.js";
import trajetoController from "./trajetoController.js";
import produtoController from "./produtoController.js";
import pedidoController from "./pedidoController.js";
import clienteController from "./clienteController.js";

const router = express.Router();

router.use(userController);
router.use(trajetoController);
router.use(produtoController);
router.use(pedidoController);
router.use(clienteController);



export default router;