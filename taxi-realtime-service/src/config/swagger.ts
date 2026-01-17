import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Taxi Realtime Service API',
      version: '1.0.0',
      description: `
## Taxi Realtime Service API

This service handles real-time taxi tracking and communication using WebSockets (Socket.IO).

### Features
- **Driver Tracking**: Real-time location updates
- **Trip Management**: Request across WebSocket
- **Rider/Driver Communication**

Note: Most functionality is exposed via Socket.IO events, not REST endpoints.
      `,
      contact: {
        name: 'Giga Platform Team',
        email: 'api@giga.com',
      },
    },
    servers: [
      {
        url: '/api/v1/taxi/realtime',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/index.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
