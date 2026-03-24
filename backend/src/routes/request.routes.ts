import { Router } from 'express';
import {
  getRequests,
  getRequestById,
  createRequest,
  updateRequestStatus,
} from '../controllers/request.controller';

const router = Router();

router.get('/', getRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.put('/:id/status', updateRequestStatus);

export default router;
