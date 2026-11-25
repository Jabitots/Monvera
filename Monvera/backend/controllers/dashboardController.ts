import { NextFunction, Request, Response } from 'express';
import * as businessService from '../services/businessService.js';
import { AppError } from '../middleware/errorMiddleware.js';

export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = await businessService.getDashboardStats();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSales = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawPeriod = String(req.query.period || 'weekly');
    if (rawPeriod !== 'daily' && rawPeriod !== 'weekly' && rawPeriod !== 'monthly') throw new AppError('Invalid sales period. Use daily, weekly, or monthly.', 400);
    const period = rawPeriod;
    const data = await businessService.getDashboardSales(period);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getRecentOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 5)));
    const data = await businessService.getRecentOrders(limit);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTopProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 4)));
    const data = await businessService.getTopProducts(limit);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
