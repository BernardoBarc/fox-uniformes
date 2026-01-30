import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    produtoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produto',
        required: true
    },
    tamanho: {
        type: String,
        enum: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'Único'],
        required: true
    },
    quantidade: {
        type: Number,
        required: true
    },
    precoUnitario: {
        type: Number,
        required: true
    },
    precoTotal: {
        type: Number,
        required: true
    },
    observacoes: String,
    photo: String
});

const pedidoSchema = new mongoose.Schema({
    nomeCliente: {
        type: String,
        required: true
    },
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: false
    },
    vendedorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: {
        type: [itemSchema],
        required: false
    },
    status: {
        type: String,
        enum: ['Pendente', 'Em Progresso', 'Em Trânsito', 'Concluído', 'Cancelado', 'Aguardando Pagamento'],
        default: 'Pendente'
    },
    preco: {
        type: Number,
        required: true
    },
    precoOriginal: {
        type: Number,
        required: false // Preço antes do desconto
    },
    cupomAplicado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cupom',
        required: false
    },
    descontoAplicado: {
        type: Number,
        default: 0 // Valor do desconto em reais
    },
    entrega: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: false
    },
    observacoes: {
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
