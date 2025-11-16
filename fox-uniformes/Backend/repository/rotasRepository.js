import rotas from '../models/rotas.js';

const getRota = async (id) => {
    try {
        return await rotas.findById(id);
    } catch (error) {
        throw new Error(error);
    }
}

const getAllRotas = async () => {
    try {
        const rotas = await rotas.find();
        return rotas;
    } catch (error) {
        throw new Error(error);
    }
}

const saveRota = async ({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    try {
        const newRota = new rotas({nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia});
        await newRota.save();
        return newRota;
    } catch (error) {
        throw new Error(error);
    }
}

const updateRota = async (id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}) => {
    try {
        const updatedRota = await rotas.findByIdAndUpdate(id, {nomeCliente, cidade, estado, rua, cep, complemento, bairro, pontoReferencia}, {new: true});
        return updatedRota;
    } catch (error) {
        throw new Error(error);
    }
}

const deleteRota = async (id) => {
    try {
        await rotas.findByIdAndDelete(id);
    } catch (error) {
        throw new Error(error);
    }
}

const rotasRepository = {
    getRota,
    getAllRotas,
    saveRota,
    updateRota,
    deleteRota
};

export default rotasRepository;
