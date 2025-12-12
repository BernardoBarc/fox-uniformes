import express from 'express';
import userService from '../services/userService.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Rota para verificar se o usuário está autenticado
router.get('/auth/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ authenticated: false, error: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_jwt_aqui');
        const user = await userService.getUser(decoded.id);
        
        if (user) {
            res.json({ authenticated: true, user: { id: user._id, login: user.login, role: user.role } });
        } else {
            res.status(401).json({ authenticated: false, error: 'Usuário não encontrado' });
        }
    } catch (error) {
        res.status(401).json({ authenticated: false, error: 'Token inválido' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.get('/users/:id', async (req, res) => {
    try {
        const user = await userService.getUser(req.params.id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.post('/users', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = await userService.saveUser({ ...req.body, password: hashedPassword });
        res.status(201).json(newUser);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.post('/users/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        const user = await userService.findByLogin(login);
        if (user && await bcrypt.compare(password, user.password)) {
            // Gerar token JWT
            const token = jwt.sign(
                { id: user._id, login: user.login, role: user.role },
                process.env.JWT_SECRET || 'seu_segredo_jwt_aqui',
                { expiresIn: '24h' }
            );
            res.json({ message: 'Login bem-sucedido', token, user: { id: user._id, login: user.login, role: user.role } });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const updatedUser = await userService.updateUser(req.params.id, req.body);
        if (updatedUser) {
            res.json(updatedUser);
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

router.delete('/users/:id', async (req, res) => {
    const {id} = req.params;
    try {
        await userService.deleteUser(id);
        res.status(204).send();
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

export default router;