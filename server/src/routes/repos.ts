import { Router } from 'express';
import {
  connectRepo,
  disconnectRepo,
  getConnectedRepo,
  listAvailableGitHubRepos,
  listConnectedRepos,
} from '../controllers/repoController';
import { requireAuth, requireCsrf } from '../middleware/auth';

export const reposRouter = Router();

reposRouter.use(requireAuth, requireCsrf);

reposRouter.get('/github/repos', listAvailableGitHubRepos);
reposRouter.post('/repos', connectRepo);
reposRouter.get('/repos', listConnectedRepos);
reposRouter.get('/repos/:id', getConnectedRepo);
reposRouter.delete('/repos/:id', disconnectRepo);