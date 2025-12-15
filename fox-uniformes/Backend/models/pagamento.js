import mongoose from 'mongoose';

const pagamentoSchema = new mongoose.Schema({
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true,
    },
    pedidos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido',
    }],
    valorTotal: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['Pendente', 'Aprovado', 'Recusado', 'Cancelado', 'Reembolsado'],
        default: 'Pendente',
    },
    metodoPagamento: {
        type: String,
        enum: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto'],
    },
    parcelas: {
        type: Number,
        default: 1,
    },
    linkPagamento: {
        type: String,
    },
    externalId: {
        type: String, // ID do pagamento no gateway (Mercado Pago, Stripe, etc)
    },
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed, // Resposta completa do gateway
    },
    whatsappEnviado: {
        type: Boolean,
        default: false,
    },
    whatsappEnviadoEm: {
        type: Date,
    },
    pagamentoConfirmadoEm: {
        type: Date,
    },
}, {
    timestamps: true,
});

const Pagamento = mongoose.model('Pagamento', pagamentoSchema);

export default Pagamento;
