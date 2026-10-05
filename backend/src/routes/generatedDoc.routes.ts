import { Router } from 'express';
import {
  generatePdf, getGeneratedDocs, getGeneratedDocById,
  downloadGeneratedDoc, uploadSignedDoc, uploadSignedDocHandler,
  getSignaturesHandler, addSignatureHandler, finalizeHandler,
} from '../controllers/generatedDoc.controller';
import { authenticate, requirePermission } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

// Under /api/requests
export const requestDocRouter = Router();
requestDocRouter.post('/:id/generate-pdf',       authenticate, requirePermission('GENERATED_DOC_MANAGEMENT.create'), asyncHandler(generatePdf));
requestDocRouter.get('/:id/generated-documents', authenticate, asyncHandler(getGeneratedDocs));

// Under /api/generated-documents
router.get('/:docId',                authenticate, asyncHandler(getGeneratedDocById));
router.get('/:docId/download',       authenticate, asyncHandler(downloadGeneratedDoc));
router.post('/:docId/upload-signed', authenticate, requirePermission('GENERATED_DOC_MANAGEMENT.edit'), uploadSignedDoc[0], asyncHandler(uploadSignedDocHandler));
router.get('/:docId/signatures',     authenticate, asyncHandler(getSignaturesHandler));
router.post('/:docId/signatures',    authenticate, asyncHandler(addSignatureHandler));
router.post('/:docId/finalize',      authenticate, requirePermission('GENERATED_DOC_MANAGEMENT.edit'), asyncHandler(finalizeHandler));

export default router;
