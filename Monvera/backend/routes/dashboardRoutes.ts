import { Router } from 'express';
import {
  getRecentOrders,
  getSales,
  getStats,
  getTopProducts,
} from '../controllers/dashboardController.js';

const router = Router();

router.get('/stats', getStats);
router.get('/sales', getSales);
router.get('/recent-orders', getRecentOrders);
router.get('/top-products', getTopProducts);

export default router;
