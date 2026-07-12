import mongoose from 'mongoose';
import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { Order } from './models/Order.js';
import { releaseExpiredUnstartedReservations } from './services/inventoryService.js';

let server;
try {
  await connectDatabase();
  server = app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
  const cleanup = () => releaseExpiredUnstartedReservations(Order, mongoose).catch((error) => console.error('Reservation cleanup failed:', error));
  setInterval(cleanup, 60_000).unref();
  cleanup();
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server?.close(async () => { await mongoose.connection.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => { console.error('Unhandled rejection', error); shutdown('unhandledRejection'); });
