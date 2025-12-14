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
        const trajetos = await trajeto.find().populate('vendedorId', 'name login');
        return trajetos;
    } catch (error) {
        throw new Error(error);
    }
}

const getTrajetosByVendedor = async (vendedorId) => {
    try {
        const trajetos = await trajeto.find({ vendedorId }).populate('vendedorId', 'name login');
        return trajetos;
    } catch (error) {
        throw new Error(error);
    }
}

const saveTrajeto = async (trajetoData) => {
    try {
        const newTrajeto = new trajeto(trajetoData);
        await newTrajeto.save();
        return newTrajeto;
    } catch (error) {
        throw new Error(error);
    }
}

const updateTrajeto = async (id, trajetoData) => {
    try {
        const updatedTrajeto = await trajeto.findByIdAndUpdate(id, trajetoData, {new: true});
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
    getTrajetosByVendedor,
    saveTrajeto,
    updateTrajeto,
    deleteTrajeto
};

export default trajetoRepository;
