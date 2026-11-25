import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import { seedInitialDataIfEmpty } from './services/seedService.js';
import { createApiApp } from './app.js';

const PORT = Number(process.env.BACKEND_PORT || process.env.PORT || 5000);

const startStandaloneServer = async () => {
  await connectDB();
  await seedInitialDataIfEmpty();
  const app = createApiApp();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] Standalone API server listening on port ${PORT}`);
  });
  const shutdown = (signal: string) => {
    console.log(`[Backend] ${signal} received; closing server and database.`);
    server.close(() => {
      import('mongoose').then(({ default: mongoose }) => mongoose.disconnect())
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

startStandaloneServer().catch((err) => {
  console.error('[Backend] Failed to start:', err);
  process.exit(1);
});
