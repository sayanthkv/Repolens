import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getScanDetails,
  listRepoScans,
  triggerRepoScan,
  updateFindingStatus,
  getScanSbom,
  getScanLicenses,
  createFindingFixPr,
} from '../controllers/scanController';
import { requireAuth, requireCsrf } from '../middleware/auth';

export const scansRouter = Router();

const scanTriggerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many scan requests. Wait a minute.' } },
});

const createPrLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many Pull Request creation requests. Wait a minute.' } },
});

scansRouter.use(requireAuth, requireCsrf);

scansRouter.post('/repos/:id/scans', scanTriggerLimiter, triggerRepoScan);
scansRouter.get('/repos/:id/scans', listRepoScans);
scansRouter.get('/scans/:id', getScanDetails);
scansRouter.get('/scans/:id/sbom', getScanSbom);
scansRouter.get('/scans/:id/licenses', getScanLicenses);
scansRouter.patch('/findings/:id', updateFindingStatus);
scansRouter.post('/findings/:id/create-pr', createPrLimiter, createFindingFixPr);