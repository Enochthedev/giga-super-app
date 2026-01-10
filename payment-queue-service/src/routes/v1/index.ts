import { Router } from 'express';
import paymentsRouter from './payments';
import webhooksRouter from './webhooks';
import adminRouter from './admin';

const router = Router();

// Mount v1 routes
router.use('/payments', paymentsRouter);
router.use('/webhooks', webhooksRouter);
router.use('/admin/payments', adminRouter);

export default router;
