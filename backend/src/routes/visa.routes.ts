import { Router } from 'express';
import { getVisas, createVisa, updateVisa, deleteVisa } from '../controllers/visa.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/:id/visas', authenticate, getVisas);
router.post('/:id/visas', authenticate, createVisa);
router.put('/:id/visas/:visaId', authenticate, updateVisa);
router.delete('/:id/visas/:visaId', authenticate, deleteVisa);

export default router;
