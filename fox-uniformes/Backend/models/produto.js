import mongoose from 'mongoose';

const produtoSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    descricao: {
        type: String,
        required: true,
    },
    preco: {
        type: Number,
        required: true,
    },
    categoria: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categoria',
        required: true,
    },
    imagem: {
        type: String,
        required: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Produto = mongoose.model('Produto', produtoSchema);

export default Produto;
