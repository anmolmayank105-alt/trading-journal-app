/**
 * Price Alert Routes
 */

import { Router } from 'express';
import { priceAlertController } from '../controllers';
import { authenticate } from '../middleware';

const router = Router();

// All routes require authentication
router.use(authenticate as any);

router.get('/', priceAlertController.getAlerts.bind(priceAlertController) as any);
router.get('/:id', priceAlertController.getAlertById.bind(priceAlertController) as any);
router.post('/', priceAlertController.createAlert.bind(priceAlertController) as any);
router.put('/:id', priceAlertController.updateAlert.bind(priceAlertController) as any);
router.post('/:id/cancel', priceAlertController.cancelAlert.bind(priceAlertController) as any);
router.delete('/:id', priceAlertController.deleteAlert.bind(priceAlertController) as any);

export default router;
