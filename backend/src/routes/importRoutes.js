import express from 'express';
import multer from 'multer';
import { processOFX } from '../controllers/importController.js';
import protect from '../middlewares/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/**
 * Rota legada mantida por compatibilidade.
 * O contrato principal agora é /api/transactions/import.
 */
router.post('/ofx', protect, upload.single('file'), processOFX);

export default router;