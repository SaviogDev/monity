import express from 'express';
import auth from '../middlewares/auth.js';
import { getAlertsController } from '../controllers/alertController.js';

const router = express.Router();

router.use(auth);

router.get('/', getAlertsController);

export default router;