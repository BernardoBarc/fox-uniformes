import pedidoRepository from '../repository/pedidoRepository.js';

const getPedido = async (id) => {
    return await pedidoRepository.getPedido(id);
};

const getAllPedidos = async () => {
    return await pedidoRepository.getAllPedidos();
};

const savePedido = async ({nomeCliente, produtoId, quantidade, status, preco, entrega, photo}) => {
    return await pedidoRepository.savePedido({nomeCliente, produtoId, quantidade, status, preco, entrega, photo});
};

const updatePedido = async (id, {nomeCliente, produtoId, quantidade, status, preco, entrega, photo}) => {
    return await pedidoRepository.updatePedido(id, {nomeCliente, produtoId, quantidade, status, preco, entrega, photo});
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
