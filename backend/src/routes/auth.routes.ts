import { Router } from 'express';
import { login, getMe, changePassword, refreshToken, logout, googleAuth, googleCallback, selectRole, getMyRoles } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler.middleware';

const router = Router();

router.post('/login',           asyncHandler(login));
router.post('/refresh',         asyncHandler(refreshToken));
router.post('/logout',          logout);
router.post('/select-role',     authenticate, asyncHandler(selectRole));
router.get('/me',               authenticate, asyncHandler(getMe));
router.get('/my-roles',         authenticate, asyncHandler(getMyRoles));
router.put('/change-password',  authenticate, asyncHandler(changePassword));
router.get('/google',           googleAuth);
router.get('/google/callback',  googleCallback);

export default router;
