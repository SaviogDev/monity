import { Router } from 'express';
import {
  getAll,
  getById,
  getSummary,
  create,
  update,
  remove,
} from '../controllers/transactionController.js';
import auth from '../middlewares/auth.js';

const router = Router();

// Todas as rotas de transações exigem autenticação
router.use(auth);

router.get('/', getAll);
router.get('/summary', getSummary);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
