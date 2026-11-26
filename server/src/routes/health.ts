import { Router } from 'express';
import mongoose from 'mongoose';
import type { HealthResponse } from '@repolens/shared';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const payload: HealthResponse = {
    status: isConnected ? 'ok' : 'degraded',
    service: 'repolens-api',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: isConnected ? 'connected' : 'disconnected',
  };
  res.status(isConnected ? 200 : 503).json(payload);
});