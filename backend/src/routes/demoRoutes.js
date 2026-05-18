import { Router } from 'express';
import authMiddleware from '../middlewares/auth.js';
import { seedDemo, clearDemo, demoStatus } from '../controllers/demoController.js';

const router = Router();

router.use(authMiddleware);

router.post('/seed', seedDemo);
router.delete('/clear', clearDemo);
router.get('/status', demoStatus);

export default router;
