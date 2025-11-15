import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
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
        type: String,
        required: true,
        enum: ['Polo', 'Camiseta', 'Calça', 'Moletom', 'Jaqueta', 'Boné']
    },
    tamanho: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Produto = mongoose.model('Produto', produtoSchema);

export default Produto;
