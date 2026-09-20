import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 5000;

async function bootstrap() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`[ServiceDesk Pro] Core API listening on port ${PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    logger.error('[ServiceDesk Pro] Server bootstrap failed:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
