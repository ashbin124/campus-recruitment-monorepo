import { PrismaClient } from '@prisma/client';
import { logError, logInfo, serializeError } from '../utils/logger.js';

const prisma = new PrismaClient({});

const connectDB = async () => {
  try {
    logInfo('Database connection: starting');
    await prisma.$connect();
    logInfo('Database connection: connected');

    // Verify DB connectivity before the server starts accepting traffic.
    await prisma.$queryRaw`SELECT 1`;
    logInfo('Database connection: health check passed');
  } catch (error) {
    logError('Database connection failed', {
      error: serializeError(error),
      meta: error?.meta,
    });
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    logInfo('Database connection: closed');
  } catch (error) {
    logError('Database disconnect failed', { error: serializeError(error) });
    process.exit(1);
  }
};
export { connectDB, disconnectDB };
export default prisma;
