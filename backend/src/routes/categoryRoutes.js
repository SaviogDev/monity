import { Router } from 'express';
import { getAll, getById, create, update, remove } from '../controllers/categoryController.js';
import auth from '../middlewares/auth.js';

const router = Router();

// Todas as rotas de categorias exigem autenticação
router.use(auth);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
