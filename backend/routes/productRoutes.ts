import { Router } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorMiddleware.js';
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from '../controllers/productController.js';
import { validateProductPatch, validateProductPayload } from '../middleware/validationMiddleware.js';

const router = Router();
router.param('id', (req, _res, next, id) => next(mongoose.isObjectIdOrHexString(id) ? undefined : new AppError('Invalid resource identifier format', 400)));

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', validateProductPayload, createProduct);
router.put('/:id', validateProductPayload, updateProduct);
router.patch('/:id', validateProductPatch, updateProduct);
router.delete('/:id', deleteProduct);

export default router;
