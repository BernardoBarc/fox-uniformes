import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './database/database.js';
import router from './routes/router.js';
import authController from './routes/authController.js';

dotenv.config();
connectDB();

// Para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Chave JWT:', process.env.JWT_SECRET);

const app = express();

// Configuração do CORS para produção
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://fox-uniformes.vercel.app',
  'https://fox-uniformes-jva8twi6k-bernardobarcs-projects.vercel.app'
];

// Adiciona FRONTEND_URL se existir (remove / do final se tiver)
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

console.log('Allowed Origins:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições sem origin (como Postman) ou origins permitidas
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Origin bloqueada pelo CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir arquivos de notas fiscais
app.use('/notas_fiscais', express.static(path.join(__dirname, 'notas_fiscais')));

app.use('/', router);
app.use('/api', authController);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Rodando na porta ${PORT}`);
});
