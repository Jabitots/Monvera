import { Router } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorMiddleware.js';
import {
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  updateOrder,
} from '../controllers/orderController.js';
import {
  validateOrderPayload,
  validateOrderUpdatePayload,
} from '../middleware/validationMiddleware.js';

const router = Router();
router.param('id', (req, _res, next, id) => next(mongoose.isObjectIdOrHexString(id) ? undefined : new AppError('Invalid resource identifier format', 400)));

router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', validateOrderPayload, createOrder);
router.put('/:id', validateOrderUpdatePayload, updateOrder);
router.patch('/:id', validateOrderUpdatePayload, updateOrder);
router.delete('/:id', deleteOrder);

export default router;
