import pedidoRepository from '../repository/pedidoRepository.js';

const getPedido = async (id) => {
    return await pedidoRepository.getPedido(id);
};

const getAllPedidos = async () => {
    return await pedidoRepository.getAllPedidos();
};

const getPedidosByVendedor = async (vendedorId) => {
    return await pedidoRepository.getPedidosByVendedor(vendedorId);
};

const savePedido = async (pedidoData) => {
    return await pedidoRepository.savePedido(pedidoData);
};

const updatePedido = async (id, pedidoData) => {
    return await pedidoRepository.updatePedido(id, pedidoData);
};

const deletePedido = async (id) => {
    return await pedidoRepository.deletePedido(id);
};

const pedidoService = {
    getPedido,
    getAllPedidos,
    getPedidosByVendedor,
    savePedido,
    updatePedido,
    deletePedido
};

export default pedidoService;
