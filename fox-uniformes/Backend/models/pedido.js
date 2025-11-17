import mongoose from 'mongoose';

const pedidoSchema = new mongoose.Schema({
    nomeCliente: {
        type: String,
        required: true
    },
    produtoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produto',
        required: true
    },
    quantidade: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pendente', 'Em Progresso', 'Concluído', 'Cancelado'],
        default: 'Pendente'
    },
    preco: {
        type: Number,
        required: true
    },
    entrega: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Pedido = mongoose.model('Pedido', pedidoSchema);

export default Pedido;
