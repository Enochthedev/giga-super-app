/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'social-service',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (req: Request, res: Response) => {
  const { supabase } = req.app.locals;

  if (!supabase) {
    return res.status(503).json({
      status: 'not_ready',
      service: 'social-service',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(200).json({
    status: 'ready',
    service: 'social-service',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

export default router;
