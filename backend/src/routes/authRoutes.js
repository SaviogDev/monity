import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  getMe,
  updateMe,
  updatePassword,
  updateAvatar,
  verifyEmail,
} from '../controllers/authController.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
  },
});

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/verify-email', authRateLimit, verifyEmail);

router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);
router.put('/password', auth, updatePassword);
router.put('/avatar', auth, updateAvatar);

export default router;
