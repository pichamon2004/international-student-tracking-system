import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';

const REFRESH_COOKIE = 'ist_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const signAccess = (payload: { userId: number; email: string; role: string }) =>
  jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as jwt.SignOptions['expiresIn'],
  });

const signRefresh = (userId: number) =>
  jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30d' as jwt.SignOptions['expiresIn'] });

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password!);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token        = signAccess({ userId: user.id, email: user.email, role: user.role! });
    const refreshToken = signRefresh(user.id);

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/refresh — ใช้ refresh token จาก HttpOnly cookie ออก access token ใหม่
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ success: false, message: 'No refresh token' });
      return;
    }

    let payload: { userId: number };
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    } catch {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }

    const newAccess  = signAccess({ userId: user.id, email: user.email, role: user.role! });
    const newRefresh = signRefresh(user.id);

    res.cookie(REFRESH_COOKIE, newRefresh, COOKIE_OPTS);
    res.json({ success: true, data: { token: newAccess } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/auth/logout — clear refresh token cookie
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax' });
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        student: { select: { firstNameEn: true, lastNameEn: true, titleEn: true } },
        advisor: { select: { firstNameEn: true, lastNameEn: true, titleEn: true } },
      },
    });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Build display name from Student/Advisor profile if available
    let displayName = user.name;
    if (user.student) {
      if (user.student.firstNameEn) displayName = user.student.firstNameEn;
    } else if (user.advisor) {
      const { titleEn, firstNameEn, lastNameEn } = user.advisor;
      const full = [titleEn, firstNameEn, lastNameEn].filter(Boolean).join(' ');
      if (full) displayName = full;
    }

    const { student: _s, advisor: _a, ...rest } = user;
    res.json({ success: true, data: { ...rest, name: displayName } });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/auth/google — redirect to Google OAuth consent screen
export const googleAuth = (_req: Request, res: Response): void => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${BACKEND_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// GET /api/auth/google/callback — exchange code, issue JWT, redirect to frontend
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:4000';
  const { code } = req.query;

  if (!code) {
    res.redirect(`${FRONTEND_URL}/login?error=no_code`);
    return;
  }

  try {
    // 1. Exchange code for Google access token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${BACKEND_URL}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    });
    const { access_token } = tokenRes.data;

    // 2. Get user profile from Google
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { sub: googleId, email, name, picture } = profileRes.data;

    // 3. Find existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    // Students must be pre-registered by staff — do not auto-create accounts
    if (!user) {
      res.redirect(`${FRONTEND_URL}/login?error=not_registered`);
      return;
    }

    if (!user.googleId) {
      // Link Google account to existing email-based account
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, image: picture },
      });
    }

    if (!user.isActive) {
      res.redirect(`${FRONTEND_URL}/login?error=inactive`);
      return;
    }
    if (!user.role) {
      res.redirect(`${FRONTEND_URL}/login?error=no_role`);
      return;
    }

    // 4. Issue JWT
    const token        = signAccess({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = signRefresh(user.id);

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&role=${user.role}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!user.password) {
      res.status(400).json({ success: false, message: 'This account uses Google login. Please use Google to sign in.' });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
