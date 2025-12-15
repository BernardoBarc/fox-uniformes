import Pagamento from '../models/pagamento.js';

const getAllPagamentos = async () => {
    return await Pagamento.find()
        .populate('clienteId')
        .populate('pedidos')
        .sort({ createdAt: -1 });
};

const getPagamentoById = async (id) => {
    return await Pagamento.findById(id)
        .populate('clienteId')
        .populate('pedidos');
};

const getPagamentoByExternalId = async (externalId) => {
    return await Pagamento.findOne({ externalId })
        .populate('clienteId')
        .populate('pedidos');
};

const getPagamentosByCliente = async (clienteId) => {
    return await Pagamento.find({ clienteId })
        .populate('pedidos')
        .sort({ createdAt: -1 });
};

const getPagamentosPendentes = async () => {
    return await Pagamento.find({ status: 'Pendente' })
        .populate('clienteId')
        .populate('pedidos')
        .sort({ createdAt: -1 });
};

const savePagamento = async (pagamentoData) => {
    const pagamento = new Pagamento(pagamentoData);
    return await pagamento.save();
};

const updatePagamento = async (id, pagamentoData) => {
    return await Pagamento.findByIdAndUpdate(id, pagamentoData, { new: true })
        .populate('clienteId')
        .populate('pedidos');
};

const updatePagamentoByExternalId = async (externalId, pagamentoData) => {
    return await Pagamento.findOneAndUpdate({ externalId }, pagamentoData, { new: true })
        .populate('clienteId')
        .populate('pedidos');
};

const deletePagamento = async (id) => {
    return await Pagamento.findByIdAndDelete(id);
};

export default {
    getAllPagamentos,
    getPagamentoById,
    getPagamentoByExternalId,
    getPagamentosByCliente,
    getPagamentosPendentes,
    savePagamento,
    updatePagamento,
    updatePagamentoByExternalId,
    deletePagamento
};
