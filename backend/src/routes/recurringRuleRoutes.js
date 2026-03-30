import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {
  createRecurringRuleController,
  getRecurringRuleByIdController,
  getRecurringRulesController,
} from '../controllers/recurringRuleController.js';

const router = Router();

router.use(auth);

/**
 * READ
 */
router.get('/', getRecurringRulesController);
router.get('/:id', getRecurringRuleByIdController);

/**
 * WRITE
 */
router.post('/', createRecurringRuleController);

export default router;