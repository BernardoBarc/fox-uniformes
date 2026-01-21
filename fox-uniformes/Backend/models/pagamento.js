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
        enum: ['Pendente','Aprovado', 'Recusado', 'Cancelado', 'Reembolsado'],
        default: 'Pendente',
    },
    metodoPagamento: {
        type: String,
        enum: ['PIX', 'CREDIT_CARD', 'DEBIT_CARD'],
    },
    parcelas: {
        type: Number,
        default: 1,
    },
    linkPagamento: {
        type: String,
    },
    externalId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    externalPaymentId: {
        type: String,
        index: true,
    },
    pix: {
        qrCode: String,
        qrCodeBase64: String,
        copiaECola: String,
        expiracao: Date,
    },
    cartao: {
        ultimos4: String,
        bandeira: String,
        parcelas: Number,
    },
    gatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
    },
    webhookProcessado: {
        type: Boolean,
        default: false,
    },
    pagoEm: {
        type: Date,
    },
    notaFiscal: {
        numero: String,
        caminho: String,
        url: String,
        geradaEm: Date,
        enviadaWhatsApp: {
            type: Boolean,
            default: false,
        },
    },
}, {
    timestamps: true,
});

export default mongoose.model('Pagamento', pagamentoSchema);
