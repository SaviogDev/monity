import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getGoals,
  createGoal,
  updateGoalAmount,
  deleteGoal
} from '../controllers/goalController.js';

const router = express.Router();

router.use(auth);

router.get('/', getGoals);
router.post('/', createGoal);
router.patch('/:id/amount', updateGoalAmount); // Rota específica para depositar/resgatar
router.delete('/:id', deleteGoal);

export default router;