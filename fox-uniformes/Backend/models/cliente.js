import mongoose from 'mongoose';

const clienteSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
    },
    cpf: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
    },
    telefone: {
        type: String,
        required: true,
    },
    cidade: {
        type: String,
        required: true,
    },
    estado: {
        type: String,
        required: true,
    },
    rua: {
        type: String,
        required: true,
    },
    numero: {
        type: String,
        required: true,
    },
    bairro: {
        type: String,
        required: true,
    },
    cep: {
        type: String,
        required: false,
    },
    complemento: {
        type: String,
        required: false,
    },
    vendedorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Cliente = mongoose.model('Cliente', clienteSchema);

export default Cliente;
