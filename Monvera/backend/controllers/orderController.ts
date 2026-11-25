import { NextFunction, Request, Response } from 'express';
import * as businessService from '../services/businessService.js';

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await businessService.listOrders({
      search: String(req.query.search || ''),
      status: String(req.query.status || ''),
      from: String(req.query.from || ''),
      to: String(req.query.to || ''),
      page: Math.max(1, Number(req.query.page || 1)),
      limit: Math.min(100, Math.max(1, Number(req.query.limit || 20))),
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await businessService.getOrderById(String(req.params.id));
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await businessService.createOrder(req.body);
    res.status(201).json({
      success: true,
      message: 'Order created and inventory updated.',
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await businessService.updateOrder(String(req.params.id), req.body);
    res.status(200).json({
      success: true,
      message: 'Order updated and inventory synchronized.',
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await businessService.deleteOrder(String(req.params.id));
    res.status(200).json({
      success: true,
      message: result.stockRestored
        ? 'Order deleted and inventory restored.'
        : 'Order deleted.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
