import { Router } from 'express';
import { handleGitHubWebhook } from '../controllers/webhookController';

export const webhooksRouter = Router();

webhooksRouter.post('/webhooks/github', handleGitHubWebhook);