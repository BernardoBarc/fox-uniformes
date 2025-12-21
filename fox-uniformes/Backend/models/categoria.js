import mongoose from 'mongoose';

const categoriaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    descricao: {
        type: String,
        default: '',
    },
    ativo: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

const Categoria = mongoose.model('Categoria', categoriaSchema);

export default Categoria;
