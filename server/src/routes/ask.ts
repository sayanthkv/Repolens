import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { askRepositoryQuestion } from '../controllers/askController';
import { requireAuth, requireCsrf } from '../middleware/auth';

export const askRouter = Router();

const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many chat requests. Wait a minute.' } },
});

askRouter.use(requireAuth, requireCsrf);

askRouter.post('/repos/:id/ask', askLimiter, askRepositoryQuestion);