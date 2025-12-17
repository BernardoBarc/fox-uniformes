import mongoose from "mongoose";

const cupomSchema = new mongoose.Schema({
    codigo: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    desconto: {
        type: Number,
        required: true,
        min: 1,
        max: 100 // Porcentagem de desconto
    },
    valorMinimo: {
        type: Number,
        default: 0 // Valor mínimo do pedido para usar o cupom
    },
    ativo: {
        type: Boolean,
        default: true
    },
    dataValidade: {
        type: Date,
        default: null // null = sem data de validade
    },
    usoMaximo: {
        type: Number,
        default: null // null = uso ilimitado
    },
    vezesUsado: {
        type: Number,
        default: 0
    },
    criadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

// Método para verificar se o cupom está válido
cupomSchema.methods.isValido = function(valorPedido = 0) {
    // Verificar se está ativo
    if (!this.ativo) {
        return { valido: false, mensagem: "Este cupom está desativado" };
    }
    
    // Verificar data de validade
    if (this.dataValidade && new Date() > this.dataValidade) {
        return { valido: false, mensagem: "Este cupom expirou" };
    }
    
    // Verificar uso máximo
    if (this.usoMaximo !== null && this.vezesUsado >= this.usoMaximo) {
        return { valido: false, mensagem: "Este cupom atingiu o limite de uso" };
    }
    
    // Verificar valor mínimo
    if (valorPedido < this.valorMinimo) {
        return { 
            valido: false, 
            mensagem: `Valor mínimo para este cupom: R$ ${this.valorMinimo.toFixed(2)}` 
        };
    }
    
    return { valido: true, mensagem: "Cupom válido" };
};

// Método para calcular o desconto
cupomSchema.methods.calcularDesconto = function(valorOriginal) {
    return (valorOriginal * this.desconto) / 100;
};

const Cupom = mongoose.model("Cupom", cupomSchema);

export default Cupom;
