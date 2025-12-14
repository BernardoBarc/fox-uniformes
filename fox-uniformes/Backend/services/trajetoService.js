import trajetoRepository from "../repository/trajetoRepository.js";

const getTrajeto = async (id) => {
    return await trajetoRepository.getTrajeto(id);
};

const getAllTrajetos = async () => {
    return await trajetoRepository.getAllTrajetos();
};

const getTrajetosByVendedor = async (vendedorId) => {
    return await trajetoRepository.getTrajetosByVendedor(vendedorId);
};

const saveTrajeto = async (trajetoData) => {
    return await trajetoRepository.saveTrajeto(trajetoData);
};

const updateTrajeto = async (id, trajetoData) => {
    return await trajetoRepository.updateTrajeto(id, trajetoData);
};

const deleteTrajeto = async (id) => {
    return await trajetoRepository.deleteTrajeto(id);
};

const trajetoService = {
    getTrajeto,
    getAllTrajetos,
    getTrajetosByVendedor,
    saveTrajeto,
    updateTrajeto,
    deleteTrajeto
};

export default trajetoService;
