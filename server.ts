import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './backend/config/db.js';
import { seedInitialDataIfEmpty } from './backend/services/seedService.js';
import { createApiApp } from './backend/app.js';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function bootstrap() {
  await connectDB();
  await seedInitialDataIfEmpty();

  const app = createApiApp();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Verdant Ledger] Server running at http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Verdant Ledger] Startup error:', err);
  process.exit(1);
});
