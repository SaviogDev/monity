import { Router } from 'express';
import auth from '../middlewares/auth.js';
import {
  createInstallmentPlanController,
  getInstallmentPlanByIdController,
  getInstallmentPlansController,
} from '../controllers/installmentPlanController.js';

const router = Router();

router.use(auth);

/**
 * READ
 */
router.get('/', getInstallmentPlansController);
router.get('/:id', getInstallmentPlanByIdController);

/**
 * WRITE
 */
router.post('/', createInstallmentPlanController);

export default router;