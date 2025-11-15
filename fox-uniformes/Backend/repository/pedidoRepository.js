import pedido from '../models/pedidoModel.js';

const getPedido = async (id) => {
    try {
        return await pedido.findById(id);
    } catch (error) {
        throw new Error(error);
    }
}

const getAllPedidos = async () => {
    try {
        return await pedido.find();
    } catch (error) {
        throw new Error(error);
    }
}

const savePedido = async ({nomeCliente, produtoId, quantidade, status, preco, entrega}) => {
    try {
        const newPedido = new pedido({nomeCliente, produtoId, quantidade, status, preco, entrega});
        await newPedido.save();
        return newPedido;
    } catch (error) {
        throw new Error(error);
    }
}

const updatePedido = async (id, {nomeCliente, produtoId, quantidade, status, preco, entrega}) => {
    try {
        const updatedPedido = await pedido.findByIdAndUpdate(id, {nomeCliente, produtoId, quantidade, status, preco, entrega}, {new: true});
        return updatedPedido;
    } catch (error) {
        throw new Error(error);
    }
}

const deletePedido = async (id) => {
    try {
        await pedido.findByIdAndDelete(id);
    } catch (error) {
        throw new Error(error);
    }
}

const pedidoRepository = {
    getPedido,
    getAllPedidos,
    savePedido,
    updatePedido,
    deletePedido
};

export default pedidoRepository;
