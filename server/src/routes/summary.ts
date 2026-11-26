import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  createOrFetchRepoSummary,
  getLatestRepoSummary,
} from '../controllers/summaryController';
import { requireAuth, requireCsrf } from '../middleware/auth';

export const summaryRouter = Router();

const summaryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many summary requests. Wait a minute.' } },
});

summaryRouter.use(requireAuth, requireCsrf);

summaryRouter.get('/repos/:id/summary', getLatestRepoSummary);
summaryRouter.post('/repos/:id/summary', summaryLimiter, createOrFetchRepoSummary);