import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getTransactions,
  getTransactionSummary,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transactionController.js';

const router = express.Router();

router.use(auth);

/**
 * READ
 */
router.get('/summary', getTransactionSummary);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);

/**
 * WRITE
 */
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;