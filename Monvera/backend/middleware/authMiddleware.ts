import { NextFunction, Request, Response } from 'express';
import { AppError } from './errorMiddleware.js';
import { getUserById, SafeUserDTO, verifyAuthToken } from '../services/authService.js';

export interface AuthenticatedRequest extends Request {
  user?: SafeUserDTO;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Please sign in.', 401);
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError('Authentication required. Please sign in.', 401);
    }
    const payload = verifyAuthToken(token);
    const user = await getUserById(payload.sub);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
