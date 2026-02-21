/**
 * Hotels Service - Comprehensive hotel and booking management
 * Handles hotel search, details, bookings, reviews, and favorites
 */

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { bookingsRouter } from './routes/bookings.js';
import { favoritesRouter } from './routes/favorites.js';
import { healthRouter } from './routes/health.js';
import { hotelsRouter } from './routes/hotels.js';
import { managementRouter } from './routes/management.js';
import { reviewsRouter } from './routes/reviews.js';

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging and user context extraction from gateway headers
app.use((req: any, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  // Extract user context from API Gateway headers
  // The gateway validates the JWT and forwards user info
  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    req.user = {
      id: userId,
      email: (req.headers['x-user-email'] as string) || '',
      role: (req.headers['x-user-role'] as string) || 'user',
    };
    console.log(`[Auth] User context from gateway: ${userId}`);
  }

  // Store auth token if present
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    req.authToken = authHeader.substring(7);
  }

  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/hotels', hotelsRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/favorites', favoritesRouter);
app.use('/api/v1/management', managementRouter);
app.use('/api/v1/reviews', reviewsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏨 Hotels Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Hotels: http://localhost:${PORT}/api/v1/hotels`);
  console.log(`   Bookings: http://localhost:${PORT}/api/v1/bookings`);
  console.log(`   Favorites: http://localhost:${PORT}/api/v1/favorites`);
  console.log(`   Management: http://localhost:${PORT}/api/v1/management`);
  console.log(`   Reviews: http://localhost:${PORT}/api/v1/reviews`);
});

export default app;
