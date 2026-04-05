import { Router } from 'express';
import * as recurringRuleController from '../controllers/recurringRuleController.js';
import auth from '../middlewares/auth.js'; 

const router = Router();

router.post('/process', auth, recurringRuleController.processRecurrences);
router.post('/', auth, recurringRuleController.createRule);
router.get('/', auth, recurringRuleController.getRules);
router.get('/:id', auth, recurringRuleController.getRuleById);

export default router;