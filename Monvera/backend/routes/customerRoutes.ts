import { Router } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorMiddleware.js';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
} from '../controllers/customerController.js';
import { validateCustomerPatch, validateCustomerPayload } from '../middleware/validationMiddleware.js';

const router = Router();
router.param('id', (req, _res, next, id) => next(mongoose.isObjectIdOrHexString(id) ? undefined : new AppError('Invalid resource identifier format', 400)));

router.get('/', getCustomers);
router.get('/:id', getCustomer);
router.post('/', validateCustomerPayload, createCustomer);
router.put('/:id', validateCustomerPayload, updateCustomer);
router.patch('/:id', validateCustomerPatch, updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
