import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getInvoicesController,
  getInvoiceByCardAndMonthController,
} from '../controllers/invoiceController.js';

const router = express.Router();

router.use(auth);

router.get('/', getInvoicesController);
router.get('/:cardId/:monthKey', getInvoiceByCardAndMonthController);

export default router;