import rotasRepository from "../repository/rotasRepository.js";

const getRota = async (id) => {
    return await rotasRepository.getRota(id);
};

const getAllRotas = async () => {
    return await rotasRepository.getAllRotas();
};

const saveRota = async ({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    return await rotasRepository.saveRota({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia});
};

const updateRota = async (id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    return await rotasRepository.updateRota(id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia});
};

const deleteRota = async (id) => {
    return await rotasRepository.deleteRota(id);
};

const rotasService = {
    getRota,
    getAllRotas,
    saveRota,
    updateRota,
    deleteRota
};

export default rotasService;
