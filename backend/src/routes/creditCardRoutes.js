import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getCreditCards,
  getCreditCardById,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  getCardTransactions
} from '../controllers/creditCardController.js';

const router = express.Router();

router.use(auth);

router.get('/', getCreditCards);
router.get('/:id', getCreditCardById);
router.post('/', createCreditCard);
router.put('/:id', updateCreditCard);
router.delete('/:id', deleteCreditCard);
router.get('/:id/transactions', getCardTransactions);

export default router;