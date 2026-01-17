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
    jsonUrl: `${baseUrl}/docs/${key}/json`,
    directUrl: service.url || '', // Direct URL to the service's own /api-docs endpoint
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
      note: 'For direct browser access to service documentation, ensure your browser has network access to the internal service URLs.',
      services,
      quickLinks: {
        health: `${baseUrl}/health`,
        healthDetailed: `${baseUrl}/health/detailed`,
        gatewayDocs: `${baseUrl}/api-docs/`,
        allSpecs: `${baseUrl}/docs/specs`,
      },
    },
  });
});

/**
 * @openapi
 * /docs/specs:
 *   get:
 *     summary: Get all OpenAPI specifications
 *     description: Returns links to all service OpenAPI JSON specs
 *     tags:
 *       - Documentation
 */
router.get('/specs', async (_req: Request, res: Response) => {
  const baseUrl = `${_req.protocol}://${_req.get('host')}`;

  const specs: Record<string, { name: string; jsonUrl: string; status: string }> = {};

  for (const [key, service] of Object.entries(serviceDocsRegistry)) {
    if (key === 'gateway') {
      specs[key] = {
        name: service.name,
        jsonUrl: `${baseUrl}/docs/gateway/json`,
        status: 'available',
      };
    } else if (service.url) {
      specs[key] = {
        name: service.name,
        jsonUrl: `${baseUrl}/docs/${key}/json`,
        status: 'available',
      };
    }
  }

  res.json({
    success: true,
    data: {
      title: 'OpenAPI Specifications',
      specs,
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
      timeout: 15000,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: status => status < 400,
      headers: {
        Accept: req.headers.accept || '*/*',
        'User-Agent': req.headers['user-agent'] || 'Giga-API-Gateway/1.0',
      },
    });

    // Forward relevant headers
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Remove CSP header to allow Swagger UI to work properly
    res.removeHeader('Content-Security-Policy');

    res.send(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 301) {
      // Handle redirect manually if needed
      const { location } = error.response.headers;
      if (location) {
        res.redirect(301, location.replace('/api-docs', `/docs/${serviceKey}`));
        return;
      }
    }

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
 * Fetch OpenAPI JSON spec from a service
 */
const fetchServiceSpec = async (req: Request, res: Response, serviceKey: string) => {
  const service = serviceDocsRegistry[serviceKey];

  if (!service) {
    res.status(404).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_FOUND',
        message: `Service '${serviceKey}' not found`,
      },
    });
    return;
  }

  // Handle gateway special case
  if (serviceKey === 'gateway') {
    // Import swaggerSpec from the config
    try {
      const { swaggerSpec } = await import('../config/swagger.js');
      res.json(swaggerSpec);
    } catch {
      res.status(500).json({
        success: false,
        error: {
          code: 'SPEC_LOAD_ERROR',
          message: 'Failed to load gateway OpenAPI spec',
        },
      });
    }
    return;
  }

  if (!service.url) {
    res.status(404).json({
      success: false,
      error: {
        code: 'SERVICE_NOT_CONFIGURED',
        message: `Service '${serviceKey}' is not configured`,
      },
    });
    return;
  }

  const targetUrl = `${service.url}/api-docs.json`;

  try {
    logger.debug(`Fetching OpenAPI spec from ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      timeout: 10000,
      headers: {
        Accept: 'application/json',
      },
    });

    res.json(response.data);
  } catch (error) {
    logger.error(`Failed to fetch spec for ${serviceKey}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      targetUrl,
    });

    res.status(502).json({
      success: false,
      error: {
        code: 'SPEC_FETCH_ERROR',
        message: `Failed to fetch OpenAPI spec from ${service.name}`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * @openapi
 * /docs/{service}/json:
 *   get:
 *     summary: Get OpenAPI JSON specification for a service
 *     description: Returns the OpenAPI JSON spec for the specified service
 *     tags:
 *       - Documentation
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [gateway, social, admin, search, delivery, payment, notifications, taxi]
 *     responses:
 *       200:
 *         description: OpenAPI JSON specification
 *       404:
 *         description: Service not found
 */
router.get('/:service/json', (req: Request, res: Response) => {
  const serviceKey = req.params.service!;
  fetchServiceSpec(req, res, serviceKey);
});

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
