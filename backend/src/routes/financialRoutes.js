import express from 'express';
import { getProjectionController } from '../controllers/financialController.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

router.get('/projection', auth, getProjectionController);

export default router;  