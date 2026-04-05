import express from 'express';
import { getProjectionController } from '../controllers/financialController.js';
import auth from '../middlewares/auth.js';
import * as insightController from '../controllers/insightController.js';

const router = express.Router();

router.get('/projection', auth, getProjectionController);
router.get('/insights', auth, insightController.getMonthlyInsight);

export default router;  