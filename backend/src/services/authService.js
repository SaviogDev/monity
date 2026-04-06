import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// 1. ATUALIZADO: Agora recebe os dados do código gerados no Controller
export const register = async ({ name, email, password, verificationCode, verificationCodeExpires }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('E-mail já cadastrado');
    error.statusCode = 409;
    throw error;
  }

  // Salva o usuário no banco com o código e a validade
  const user = await User.create({ 
    name, 
    email, 
    password,
    verificationCode,
    verificationCodeExpires
  });
  
  const token = generateToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified, // Devolvemos o status (falso por padrão)
    },
  };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    const error = new Error('E-mail ou senha inválidos');
    error.statusCode = 401;
    throw error;
  }

  // 2. NOVA TRAVA: Impede o login se o e-mail não estiver verificado
  if (!user.isVerified) {
    const error = new Error('Por favor, verifique seu e-mail usando o código enviado antes de entrar.');
    error.statusCode = 403; // 403 Forbidden
    throw error;
  }

  const token = generateToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    },
  };
};

export const updateMe = async ({ userId, name }) => {
  if (!name || !name.trim()) {
    const error = new Error('Nome é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('Usuário não encontrado');
    error.statusCode = 404;
    throw error;
  }

  user.name = name.trim();
  await user.save();

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  };
};

export const updatePassword = async ({ userId, currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    const error = new Error('Senha atual e nova senha são obrigatórias');
    error.statusCode = 400;
    throw error;
  }

  if (newPassword.length < 6) {
    const error = new Error('A nova senha deve ter pelo menos 6 caracteres');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    const error = new Error('Usuário não encontrado');
    error.statusCode = 404;
    throw error;
  }

  const passwordMatches = await user.comparePassword(currentPassword);
  if (!passwordMatches) {
    const error = new Error('Senha atual inválida');
    error.statusCode = 401;
    throw error;
  }

  user.password = newPassword;
  await user.save();

  return {
    message: 'Senha atualizada com sucesso',
  };
};