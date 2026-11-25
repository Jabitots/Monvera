import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { AppError, errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';
import { getDatabaseState } from './config/db.js';

const UPLOADS_DIR = path.resolve(process.cwd(), '.data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed.', 400));
    }
    cb(null, true);
  },
});

export const createApiApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', (req, _res, next) => {
    const positiveInteger = (key: string, max = 100) => {
      const value = req.query[key];
      if (value === undefined) return true;
      return typeof value === 'string' && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max;
    };
    if (!positiveInteger('page') || !positiveInteger('limit')) return next(new AppError('Pagination values must be positive integers (limit maximum is 100).', 400));
    if (req.path === '/orders') {
      const statuses = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled'];
      const status = req.query.status;
      if (status !== undefined && (typeof status !== 'string' || !statuses.includes(status))) return next(new AppError('Invalid order status filter.', 400));
      for (const key of ['from', 'to']) {
        const value = req.query[key];
        if (value !== undefined && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) return next(new AppError(`Invalid ${key} date filter.`, 400));
      }
      if (typeof req.query.from === 'string' && typeof req.query.to === 'string' && Date.parse(req.query.from) > Date.parse(req.query.to)) return next(new AppError('The from date must be earlier than or equal to the to date.', 400));
    }
    next();
  });

  // Serve uploaded product images and static studio assets reliably in both dev and prod
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use(
    '/src/assets/images',
    express.static(path.resolve(process.cwd(), 'src', 'assets', 'images'))
  );

  // Health check
  app.get('/api/health', (_req, res) => {
    const database = getDatabaseState();
    const mongoReady = database.mode === 'mongodb' && mongoose.connection.readyState === 1;
    const ready = mongoReady || database.mode === 'local-store';
    res.status(ready ? 200 : 503).json({
      success: ready,
      status: ready ? 'ok' : 'unavailable',
      database: { mode: database.mode, connected: mongoReady, supportsTransactions: database.supportsTransactions },
    });
  });

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Product image upload endpoint
  app.post('/api/upload', upload.single('image'), (req, res, next) => {
    if (!req.file) {
      return next(new AppError('No image file provided.', 400));
    }
    res.status(201).json({
      success: true,
      data: {
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
      },
    });
  });

  // Core 4 REST API modules
  app.use('/api/products', productRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // Unknown API routes -> 404
  app.use('/api/*', notFoundHandler);
  app.use(errorHandler);

  return app;
};
