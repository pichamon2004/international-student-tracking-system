import { Router } from 'express';
import { login, getMe, changePassword, refreshToken, logout, googleAuth, googleCallback } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;
