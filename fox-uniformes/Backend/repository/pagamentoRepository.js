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
    // Remover campos nulos que possam causar conflitos com índice único
    if (pagamentoData && (pagamentoData.externalId === null || pagamentoData.externalId === undefined)) {
        delete pagamentoData.externalId;
    }

    // Tenta salvar; se der E11000 em externalId (índice único existente com nulls), remove externalId e tenta novamente uma vez
    const pagamento = new Pagamento(pagamentoData);
    try {
        return await pagamento.save();
    } catch (err) {
        // Código de erro Mongo para duplicata
        const isDuplicateKey = err && (err.code === 11000 || (err.message && err.message.includes('E11000')));
        const mentionsExternalId = err && err.message && err.message.includes('externalId');
        if (isDuplicateKey && mentionsExternalId) {
            // Remover externalId do objeto e tentar salvar novamente
            try {
                if (pagamento.externalId !== undefined) delete pagamento.externalId;
                // também remover do pagamentoData original para evitar reincidência
                if (pagamentoData && pagamentoData.externalId !== undefined) delete pagamentoData.externalId;
                const retryPagamento = new Pagamento(pagamentoData);
                return await retryPagamento.save();
            } catch (retryErr) {
                // se falhar novamente, propaga o erro original para facilitar debug
                throw retryErr;
            }
        }
        throw err;
    }
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
    deletePagamento
};