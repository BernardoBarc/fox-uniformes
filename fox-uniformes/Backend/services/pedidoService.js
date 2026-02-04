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

const getPedidosByCliente = async (clienteId) => {
    return await pedidoRepository.getPedidosByCliente(clienteId);
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

const calcularEAtualizarEntrega = async (pedidoId) => {
    return await pedidoRepository.calcularEAtualizarEntrega(pedidoId);
};

const pedidoService = {
    getPedido,
    getAllPedidos,
    getPedidosByVendedor,
    getPedidosByCliente,
    savePedido,
    updatePedido,
    deletePedido,
    calcularEAtualizarEntrega
};

export default pedidoService;
