import { NextFunction, Request, Response } from 'express';
import * as businessService from '../services/businessService.js';

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await businessService.listProducts({
      search: String(req.query.search || ''),
      category: String(req.query.category || ''),
      sort: String(req.query.sort || 'newest'),
      includeArchived: req.query.includeArchived === 'true',
      page: Math.max(1, Number(req.query.page || 1)),
      limit: Math.min(100, Math.max(1, Number(req.query.limit || 24))),
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await businessService.getProductById(String(req.params.id));
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await businessService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: 'Product added to catalog.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await businessService.updateProduct(
      String(req.params.id),
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Product updated.',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const archiveOnly = req.query.mode === 'archive';
    const result = await businessService.deleteOrArchiveProduct(
      String(req.params.id),
      archiveOnly
    );
    res.status(200).json({
      success: true,
      message:
        result.action === 'archived'
          ? 'Product archived to preserve historical order records.'
          : 'Product removed from catalog.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
