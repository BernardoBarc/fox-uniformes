import pedidoRepository from '../repositories/pedidoRepository.js';

const getPedido = async (id) => {
    return await pedidoRepository.getPedido(id);
};

const getAllPedidos = async () => {
    return await pedidoRepository.getAllPedidos();
};

const savePedido = async ({cliente, produtos, total}) => {
    return await pedidoRepository.savePedido({cliente, produtos, total});
};

const updatePedido = async (id, {cliente, produtos, total}) => {
    return await pedidoRepository.updatePedido(id, {cliente, produtos, total});
};

const deletePedido = async (id) => {
    return await pedidoRepository.deletePedido(id);
};

const pedidoService = {
    getPedido,
    getAllPedidos,
    savePedido,
    updatePedido,
    deletePedido
};

export default pedidoService;
