import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Token de autenticacao nao fornecido');
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      const error = new Error('Usuario nao encontrado');
      error.statusCode = 401;
      return next(error);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      err.message = 'Token invalido';
      err.statusCode = 401;
    } else if (err.name === 'TokenExpiredError') {
      err.message = 'Token expirado';
      err.statusCode = 401;
    }

    next(err);
  }
};

export default auth;
