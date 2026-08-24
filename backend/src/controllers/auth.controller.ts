import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import * as authService from '../services/domain/auth.service';

const REFRESH_COOKIE = 'ist_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  if (result.requireRoleSelection) {
    res.json({ success: true, data: result });
    return;
  }

  res.cookie(REFRESH_COOKIE, result.refreshToken!, COOKIE_OPTS);
  res.json({ success: true, data: { token: result.token, user: result.user } });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const cookieToken = req.cookies?.[REFRESH_COOKIE];
  if (!cookieToken) {
    res.status(401).json({ success: false, message: 'No refresh token' });
    return;
  }
  const { token, refreshToken: newRefresh } = await authService.verifyAndRefresh(cookieToken);
  res.cookie(REFRESH_COOKIE, newRefresh, COOKIE_OPTS);
  res.json({ success: true, data: { token } });
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'lax' });
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await authService.getMyProfile(req.user!.userId);
  res.json({ success: true, data: user });
};

export const googleAuth = (_req: Request, res: Response): void => {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${BACKEND_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'offline',
    prompt:        'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// googleCallback ใช้ res.redirect แทน res.json จึงต้อง try/catch เพื่อ redirect on error
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:4000';
  const { code } = req.query;

  if (!code) {
    res.redirect(`${FRONTEND_URL}/login?error=no_code`);
    return;
  }

  try {
    const result = await authService.processGoogleLogin(
      code as string,
      `${BACKEND_URL}/api/auth/google/callback`,
    );

    if (result.requireRoleSelection) {
      res.redirect(`${FRONTEND_URL}/auth/select-role?tempToken=${result.tempToken}&roles=${encodeURIComponent(JSON.stringify(result.roles))}`);
      return;
    }

    res.cookie(REFRESH_COOKIE, result.refreshToken!, COOKIE_OPTS);
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${result.token}&role=${result.activeRole}`);
  } catch (err: unknown) {
    const errorCode = (err as { errorCode?: string }).errorCode ?? 'server_error';
    res.redirect(`${FRONTEND_URL}/login?error=${errorCode}`);
  }
};

export const getMyRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  const roles = await authService.getMyRoles(req.user!.userId);
  res.json({ success: true, data: roles });
};

export const selectRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { roleId } = req.body;
  const result = await authService.selectRole(req.user!.userId, roleId);
  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTS);
  res.json({ success: true, data: { token: result.token, user: result.user } });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user!.userId, currentPassword, newPassword);
  res.json({ success: true, message: 'Password changed successfully' });
};
