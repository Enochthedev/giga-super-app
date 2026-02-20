/**
 * Health check routes for Hotels Service
 */

import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'hotels-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.get('/ready', (_req, res) => {
  res.json({ ready: true });
});

router.get('/live', (_req, res) => {
  res.json({ live: true });
});

export { router as healthRouter };
