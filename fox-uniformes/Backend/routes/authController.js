import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import userService from '../services/userService.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// POST /auth/esqueci-senha
router.post('/auth/esqueci-senha', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    const user = await userService.findByEmail(email);
    if (!user) return res.status(200).json({ message: 'Se o email existir, enviamos instruções.' });

    // gera token e salva no usuário
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await userService.saveResetToken(user._id, token, expires);

    // link de reset
    const frontendBase = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : '';
    const link = `${frontendBase}/Esqueci-senha/reset/${token}`;

    // envia email de recuperação usando template específico
    await emailService.enviarRecuperacaoSenha({
      para: user.email,
      nome: user.name || user.login,
      linkReset: link,
      prazoHoras: 1,
    });

    res.json({ message: 'Se o email existir, enviamos instruções.' });
  } catch (err) {
    console.error('Erro /auth/esqueci-senha:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /auth/reset-senha
router.post('/auth/reset-senha', async (req, res) => {
  try {
    const { token, senha } = req.body;
    if (!token || !senha) return res.status(400).json({ error: 'Token e senha são obrigatórios' });

    const user = await userService.findByResetToken(token);
    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

    const hashed = await bcrypt.hash(senha, 10);
    await userService.updatePassword(user._id, hashed);
    await userService.clearResetToken(user._id);

    res.json({ message: 'Senha atualizada' });
  } catch (err) {
    console.error('Erro /auth/reset-senha:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
