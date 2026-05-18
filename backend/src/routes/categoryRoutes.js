import { Router } from 'express';
import { 
  getAll, 
  getById, 
  create, 
  update, 
  remove, 
  getBudgetSummary 
} from '../controllers/categoryController.js';
import auth from '../middlewares/auth.js';

const router = Router();

router.use(auth);

router.get('/budgets/summary', getBudgetSummary);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;