import express from 'express';
import auth from '../middlewares/auth.js';
import {
  createFinancing,
  getFinancings,
  getFinancingSummary,
  updateFinancing,
  deleteFinancing,
  simulateFinancing,
} from '../controllers/financingController.js';

const router = express.Router();

router.use(auth);

router.get('/', getFinancings);
router.get('/summary', getFinancingSummary);
router.post('/', createFinancing);
router.post('/simulate', simulateFinancing);
router.put('/:id', updateFinancing);
router.delete('/:id', deleteFinancing);

export default router;