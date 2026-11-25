import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorMiddleware.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ORDER_STATUSES = ['Pending', 'Processing', 'Completed', 'Cancelled'];

export const validateProductPayload = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return next(new AppError('A JSON object is required.', 400));
  const { productName, description, category, price, stockQuantity } = req.body;
  const errors: string[] = [];

  if (!productName || typeof productName !== 'string' || productName.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long.');
  }
  if (!description || typeof description !== 'string' || description.trim().length < 4) {
    errors.push('Description must be at least 4 characters long.');
  }
  if (!category || typeof category !== 'string' || category.trim().length < 2) {
    errors.push('Category is required.');
  }

  const parsedPrice = Number(price);
  if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
    errors.push('Price must be a positive number greater than 0.');
  }

  const parsedStock = Number(stockQuantity);
  if (
    Number.isNaN(parsedStock) ||
    !Number.isInteger(parsedStock) ||
    parsedStock < 0
  ) {
    errors.push('Stock quantity must be a whole number of 0 or greater.');
  }

  if (errors.length > 0) {
    return next(new AppError(errors[0], 400, errors));
  }

  req.body.productName = productName.trim();
  req.body.description = description.trim();
  req.body.category = category.trim();
  req.body.price = Number(parsedPrice.toFixed(2));
  req.body.stockQuantity = parsedStock;
  if (typeof req.body.image === 'string') {
    req.body.image = req.body.image.trim();
  }

  next();
};

export const validateCustomerPayload = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return next(new AppError('A JSON object is required.', 400));
  const { fullName, email, contactNumber, address } = req.body;
  const errors: string[] = [];

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push('A valid email address is required.');
  }
  if (
    !contactNumber ||
    typeof contactNumber !== 'string' ||
    contactNumber.trim().length < 5
  ) {
    errors.push('Contact number must be at least 5 characters long.');
  }
  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    errors.push('Complete address must be at least 5 characters long.');
  }

  if (errors.length > 0) {
    return next(new AppError(errors[0], 400, errors));
  }

  req.body.fullName = fullName.trim();
  req.body.email = email.trim().toLowerCase();
  req.body.contactNumber = contactNumber.trim();
  req.body.address = address.trim();

  next();
};

export const validateCustomerPatch = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body;
  const allowed = ['fullName', 'email', 'contactNumber', 'address', 'isArchived'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !allowed.some((key) => key in body)) {
    return next(new AppError('Provide at least one valid customer field to update.', 400));
  }
  if ('fullName' in body && (typeof body.fullName !== 'string' || body.fullName.trim().length < 2)) return next(new AppError('Full name must be at least 2 characters long.', 400));
  if ('email' in body && (typeof body.email !== 'string' || !EMAIL_REGEX.test(body.email.trim()))) return next(new AppError('A valid email address is required.', 400));
  if ('contactNumber' in body && (typeof body.contactNumber !== 'string' || body.contactNumber.trim().length < 5)) return next(new AppError('Contact number must be at least 5 characters long.', 400));
  if ('address' in body && (typeof body.address !== 'string' || body.address.trim().length < 5)) return next(new AppError('Complete address must be at least 5 characters long.', 400));
  if ('isArchived' in body && typeof body.isArchived !== 'boolean') return next(new AppError('isArchived must be a boolean.', 400));
  for (const key of ['fullName', 'contactNumber', 'address'] as const) if (typeof body[key] === 'string') body[key] = body[key].trim();
  if (typeof body.email === 'string') body.email = body.email.trim().toLowerCase();
  next();
};

export const validateProductPatch = (req: Request, _res: Response, next: NextFunction): void => {
  const body = req.body;
  const allowed = ['productName', 'description', 'category', 'price', 'stockQuantity', 'image', 'isArchived'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !allowed.some((key) => key in body)) return next(new AppError('Provide at least one valid product field to update.', 400));
  for (const [key, min, max] of [['productName', 2, 120], ['description', 4, 1200], ['category', 2, 60]] as const) {
    if (key in body && (typeof body[key] !== 'string' || body[key].trim().length < min || body[key].trim().length > max)) return next(new AppError(`Invalid ${key} value.`, 400));
    if (typeof body[key] === 'string') body[key] = body[key].trim();
  }
  if ('price' in body && (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0)) return next(new AppError('Price must be a positive number greater than 0.', 400));
  if ('stockQuantity' in body && (!Number.isInteger(Number(body.stockQuantity)) || Number(body.stockQuantity) < 0)) return next(new AppError('Stock quantity must be a whole number of 0 or greater.', 400));
  if ('isArchived' in body && typeof body.isArchived !== 'boolean') return next(new AppError('isArchived must be a boolean.', 400));
  if ('price' in body) body.price = Number(Number(body.price).toFixed(2));
  if ('stockQuantity' in body) body.stockQuantity = Number(body.stockQuantity);
  next();
};

export const validateOrderPayload = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return next(new AppError('A JSON object is required.', 400));
  const { customerId, orderItems, status } = req.body;
  const errors: string[] = [];

  if (!customerId || typeof customerId !== 'string') {
    errors.push('A valid customer must be selected.');
  }

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    errors.push('At least one product item is required to create an order.');
  } else {
    for (const item of orderItems) {
      if (!item.productId || typeof item.productId !== 'string') {
        errors.push('Each order item must reference a valid product.');
        break;
      }
      const qty = Number(item.quantity);
      if (Number.isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
        errors.push('Each order item quantity must be a whole number of at least 1.');
        break;
      }
    }
  }

  if (status !== undefined && !VALID_ORDER_STATUSES.includes(status)) {
    errors.push(
      `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}.`
    );
  }
  if (req.body.orderDate !== undefined && (typeof req.body.orderDate !== 'string' || !Number.isFinite(Date.parse(req.body.orderDate)))) errors.push('Order date must be a valid date.');

  if (errors.length > 0) {
    return next(new AppError(errors[0], 400, errors));
  }

  next();
};

export const validateOrderUpdatePayload = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return next(new AppError('A JSON object is required.', 400));
  const { orderItems, status } = req.body;
  const errors: string[] = [];
  if (!['customerId', 'orderItems', 'status', 'orderDate', 'notes'].some((key) => key in req.body)) errors.push('Provide at least one valid order field to update.');

  if (status !== undefined && !VALID_ORDER_STATUSES.includes(status)) {
    errors.push(
      `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(', ')}.`
    );
  }
  if (req.body.customerId !== undefined && typeof req.body.customerId !== 'string') errors.push('Customer reference must be an ObjectId string.');
  if (req.body.orderDate !== undefined && (typeof req.body.orderDate !== 'string' || !Number.isFinite(Date.parse(req.body.orderDate)))) errors.push('Order date must be a valid date.');
  if (req.body.notes !== undefined && (typeof req.body.notes !== 'string' || req.body.notes.length > 500)) errors.push('Order notes must be text of at most 500 characters.');

  if (orderItems !== undefined) {
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      errors.push('An order must contain at least one item.');
    } else {
      for (const item of orderItems) {
        if (!item.productId || typeof item.productId !== 'string') {
          errors.push('Each order item must reference a valid product.');
          break;
        }
        const qty = Number(item.quantity);
        if (Number.isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
          errors.push('Each order item quantity must be a whole number of at least 1.');
          break;
        }
      }
    }
  }

  if (errors.length > 0) {
    return next(new AppError(errors[0], 400, errors));
  }

  next();
};
