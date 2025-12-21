import categoriaRepository from '../repository/categoriaRepository.js';

const getAllCategorias = async () => {
    return await categoriaRepository.getAllCategorias();
};

const getCategoriasAtivas = async () => {
    return await categoriaRepository.getCategoriasAtivas();
};

const getCategoriaById = async (id) => {
    return await categoriaRepository.getCategoriaById(id);
};

const saveCategoria = async ({ name, descricao }) => {
    return await categoriaRepository.saveCategoria({ name, descricao });
};

const updateCategoria = async (id, { name, descricao, ativo }) => {
    return await categoriaRepository.updateCategoria(id, { name, descricao, ativo });
};

const deleteCategoria = async (id) => {
    return await categoriaRepository.deleteCategoria(id);
};

const categoriaService = {
    getAllCategorias,
    getCategoriasAtivas,
    getCategoriaById,
    saveCategoria,
    updateCategoria,
    deleteCategoria
};

export default categoriaService;
