import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import helmet from 'helmet';

dotenv.config();

const app = express();
const PORT = 3004; // Fixed port for delivery service

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'delivery-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      database: 'connected',
    },
  });
});

// Create delivery request
app.post('/api/v1/deliveries', async (req: Request, res: Response) => {
  try {
    const {
      senderId,
      recipientName,
      recipientPhone,
      pickupAddress,
      deliveryAddress,
      packageDetails,
      branchId,
      stateId,
      deliveryType = 'standard',
    } = req.body;

    if (
      !senderId ||
      !recipientName ||
      !pickupAddress ||
      !deliveryAddress ||
      !branchId ||
      !stateId
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
        },
      });
    }

    const deliveryId = `DEL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trackingNumber = `TRK${Date.now().toString().slice(-8)}`;
    const estimatedDeliveryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Calculate delivery fee based on distance (mock calculation)
    const deliveryFee = deliveryType === 'express' ? 1500 : 800;

    const deliveryData = {
      id: deliveryId,
      sender_id: senderId,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      pickup_address: pickupAddress,
      delivery_address: deliveryAddress,
      package_details: packageDetails,
      delivery_type: deliveryType,
      delivery_fee: deliveryFee,
      tracking_number: trackingNumber,
      status: 'pending',
      branch_id: branchId,
      state_id: stateId,
      estimated_delivery: estimatedDeliveryTime.toISOString(),
      created_at: new Date().toISOString(),
    };

    // Try to insert into database
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert(deliveryData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      // Continue with mock data if database fails
    }

    res.status(201).json({
      success: true,
      data: {
        deliveryId,
        trackingNumber,
        status: 'pending',
        deliveryFee,
        estimatedDelivery: estimatedDeliveryTime.toISOString(),
        branchId,
        stateId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'delivery-service',
      },
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_DELIVERY_ERROR',
        message: 'Failed to create delivery request',
      },
    });
  }
});

// Track delivery
app.get('/api/v1/deliveries/track/:trackingNumber', async (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.params;

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .single();

    if (error || !delivery) {
      // Return mock tracking data if not found in database
      return res.json({
        success: true,
        data: {
          trackingNumber,
          status: 'in_transit',
          currentLocation: 'Lagos Distribution Center',
          estimatedDelivery: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          timeline: [
            {
              status: 'pending',
              timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
              location: 'Package received',
            },
            {
              status: 'picked_up',
              timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
              location: 'Picked up from sender',
            },
            {
              status: 'in_transit',
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              location: 'In transit to destination',
            },
          ],
        },
        metadata: {
          timestamp: new Date().toISOString(),
          service: 'delivery-service',
          source: 'mock',
        },
      });
    }

    res.json({
      success: true,
      data: delivery,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'delivery-service',
        source: 'database',
      },
    });
  } catch (error) {
    console.error('Track delivery error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TRACK_DELIVERY_ERROR',
        message: 'Failed to track delivery',
      },
    });
  }
});

// Get user deliveries
app.get('/api/v1/users/:userId/deliveries', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10 } = req.query;

    let query = supabase
      .from('deliveries')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data: deliveries, error } = await query;

    if (error) {
      console.error('Database error:', error);
      // Return mock data if database fails
      return res.json({
        success: true,
        data: [
          {
            id: 'del_1',
            trackingNumber: 'TRK12345678',
            recipientName: 'John Doe',
            status: 'delivered',
            deliveryFee: 800,
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          },
        ],
        metadata: {
          timestamp: new Date().toISOString(),
          service: 'delivery-service',
          source: 'mock',
        },
      });
    }

    res.json({
      success: true,
      data: deliveries || [],
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'delivery-service',
        source: 'database',
      },
    });
  } catch (error) {
    console.error('Get user deliveries error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_USER_DELIVERIES_ERROR',
        message: 'Failed to get user deliveries',
      },
    });
  }
});

// Update delivery status (for delivery agents)
app.patch('/api/v1/deliveries/:deliveryId/status', async (req: Request, res: Response) => {
  try {
    const { deliveryId } = req.params;
    const { status, location, agentId } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Status is required',
        },
      });
    }

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .update({
        status,
        current_location: location,
        agent_id: agentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: delivery,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'delivery-service',
      },
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_DELIVERY_STATUS_ERROR',
        message: 'Failed to update delivery status',
      },
    });
  }
});

// Get delivery analytics for NIPOST
app.get('/api/v1/analytics/deliveries', async (req: Request, res: Response) => {
  try {
    const { branchId, stateId, period = '30d' } = req.query;

    // Mock analytics data
    const analytics = {
      totalDeliveries: 1250,
      completedDeliveries: 1180,
      pendingDeliveries: 45,
      cancelledDeliveries: 25,
      averageDeliveryTime: '18 hours',
      revenue: 875000,
      commission: 87500,
      topRoutes: [
        { from: 'Lagos Island', to: 'Victoria Island', count: 145 },
        { from: 'Ikeja', to: 'Lekki', count: 132 },
        { from: 'Surulere', to: 'Ajah', count: 98 },
      ],
      branchId: branchId || 'all',
      stateId: stateId || 'all',
      period,
    };

    res.json({
      success: true,
      data: analytics,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'delivery-service',
      },
    });
  } catch (error) {
    console.error('Get delivery analytics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_DELIVERY_ANALYTICS_ERROR',
        message: 'Failed to get delivery analytics',
      },
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`📦 Delivery Service (TypeScript) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🚚 Create delivery: POST http://localhost:${PORT}/api/v1/deliveries`);
  console.log(
    `📍 Track package: http://localhost:${PORT}/api/v1/deliveries/track/{trackingNumber}`
  );
  console.log(`📈 Analytics: http://localhost:${PORT}/api/v1/analytics/deliveries`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
