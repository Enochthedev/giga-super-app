import { createServer } from 'http';

import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import helmet from 'helmet';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import winston from 'winston';

dotenv.config();

// Configuration
const PORT = parseInt(process.env.PORT ?? process.env.TAXI_REALTIME_SERVICE_PORT ?? '3006', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Redis clients for Socket.IO adapter
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();

// Express app
const app: Application = express();
const httpServer = createServer(app);

// Socket.IO server with Redis adapter
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  adapter: createAdapter(pubClient, subClient),
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'taxi-realtime-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Active connections tracking
const activeDrivers = new Map<string, string>(); // driverId -> socketId
const activeRiders = new Map<string, string>(); // riderId -> socketId
const driverLocations = new Map<string, { lat: number; lng: number; timestamp: number }>();

// Socket.IO authentication middleware
io.use(async (socket: Socket, next) => {
  try {
    const token =
      socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.userId = decoded.sub || decoded.userId;
    socket.data.role = decoded.role || 'rider';

    logger.info('Socket authenticated', {
      socketId: socket.id,
      userId: socket.data.userId,
      role: socket.data.role,
    });

    next();
  } catch (error: any) {
    logger.error('Socket authentication failed', { error: error.message });
    next(new Error('Invalid token'));
  }
});

// Rate limiting per socket
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;

const checkRateLimit = (socketId: string): boolean => {
  const now = Date.now();
  const requests = rateLimitMap.get(socketId) || [];
  const recentRequests = requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(socketId, recentRequests);
  return true;
};

// Socket.IO connection handler
io.on('connection', (socket: Socket) => {
  const { userId } = socket.data;
  const { role } = socket.data;

  logger.info('Client connected', { socketId: socket.id, userId, role });

  // Register user
  if (role === 'driver') {
    activeDrivers.set(userId, socket.id);
    socket.join('drivers');
  } else {
    activeRiders.set(userId, socket.id);
    socket.join('riders');
  }

  // Driver location update
  socket.on('driver:location:update', async (data: { lat: number; lng: number }) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }

    if (role !== 'driver') {
      socket.emit('error', { message: 'Only drivers can update location' });
      return;
    }

    try {
      driverLocations.set(userId, {
        lat: data.lat,
        lng: data.lng,
        timestamp: Date.now(),
      });

      // Update driver location in database
      await supabase
        .from('taxi_drivers')
        .update({
          current_lat: data.lat,
          current_lng: data.lng,
          last_location_update: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Broadcast to riders tracking this driver
      socket.broadcast.to(`tracking:${userId}`).emit('driver:location', {
        driverId: userId,
        lat: data.lat,
        lng: data.lng,
        timestamp: Date.now(),
      });

      logger.debug('Driver location updated', { driverId: userId, lat: data.lat, lng: data.lng });
    } catch (error: any) {
      logger.error('Failed to update driver location', { error: error.message, driverId: userId });
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  // Rider requests nearby drivers
  socket.on(
    'rider:request:nearby-drivers',
    async (data: { lat: number; lng: number; radius: number }) => {
      if (role !== 'rider') {
        socket.emit('error', { message: 'Only riders can request nearby drivers' });
        return;
      }

      try {
        // Calculate nearby drivers (simplified - in production use PostGIS)
        const nearbyDrivers = Array.from(driverLocations.entries())
          .filter(([driverId, location]) => {
            const distance = calculateDistance(data.lat, data.lng, location.lat, location.lng);
            return distance <= data.radius && Date.now() - location.timestamp < 60000; // Active in last minute
          })
          .map(([driverId, location]) => ({
            driverId,
            lat: location.lat,
            lng: location.lng,
            distance: calculateDistance(data.lat, data.lng, location.lat, location.lng),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10); // Return top 10 nearest

        socket.emit('rider:nearby-drivers', { drivers: nearbyDrivers });

        logger.info('Nearby drivers sent', { riderId: userId, count: nearbyDrivers.length });
      } catch (error: any) {
        logger.error('Failed to find nearby drivers', { error: error.message });
        socket.emit('error', { message: 'Failed to find nearby drivers' });
      }
    }
  );

  // Trip request
  socket.on(
    'trip:request',
    async (data: {
      driverId: string;
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
    }) => {
      if (role !== 'rider') {
        socket.emit('error', { message: 'Only riders can request trips' });
        return;
      }

      try {
        // Create trip in database
        const { data: trip, error } = await supabase
          .from('taxi_trips')
          .insert({
            rider_id: userId,
            driver_id: data.driverId,
            pickup_lat: data.pickupLat,
            pickup_lng: data.pickupLng,
            dropoff_lat: data.dropoffLat,
            dropoff_lng: data.dropoffLng,
            status: 'requested',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        // Notify driver
        const driverSocketId = activeDrivers.get(data.driverId);
        if (driverSocketId) {
          io.to(driverSocketId).emit('trip:new-request', {
            tripId: trip.id,
            riderId: userId,
            pickupLat: data.pickupLat,
            pickupLng: data.pickupLng,
            dropoffLat: data.dropoffLat,
            dropoffLng: data.dropoffLng,
          });
        }

        socket.emit('trip:request:sent', { tripId: trip.id });

        logger.info('Trip requested', {
          tripId: trip.id,
          riderId: userId,
          driverId: data.driverId,
        });
      } catch (error: any) {
        logger.error('Failed to create trip request', { error: error.message });
        socket.emit('error', { message: 'Failed to create trip request' });
      }
    }
  );

  // Trip accept
  socket.on('trip:accept', async (data: { tripId: string }) => {
    if (role !== 'driver') {
      socket.emit('error', { message: 'Only drivers can accept trips' });
      return;
    }

    try {
      // Update trip status
      const { data: trip, error } = await supabase
        .from('taxi_trips')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', data.tripId)
        .eq('driver_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Notify rider
      const riderSocketId = activeRiders.get(trip.rider_id);
      if (riderSocketId) {
        io.to(riderSocketId).emit('trip:accepted', {
          tripId: trip.id,
          driverId: userId,
        });
      }

      socket.emit('trip:accept:confirmed', { tripId: trip.id });

      logger.info('Trip accepted', { tripId: trip.id, driverId: userId });
    } catch (error: any) {
      logger.error('Failed to accept trip', { error: error.message });
      socket.emit('error', { message: 'Failed to accept trip' });
    }
  });

  // Trip status update
  socket.on('trip:status:update', async (data: { tripId: string; status: string }) => {
    try {
      const { data: trip, error } = await supabase
        .from('taxi_trips')
        .update({ status: data.status, updated_at: new Date().toISOString() })
        .eq('id', data.tripId)
        .select()
        .single();

      if (error) throw error;

      // Notify both driver and rider
      const driverSocketId = activeDrivers.get(trip.driver_id);
      const riderSocketId = activeRiders.get(trip.rider_id);

      const statusUpdate = {
        tripId: trip.id,
        status: data.status,
        timestamp: Date.now(),
      };

      if (driverSocketId && role !== 'driver') {
        io.to(driverSocketId).emit('trip:status', statusUpdate);
      }
      if (riderSocketId && role !== 'rider') {
        io.to(riderSocketId).emit('trip:status', statusUpdate);
      }

      socket.emit('trip:status:updated', statusUpdate);

      logger.info('Trip status updated', { tripId: trip.id, status: data.status });
    } catch (error: any) {
      logger.error('Failed to update trip status', { error: error.message });
      socket.emit('error', { message: 'Failed to update trip status' });
    }
  });

  // Track driver
  socket.on('rider:track:driver', (data: { driverId: string }) => {
    socket.join(`tracking:${data.driverId}`);
    logger.info('Rider tracking driver', { riderId: userId, driverId: data.driverId });
  });

  // Stop tracking driver
  socket.on('rider:untrack:driver', (data: { driverId: string }) => {
    socket.leave(`tracking:${data.driverId}`);
    logger.info('Rider stopped tracking driver', { riderId: userId, driverId: data.driverId });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (role === 'driver') {
      activeDrivers.delete(userId);
      driverLocations.delete(userId);
    } else {
      activeRiders.delete(userId);
    }

    rateLimitMap.delete(socket.id);

    logger.info('Client disconnected', { socketId: socket.id, userId, role });
  });
});

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Taxi Real-Time Service started`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown');

  io.close();
  httpServer.close();
  await pubClient.quit();
  await subClient.quit();

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
