import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getInvoicesController,
  getInvoiceByCardAndMonthController,
} from '../controllers/invoiceController.js';

const router = express.Router();

// O middleware 'auth' vai injetado diretamente em cada rota (padrão mais seguro)
router.get('/', auth, getInvoicesController);
router.get('/:cardId/:monthKey', auth, getInvoiceByCardAndMonthController);

export default router;