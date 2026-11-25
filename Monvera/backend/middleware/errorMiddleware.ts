import { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (
  err: Error & { statusCode?: number; code?: number; keyValue?: Record<string, unknown>; errors?: Record<string, { message: string }> },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err instanceof AppError ? err.statusCode : err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details: unknown = err instanceof AppError ? err.details : undefined;

  if (err.name === 'SyntaxError' && (err as Error & { type?: string }).type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON request body';
    details = undefined;
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    const fieldErrors = Object.values(err.errors).map((e) => e.message);
    message = fieldErrors[0] || 'Validation failed';
    details = fieldErrors;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier format';
  } else if (err.code === 11000 && err.keyValue) {
    statusCode = 409;
    const duplicateField = Object.keys(err.keyValue)[0];
    message = `A record with this ${duplicateField} already exists`;
  }

  if (statusCode >= 500) {
    console.error('[API Error]', err.name);
    message = 'Internal server error';
    details = undefined;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
};
