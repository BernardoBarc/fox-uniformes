import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Token não fornecido');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, 'seu_segredo_jwt_aqui');
    req.user = await User.findById(decoded.id);
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