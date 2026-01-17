import swaggerJsdoc from 'swagger-jsdoc';

import { config } from './index.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Giga API Gateway',
      version: '1.0.0',
      description: 'API Gateway for Giga Platform services',
      contact: {
        name: 'Giga Platform Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Local development server',
      },
      {
        url: 'https://giga-giga-production.up.railway.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'apikey',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        apiKey: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/middleware/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
