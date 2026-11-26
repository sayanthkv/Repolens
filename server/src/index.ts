import http from 'http';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { createApp } from './app';
import { initSocketServer } from './socket';
import { startScanWorker } from './queue/scanQueue';
import { logger } from './utils/logger';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);
  startScanWorker();

  httpServer.listen(env.PORT, () => {
    logger.info(`RepoLens API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap();