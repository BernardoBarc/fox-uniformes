import pedido from '../models/pedido.js';

const getPedido = async (id) => {
    try {
        return await pedido.findById(id);
    } catch (error) {
        throw new Error(error);
    }
}

const getAllPedidos = async () => {
    try {
        return await pedido.find().populate('produtoId').populate('vendedorId', 'name login');
    } catch (error) {
        throw new Error(error);
    }
}

const getPedidosByVendedor = async (vendedorId) => {
    try {
        return await pedido.find({ vendedorId }).populate('produtoId').populate('vendedorId', 'name login');
    } catch (error) {
        throw new Error(error);
    }
}

const getPedidosByCliente = async (clienteId) => {
    try {
        return await pedido.find({ clienteId }).populate('produtoId').populate('vendedorId', 'name login');
    } catch (error) {
        throw new Error(error);
    }
}

const savePedido = async ({nomeCliente, clienteId, vendedorId, produtoId, quantidade, status, preco, entrega, photo, observacoes}) => {
    try {
        const newPedido = new pedido({nomeCliente, clienteId, vendedorId, produtoId, quantidade, status, preco, entrega, photo, observacoes});
        await newPedido.save();
        return newPedido;
    } catch (error) {
        throw new Error(error);
    }
}

const updatePedido = async (id, updateData) => {
    try {
        const updatedPedido = await pedido.findByIdAndUpdate(id, updateData, {new: true});
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
    getPedidosByVendedor,
    getPedidosByCliente,
    savePedido,
    updatePedido,
    deletePedido
};

export default pedidoRepository;
