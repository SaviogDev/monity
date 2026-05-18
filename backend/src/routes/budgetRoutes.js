import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../controllers/budgetController.js';

const router = express.Router();

router.use(auth);

router.get('/', getBudgets);
router.post('/', createBudget);
router.patch('/:id', updateBudget);
router.delete('/:id', deleteBudget);

export default router;
