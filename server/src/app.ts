import path from 'path';
import fs from 'fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { reposRouter } from './routes/repos';
import { scansRouter } from './routes/scans';
import { webhooksRouter } from './routes/webhooks';
import { summaryRouter } from './routes/summary';
import { askRouter } from './routes/ask';
import { settingsRouter } from './routes/settings';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  const allowedOrigin = env.CLIENT_URL.replace(/\/+$/, '');
  app.use(
    cors({
      origin: allowedOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    }),
  );
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 5000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.path === '/api/health' || req.path.startsWith('/api/auth');
    },
  });
  app.use(apiLimiter);
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', reposRouter);
  app.use('/api', scansRouter);
  app.use('/api', webhooksRouter);
  app.use('/api', summaryRouter);
  app.use('/api', askRouter);
  app.use('/api', settingsRouter);

  const clientDistPath = [
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
  ].find((p) => fs.existsSync(p)) ?? path.resolve(process.cwd(), 'client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}