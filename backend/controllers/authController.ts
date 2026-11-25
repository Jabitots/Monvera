import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorMiddleware.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import * as authService from '../services/authService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return next(new AppError('Please enter a valid email address.', 400));
    }
    if (!password || typeof password !== 'string') {
      return next(new AppError('Password is required.', 400));
    }
    const result = await authService.loginUser({ email, password });
    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, email, password, role } = req.body;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return next(new AppError('Full name must be at least 2 characters.', 400));
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return next(new AppError('Please enter a valid email address.', 400));
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return next(
        new AppError('Password must be at least 8 characters long.', 400)
      );
    }

    const result = await authService.registerUser({
      fullName,
      email,
      password,
      role,
    });
    res.status(201).json({
      success: true,
      message: 'Account created and signed in.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated.', 401));
    }
    res.status(200).json({
      success: true,
      data: { user: req.user },
    });
  } catch (err) {
    next(err);
  }
};
