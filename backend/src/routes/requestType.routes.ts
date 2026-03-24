import { Router } from 'express';
import {
  getRequestTypes,
  createRequestType,
  updateRequestType,
  deleteRequestType,
} from '../controllers/requestType.controller';

const router = Router();

router.get('/', getRequestTypes);
router.post('/', createRequestType);
router.put('/:id', updateRequestType);
router.delete('/:id', deleteRequestType);

export default router;
