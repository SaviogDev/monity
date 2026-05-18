import express from 'express';
import auth from '../middlewares/auth.js';
import {
  getTitulos,
  getTituloById,
  updateTituloStatus,
  deleteTitulo,
} from '../controllers/tituloController.js';

const router = express.Router();

router.use(auth);

/**
 * READ
 */
router.get('/', getTitulos);
router.get('/:id', getTituloById);

/**
 * WRITE
 */
router.patch('/:id/status', updateTituloStatus);
router.delete('/:id', deleteTitulo);

export default router;
