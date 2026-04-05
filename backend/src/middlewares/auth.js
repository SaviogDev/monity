import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Token de autenticação não fornecido');
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.split(' ')[1];

    // =========================================================
    // LOGS TEMPORÁRIOS DE DEBUG - Olhe o terminal após o erro!
    // =========================================================
    console.log("🔑 Token recebido:", token);
    console.log("🔒 JWT_SECRET carregado?", process.env.JWT_SECRET ? "SIM" : "NÃO (Undefined!)");
    // =========================================================

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      const error = new Error('Usuário não encontrado');
      error.statusCode = 401;
      return next(error);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      err.message = 'Token inválido';
      err.statusCode = 401;
    } else if (err.name === 'TokenExpiredError') {
      err.message = 'Token expirado';
      err.statusCode = 401;
    }

    next(err);
  }
};

export default auth;