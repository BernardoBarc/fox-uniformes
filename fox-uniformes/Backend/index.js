import mongoose from 'mongoose';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './database/database.js';
import router from './routes/router.js';

dotenv.config();
connectDB();

console.log('Chave JWT:', process.env.JWT_SECRET);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/', router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Rodando na porta ${PORT}`);
});
