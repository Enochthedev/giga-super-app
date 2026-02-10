import { Request, Response, Router } from 'express';

const router = Router();

/**
 * GET /health
 * Service health check
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'admin-service',
    timestamp: new Date().toISOString(),
    version: '2.4.0-complete',
    deployment: 'railway-modular-architecture',
    features: {
      rbac: 'enabled',
      multiLayerSecurity: 'active',
      granularPermissions: 'active',
      allEndpoints: 'complete',
    },
  });
});

/**
 * GET /api/status
 * Service status and available endpoints
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'running',
    service: 'admin-service',
    version: '2.4.0-complete',
    timestamp: new Date().toISOString(),
    rbac: {
      enabled: true,
      layers: ['application', 'database'],
      features: ['hierarchical-access', 'role-based', 'permission-based'],
    },
    modules: {
      nipost: 'NIPOST Admin Management',
      dashboard: 'Dashboard Analytics',
      businessModules: 'Business Module Management (Complete)',
      users: 'User Management',
      settings: 'Platform Settings',
      audit: 'Audit Trail',
    },
    endpoints: {
      nipost: [
        '/api/admin/national/dashboard',
        '/api/admin/national/financial-summary',
        '/api/admin/national/states',
        '/api/admin/state/:stateId/dashboard',
        '/api/admin/state/:stateId/branches',
        '/api/admin/state/:stateId/financial-summary',
        '/api/admin/branch/:branchId/dashboard',
        '/api/admin/branch/:branchId/transactions',
        '/api/admin/branch/:branchId/analytics',
      ],
      dashboard: [
        '/api/dashboard/stats',
        '/api/dashboard/sales-comparison',
        '/api/dashboard/category-breakdown',
      ],
      businessModules: [
        '/api/ecommerce/traders',
        '/api/ecommerce/traders/:id',
        'POST /api/ecommerce/traders',
        '/api/taxi/drivers',
        '/api/taxi/drivers/:id',
        '/api/hotel/hotels',
        '/api/hotel/hotels/:id',
        '/api/media/content',
        '/api/media/content/:id',
      ],
      users: ['/api/admin/users', '/api/admin/users/:userId'],
    },
  });
});

export default router;
