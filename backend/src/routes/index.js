import express from 'express';
import authRoutes from './authRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import healthRoutes from './healthRoutes.js';
import accountRoutes from './accountRoutes.js';
import creditCardRoutes from './creditCardRoutes.js';
import installmentPlanRoutes from './installmentPlanRoutes.js';
import recurringRuleRoutes from './recurringRuleRoutes.js';
import financingRoutes from './financingRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/categories', categoryRoutes);
router.use('/accounts', accountRoutes);
router.use('/credit-cards', creditCardRoutes);
router.use('/installment-plans', installmentPlanRoutes);
router.use('/recurring-rules', recurringRuleRoutes);
router.use('/health', healthRoutes);
router.use('/financings', financingRoutes);

export default router;