import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getAccounts,
  getAccountsWithBalance,
  getAccountById,
  getAccountByIdWithBalance,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/accountController.js';

const router = express.Router();

router.use(auth);

router.get('/', getAccounts);
router.get('/with-balance', getAccountsWithBalance);
router.get('/:id/with-balance', getAccountByIdWithBalance);
router.get('/:id', getAccountById);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;