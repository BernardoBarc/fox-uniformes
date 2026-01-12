import mongoose from 'mongoose';

const contadorFiscalSchema = new mongoose.Schema({
  ano: {
    type: Number,
    required: true,
    unique: true
  },
  sequencial: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('ContadorFiscal', contadorFiscalSchema);
