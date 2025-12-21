import Categoria from '../models/categoria.js';

const getAllCategorias = async () => {
    try {
        return await Categoria.find().sort({ name: 1 });
    } catch (error) {
        throw error;
    }
};

const getCategoriasAtivas = async () => {
    try {
        return await Categoria.find({ ativo: true }).sort({ name: 1 });
    } catch (error) {
        throw error;
    }
};

const getCategoriaById = async (id) => {
    try {
        return await Categoria.findById(id);
    } catch (error) {
        throw error;
    }
};

const saveCategoria = async ({ name, descricao }) => {
    try {
        const nova = new Categoria({ name, descricao });
        await nova.save();
        return nova;
    } catch (error) {
        throw error;
    }
};

const updateCategoria = async (id, { name, descricao, ativo }) => {
    try {
        return await Categoria.findByIdAndUpdate(id, { name, descricao, ativo }, { new: true });
    } catch (error) {
        throw error;
    }
};

const deleteCategoria = async (id) => {
    try {
        return await Categoria.findByIdAndDelete(id);
    } catch (error) {
        throw error;
    }
};

const categoriaRepository = {
    getAllCategorias,
    getCategoriasAtivas,
    getCategoriaById,
    saveCategoria,
    updateCategoria,
    deleteCategoria
};

export default categoriaRepository;
