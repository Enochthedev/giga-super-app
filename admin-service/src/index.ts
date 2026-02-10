import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import winston from 'winston';

// Import routes
import { swaggerSpec } from './config/swagger';
import adminPanelRoutes from './routes/admin-panel';
import advertisementsRoutes from './routes/advertisements';
import businessModulesRoutes from './routes/business-modules';
import dashboardRoutes from './routes/dashboard';
import healthRoutes from './routes/health';
import managersRoutes from './routes/managers';
import nipostRoutes from './routes/nipost';
import postalMonitoringRoutes from './routes/postal-monitoring';
import usersRoutes from './routes/users';

// Import config

dotenv.config();

// Configuration
const PORT = parseInt(process.env.PORT ?? process.env.ADMIN_SERVICE_PORT ?? '3005', 10);

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const app: Application = express();

// Trust first proxy (Railway/Docker/nginx) - required for express-rate-limit
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Swagger documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Admin Service API Docs',
  })
);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check routes
app.use('/health', healthRoutes);
app.use('/api', healthRoutes);

// API Routes
app.use('/api/admin', nipostRoutes);
app.use('/api/admin', adminPanelRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', businessModulesRoutes);
app.use('/api/postal-monitoring', postalMonitoringRoutes);
app.use('/api/operations', postalMonitoringRoutes); // Alias for postal-monitoring
app.use('/api/managers', managersRoutes);
app.use('/api/ads', advertisementsRoutes);
app.use('/api/v1/ads', advertisementsRoutes); // Support v1 API path

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Admin Service started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '2.2.0',
    modules: ['NIPOST Admin', 'Dashboard Analytics', 'Business Modules', 'User Management'],
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
