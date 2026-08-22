import app from './app';
import { env } from './config/env';
import { startWorker, stopWorker } from './workers/emailWorker';
import { prisma } from './config/db';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🚀 ReachInbox Scheduler Backend running on port ${PORT} in ${env.NODE_ENV} mode`);

  // Start the BullMQ worker to listen for delayed jobs
  startWorker();
});

/**
 * Handles graceful shutdown of all connections and worker threads on SIGINT/SIGTERM.
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🔄 Received ${signal}. Initiating graceful shutdown...`);

  server.close(() => {
    console.log('🚪 HTTP server closed.');
  });

  // Stop the BullMQ worker
  await stopWorker();

  // Close database connections
  await prisma.$disconnect();
  console.log('💾 Prisma database client disconnected.');

  console.log('👋 Shutdown complete. Exiting.');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
export default server;
