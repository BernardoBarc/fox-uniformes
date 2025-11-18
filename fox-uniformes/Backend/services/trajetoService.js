import trajetoRepository from "../repository/trajetoRepository.js";

const getTrajeto = async (id) => {
    return await trajetoRepository.getTrajeto(id);
};

const getAllTrajetos = async () => {
    return await trajetoRepository.getAllTrajetos();
};

const saveTrajeto = async ({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    return await trajetoRepository.saveTrajeto({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia});
};

const updateTrajeto = async (id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    return await trajetoRepository.updateTrajeto(id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia});
};

const deleteTrajeto = async (id) => {
    return await trajetoRepository.deleteTrajeto(id);
};

const trajetoService = {
    getTrajeto,
    getAllTrajetos,
    saveTrajeto,
    updateTrajeto,
    deleteTrajeto
};

export default trajetoService;
