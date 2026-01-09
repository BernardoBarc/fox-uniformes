import Pagamento from '../models/pagamento.js';

const getAllPagamentos = async () => {
    return Pagamento.find()
        .populate('clienteId')
        .populate('pedidos')
        .sort({ createdAt: -1 });
};

const getPagamentoById = async (id) => {
    return Pagamento.findById(id)
        .populate('clienteId')
        .populate('pedidos');
};

const getPagamentoByExternalId = async (externalId) => {
    return Pagamento.findOne({ externalId })
        .populate('clienteId')
        .populate('pedidos');
};

const getPagamentosByCliente = async (clienteId) => {
    return Pagamento.find({ clienteId })
        .populate('pedidos')
        .sort({ createdAt: -1 });
};

const getPagamentosPendentes = async () => {
    return Pagamento.find({ status: 'Pendente' })
        .populate('clienteId')
        .populate('pedidos')
        .sort({ createdAt: -1 });
};

const savePagamento = async (pagamentoData) => {
    const pagamento = new Pagamento(pagamentoData);
    return pagamento.save();
};

const updatePagamento = async (id, fieldsToUpdate) => {
    return Pagamento.findByIdAndUpdate(
        id,
        { $set: fieldsToUpdate },
        { new: true }
    )
    .populate('clienteId')
    .populate('pedidos');
};

const updatePagamentoByExternalId = async (externalId, fieldsToUpdate) => {
    return Pagamento.findOneAndUpdate(
        { externalId },
        { $set: fieldsToUpdate },
        { new: true }
    )
    .populate('clienteId')
    .populate('pedidos');
};

const confirmarPagamento = async ({ id, externalPaymentId, metodoPagamento }) => {
    return Pagamento.findByIdAndUpdate(
        id,
        {
            status: 'Pago',
            metodoPagamento,
            externalPaymentId,
            pagoEm: new Date()
        },
        { new: true }
    )
    .populate('clienteId')
    .populate('pedidos');
};

const deletePagamento = async (id) => {
    return Pagamento.findByIdAndDelete(id);
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
    confirmarPagamento,
    deletePagamento
};