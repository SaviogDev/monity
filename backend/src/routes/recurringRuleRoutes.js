import { Router } from 'express';
import * as recurringRuleController from '../controllers/recurringRuleController.js';
import auth from '../middlewares/auth.js'; 

const router = Router();

router.post('/process', auth, recurringRuleController.processRecurrences);
router.post('/', auth, recurringRuleController.createRule);
router.get('/', auth, recurringRuleController.getRules);
router.get('/:id', auth, recurringRuleController.getRuleById);
router.put('/:id', auth, recurringRuleController.updateRule);
router.delete('/:id', auth, recurringRuleController.deleteRule);

export default router;