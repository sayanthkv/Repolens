import { Router } from 'express';
import { deleteAccountAndData, getAccountSettings } from '../controllers/settingsController';
import { requireAuth, requireCsrf } from '../middleware/auth';

export const settingsRouter = Router();

settingsRouter.use(requireAuth, requireCsrf);

settingsRouter.get('/settings', getAccountSettings);
settingsRouter.delete('/account', deleteAccountAndData);