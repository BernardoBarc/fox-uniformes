import produtoRepository from "../repository/produtoRepository.js";

const getProduto = async (id) => {
    return await produtoRepository.getProduto(id);
};

const getAllProdutos = async () => {
    return await produtoRepository.getAllProdutos();
};

const saveProduto = async ({name, descricao, preco, categoria, tamanho}) => {
    return await produtoRepository.saveProduto({name, descricao, preco, categoria, tamanho});
};

const updateProduto = async (id, {name, descricao, preco, categoria, tamanho}) => {
    return await produtoRepository.updateProduto(id, {name, descricao, preco, categoria, tamanho});
};

const deleteProduto = async (id) => {
    return await produtoRepository.deleteProduto(id);
};

const produtoService = {
    getProduto,
    getAllProdutos,
    saveProduto,
    updateProduto,
    deleteProduto
};

export default produtoService;
