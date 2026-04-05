import express from 'express';
import multer from 'multer';
import auth from '../middlewares/auth.js';
import {
  getTransactions,
  getTransactionSummary,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
} from '../controllers/transactionController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(auth);

/**
 * READ
 */
router.get('/summary', getTransactionSummary);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);

/**
 * IMPORT
 * Contrato oficial do produto:
 * POST /api/transactions/import
 */
router.post('/import', upload.single('file'), importTransactions);

/**
 * WRITE
 */
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;