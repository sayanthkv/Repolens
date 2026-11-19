import { env } from './config/env';
import { connectDatabase } from './config/db';
import { createApp } from './app';
import { logger } from './utils/logger';

async function bootstrap() {
  await connectDatabase();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(RepoLens API listening on http://localhost: ());
  });
}

bootstrap();