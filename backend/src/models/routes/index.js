import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

// Futuras rotas serão registradas aqui:
// import authRoutes from './authRoutes.js';
// import transactionRoutes from './transactionRoutes.js';
// import categoryRoutes from './categoryRoutes.js';

const router = Router();

router.use('/health', healthRoutes);

// router.use('/auth', authRoutes);
// router.use('/transactions', transactionRoutes);
// router.use('/categories', categoryRoutes);

export default router;
