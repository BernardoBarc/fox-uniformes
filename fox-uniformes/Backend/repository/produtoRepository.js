import produto from '../models/produto.js';

const getProduto = async (id) => {
    try {
        return await produto.findById(id);
    } catch (error) {
        throw error;
    }
};

const getAllProdutos = async () => {
    try {
        const produtos = await produto.find();
        return produtos;
    } catch (error) {
        throw error;
    }
};

const saveProduto = async ({name, descricao, preco, categoria, tamanho}) => {
    try {
        const newProduto = new produto({ name, descricao, preco, categoria, tamanho });
        await newProduto.save();
        return newProduto;
    } catch (error) {
        throw error;
    }
};

const updateProduto = async (id, {name, descricao, preco, categoria, tamanho}) => {
    try {
        const updatedProduto = await produto.findByIdAndUpdate(id, { name, descricao, preco, categoria, tamanho }, { new: true });
        return updatedProduto;
    } catch (error) {
        throw error;
    }
};

const deleteProduto = async (id) => {
    try {
        return await produto.findByIdAndDelete(id);
    } catch (error) {
        throw error;
    }
};

const produtoRepository = {
    getProduto,
    getAllProdutos,
    saveProduto,
    updateProduto,
    deleteProduto
};

export default produtoRepository;
