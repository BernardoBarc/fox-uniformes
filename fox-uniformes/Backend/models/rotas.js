import mongoose from 'mongoose';

const rotaSchema = new mongoose.Schema({
    nomeCliente: {
        type: String,
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Rota = mongoose.model('Rota', rotaSchema);

export default Rota;
