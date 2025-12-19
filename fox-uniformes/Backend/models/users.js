import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  login: {
    type: String,
    required: true,
    unique: true,
  },
  dataNascimento: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  telefone: {
    type: String,
    required: true,
  },
  endereco: {
    type: String,
  },
  role: {
    type: String,
    enum: ['admin', 'vendedor'],
    default: 'vendedor',
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

export default User;
