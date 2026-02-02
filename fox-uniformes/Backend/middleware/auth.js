import jwt from 'jsonwebtoken';
import User from '../models/users.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Token não fornecido');
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'seu_segredo_jwt_aqui';
    const decoded = jwt.verify(token, secret);
    // Recupera usuário e normaliza campos para facilitar comparações (id e _id como strings)
    const found = await User.findById(decoded.id);
    if (!found) return res.status(401).send('Usuário não encontrado');
    // converte para objeto plain caso seja um documento Mongoose
    const userObj = found.toObject ? found.toObject() : found;
    // garante propriedades id e _id como strings
    if (userObj._id) userObj._id = String(userObj._id);
    userObj.id = userObj.id ? String(userObj.id) : (userObj._id ? String(userObj._id) : undefined);
    req.user = userObj;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).send('Token inválido');
  }
};

const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send('Acesso negado');
    }
    next();
  };
};

export { authMiddleware, authorizeRoles };