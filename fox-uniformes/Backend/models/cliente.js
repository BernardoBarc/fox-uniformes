import mongoose from 'mongoose';

const clienteSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true,
    },
    cpf: {
        type: String,
        unique: true,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: false,
    },
    telefone: {
        type: String,
        unique: true,
        required: true,
    },
    cidade: {
        type: String,
        // tornar opcional para permitir criação rápida pelo painel
        required: false,
    },
    estado: {
        type: String,
        required: false,
    },
    rua: {
        type: String,
        required: false,
    },
    numero: {
        type: String,
        required: false,
    },
    bairro: {
        type: String,
        required: false,
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
        // vendedor opcional: se não informado pelo front, backend não deve bloquear a criação
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Cliente = mongoose.model('Cliente', clienteSchema);

export default Cliente;
