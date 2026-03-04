import { Router } from 'express';
import adminRouter from './admin';
import paymentsRouter from './payments';
import walletRouter from './wallet';
import webhooksRouter from './webhooks';

const router = Router();

// Mount v1 routes
router.use('/payments', paymentsRouter);
router.use('/webhooks', webhooksRouter);
router.use('/admin/payments', adminRouter);
router.use('/wallet', walletRouter);

export default router;
