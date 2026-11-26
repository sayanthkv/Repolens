import { Router } from 'express';
import {
  getMe,
  handleGithubCallback,
  logout,
  startGithubOAuth,
} from '../controllers/authController';
import { requireAuth, requireCsrf } from '../middleware/auth';

export const authRouter = Router();

authRouter.get('/auth/github', startGithubOAuth);
authRouter.get('/auth/github/callback', handleGithubCallback);
authRouter.post('/auth/logout', requireCsrf, logout);
authRouter.get('/me', requireAuth, getMe);