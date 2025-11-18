import trajeto from '../models/trajeto.js';

const getTrajeto = async (id) => {
    try {
        return await trajeto.findById(id);
    } catch (error) {
        throw new Error(error);
    }
}

const getAllTrajetos = async () => {
    try {
        const trajetos = await trajeto.find();
        return trajetos;
    } catch (error) {
        throw new Error(error);
    }
}

const saveTrajeto = async ({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    try {
        const newTrajeto = new trajeto({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia});
        await newTrajeto.save();
        return newTrajeto;
    } catch (error) {
        throw new Error(error);
    }
}

const updateTrajeto = async (id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    try {
        const updatedTrajeto = await trajeto.findByIdAndUpdate(id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}, {new: true});
        return updatedTrajeto;
    } catch (error) {
        throw new Error(error);
    }
}

const deleteTrajeto = async (id) => {
    try {
        await trajeto.findByIdAndDelete(id);
    } catch (error) {
        throw new Error(error);
    }
}

const trajetoRepository = {
    getTrajeto,
    getAllTrajetos,
    saveTrajeto,
    updateTrajeto,
    deleteTrajeto
};

export default trajetoRepository;
