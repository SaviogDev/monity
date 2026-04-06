import express from 'express';
import {
  register,
  login,
  getMe,
  updateMe,
  updatePassword,
  updateAvatar, // <-- Nova função de foto
  verifyEmail,  // <-- Nova função de validação de e-mail
} from '../controllers/authController.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// Rotas públicas (Não precisam estar logado)
router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail); // <-- Rota para receber o código do e-mail

// Rotas protegidas (Precisam do token / estarem logados)
router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);
router.put('/password', auth, updatePassword);
router.put('/avatar', auth, updateAvatar); // <-- Rota do Firebase/Foto

export default router;