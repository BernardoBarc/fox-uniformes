import mongoose from 'mongoose';

const trajetoSchema = new mongoose.Schema({
    nomeCliente: {
        type: String,
        required: true
    },
    vendedorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cidade: {
        type: String,
        required: true
    },
    estado: {
        type: String,
        required: true
    },
    rua: {
        type: String,
        required: true
    },
    cep: {
        type: String,
        required: true
    },
    complemento: {
        type: String
    },
    bairro: {
        type: String,
        required: true
    },
    pontoReferencia: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pendente', 'Em Andamento', 'Concluído'],
        default: 'Pendente'
    },
    dataVisita: {
        type: Date,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Trajeto = mongoose.model('Trajeto', trajetoSchema);

export default Trajeto;
