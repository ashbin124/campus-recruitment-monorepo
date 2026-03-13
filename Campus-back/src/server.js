import { connectDB, disconnectDB } from './connection/prisma.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logError, logInfo, serializeError } from './utils/logger.js';

const PORT = env.PORT || 5000;
const app = createApp();
let httpServer = null;

function registerProcessHandlers() {
  process.on('unhandledRejection', (reason) => {
    logError('Unhandled promise rejection', {
      reason: reason instanceof Error ? serializeError(reason) : { message: String(reason) },
    });
  });

  process.on('uncaughtException', (error) => {
    logError('Uncaught exception', { error: serializeError(error) });
    process.exit(1);
  });

  const shutdown = async (signal) => {
    logInfo('Shutdown signal received', { signal });

    try {
      if (httpServer) {
        await new Promise((resolve) => httpServer.close(resolve));
      }
      await disconnectDB();
      logInfo('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logError('Graceful shutdown failed', { error: serializeError(error) });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function startServer() {
  registerProcessHandlers();
  await connectDB();
  httpServer = app.listen(PORT, () => {
    logInfo('Server started', { port: PORT, nodeEnv: env.NODE_ENV });
  });
}

startServer().catch((error) => {
  logError('Failed to start server', { error: serializeError(error) });
  process.exit(1);
});
