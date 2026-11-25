import { NextFunction, Request, Response } from 'express';
import * as businessService from '../services/businessService.js';

export const getCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await businessService.listCustomers({
      search: String(req.query.search || ''),
      includeArchived: req.query.includeArchived === 'true',
      page: Math.max(1, Number(req.query.page || 1)),
      limit: Math.min(100, Math.max(1, Number(req.query.limit || 24))),
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profile = await businessService.getCustomerProfile(String(req.params.id));
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await businessService.createCustomer(req.body);
    res.status(201).json({
      success: true,
      message: 'Customer registered.',
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await businessService.updateCustomer(
      String(req.params.id),
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Customer record updated.',
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const archiveOnly = req.query.mode === 'archive';
    const result = await businessService.deleteOrArchiveCustomer(
      String(req.params.id),
      archiveOnly
    );
    res.status(200).json({
      success: true,
      message:
        result.action === 'archived'
          ? 'Customer archived while preserving order history.'
          : 'Customer deleted.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
