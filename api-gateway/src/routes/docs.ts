import axios from 'axios';
import { Request, Response, Router } from 'express';

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Service documentation registry
const serviceDocsRegistry: Record<string, { name: string; url: string; description: string }> = {
  gateway: {
    name: 'API Gateway',
    url: '/api-docs',
    description: 'Main API Gateway - routing, health checks, and service orchestration',
  },
  social: {
    name: 'Social Service',
    url: config.services.social || '',
    description: 'Social media features - posts, comments, likes, feed, stories',
  },
  admin: {
    name: 'Admin Service',
    url: config.services.admin || '',
    description: 'Admin dashboard and management features',
  },
  search: {
    name: 'Search Service',
    url: config.services.search || '',
    description: 'Search functionality across hotels, products, drivers',
  },
  delivery: {
    name: 'Delivery Service',
    url: config.services.delivery || '',
    description: 'Delivery management, courier tracking, route optimization',
  },
  payment: {
    name: 'Payment Queue Service',
    url: config.services.payment || '',
    description: 'Payment processing, webhooks, refunds, settlements',
  },
  notifications: {
    name: 'Notifications Service',
    url: config.services.notifications || '',
    description: 'Push notifications, email, SMS, and alerts',
  },
  taxi: {
    name: 'Taxi Realtime Service',
    url: config.services.taxiRealtime || '',
    description: 'Real-time taxi tracking, driver locations, ride matching',
  },
};

/**
 * @openapi
 * /docs:
 *   get:
 *     summary: List all available service documentation
 *     description: Returns a list of all services with links to their API documentation
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: List of services with documentation links
 */
router.get('/', (_req: Request, res: Response) => {
  const baseUrl = `${_req.protocol}://${_req.get('host')}`;

  const services = Object.entries(serviceDocsRegistry).map(([key, service]) => ({
    id: key,
    name: service.name,
    description: service.description,
    docsUrl: key === 'gateway' ? `${baseUrl}/api-docs/` : `${baseUrl}/docs/${key}/`,
    apiPrefix:
      key === 'gateway'
        ? '/'
        : `/api/v1/${key === 'payment' ? 'payment-queue' : key === 'taxi' ? 'taxi-realtime' : key}`,
    status: service.url || key === 'gateway' ? 'available' : 'not configured',
  }));

  res.json({
    success: true,
    data: {
      title: 'Giga Platform API Documentation',
      description: 'Unified API documentation for all Giga platform services',
      services,
      quickLinks: {
        health: `${baseUrl}/health`,
        healthDetailed: `${baseUrl}/health/detailed`,
        gatewayDocs: `${baseUrl}/api-docs/`,
      },
    },
  });
});

/**
 * Proxy handler to fetch and serve service API docs
 */
const proxyServiceDocs = async (req: Request, res: Response, serviceKey: string) => {
  const service = serviceDocsRegistry[serviceKey];

  if (!service || !service.url) {
    res.status(404).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_FOUND',
        message: `Documentation for service '${serviceKey}' is not available`,
      },
    });
    return;
  }

  // Get the path after /docs/{service}
  const subPath = req.path.replace(`/${serviceKey}`, '') || '/';
  const targetUrl = `${service.url}/api-docs${subPath}`;

  try {
    logger.debug(`Proxying docs request to ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      timeout: 10000,
      responseType: 'arraybuffer',
      headers: {
        Accept: req.headers.accept || '*/*',
      },
    });

    // Forward content type
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.send(response.data);
  } catch (error) {
    logger.error(`Failed to fetch docs for ${serviceKey}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      targetUrl,
    });

    res.status(502).json({
      success: false,
      error: {
        code: 'DOCS_FETCH_ERROR',
        message: `Failed to fetch documentation from ${service.name}`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * @openapi
 * /docs/{service}:
 *   get:
 *     summary: Get API documentation for a specific service
 *     description: Proxies the Swagger UI documentation for the specified service
 *     tags:
 *       - Documentation
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [social, admin, search, delivery, payment, notifications, taxi]
 *     responses:
 *       200:
 *         description: Swagger UI HTML page
 *       404:
 *         description: Service not found
 */
router.get('/:service', (req: Request, res: Response) => {
  // Redirect to trailing slash for Swagger UI to work properly
  res.redirect(301, `/docs/${req.params.service}/`);
});

router.get('/:service/*', (req: Request, res: Response) => {
  const serviceKey = req.params.service!;
  proxyServiceDocs(req, res, serviceKey);
});

// Also handle the base path with trailing slash
router.get('/:service/', (req: Request, res: Response) => {
  const serviceKey = req.params.service!;
  proxyServiceDocs(req, res, serviceKey);
});

export const docsRouter = router;
