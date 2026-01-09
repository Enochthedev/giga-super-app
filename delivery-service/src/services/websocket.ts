import config from '@/config';
import { DeliveryTracking } from '@/types';
import logger from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { Server as HttpServer } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

interface SocketUser {
  id: string;
  email: string;
  role: string;
  courier_id?: string;
}

interface TrackingRoom {
  assignment_id: string;
  participants: Set<string>; // socket IDs
  last_update?: string;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private trackingRooms: Map<string, TrackingRoom> = new Map();
  private userSockets: Map<string, Socket> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin:
          config.nodeEnv === 'development'
            ? ['http://localhost:3000', 'http://localhost:3001']
            : ['https://giga-platform.com', 'https://api.giga-platform.com'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      logger.info('Client connected', { socket_id: socket.id });

      // Handle authentication
      socket.on('authenticate', async (data: { token: string }) => {
        try {
          const user = await this.authenticateSocket(data.token);
          if (user) {
            socket.data.user = user;
            this.userSockets.set(user.id, socket);
            socket.emit('authenticated', { success: true, user_id: user.id });
            logger.info('Socket authenticated', { socket_id: socket.id, user_id: user.id });
          } else {
            socket.emit('authentication_error', { error: 'Invalid token' });
            socket.disconnect();
          }
        } catch (error: any) {
          logger.error('Socket authentication error', { error: error.message });
          socket.emit('authentication_error', { error: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Handle joining tracking room
      socket.on('join_tracking', async (data: { assignment_id: string }) => {
        try {
          if (!socket.data.user) {
            socket.emit('error', { error: 'Not authenticated' });
            return;
          }

          const { assignment_id } = data;
          const user = socket.data.user as SocketUser;

          // Verify user has access to this assignment
          const hasAccess = await this.verifyTrackingAccess(assignment_id, user.id);
          if (!hasAccess) {
            socket.emit('error', { error: 'Access denied to tracking data' });
            return;
          }

          // Join the tracking room
          await socket.join(`tracking:${assignment_id}`);

          // Add to tracking room participants
          if (!this.trackingRooms.has(assignment_id)) {
            this.trackingRooms.set(assignment_id, {
              assignment_id,
              participants: new Set(),
            });
          }

          const room = this.trackingRooms.get(assignment_id)!;
          room.participants.add(socket.id);

          // Send current tracking data
          const currentTracking = await this.getCurrentTrackingData(assignment_id);
          if (currentTracking) {
            socket.emit('tracking_update', currentTracking);
          }

          socket.emit('joined_tracking', { assignment_id, participants: room.participants.size });
          logger.info('Client joined tracking room', {
            socket_id: socket.id,
            user_id: user.id,
            assignment_id,
          });
        } catch (error: any) {
          logger.error('Error joining tracking room', { error: error.message });
          socket.emit('error', { error: 'Failed to join tracking' });
        }
      });

      // Handle leaving tracking room
      socket.on('leave_tracking', (data: { assignment_id: string }) => {
        try {
          const { assignment_id } = data;
          socket.leave(`tracking:${assignment_id}`);

          const room = this.trackingRooms.get(assignment_id);
          if (room) {
            room.participants.delete(socket.id);
            if (room.participants.size === 0) {
              this.trackingRooms.delete(assignment_id);
            }
          }

          socket.emit('left_tracking', { assignment_id });
          logger.info('Client left tracking room', {
            socket_id: socket.id,
            assignment_id,
          });
        } catch (error: any) {
          logger.error('Error leaving tracking room', { error: error.message });
        }
      });

      // Handle courier location updates
      socket.on('courier_location_update', async (data: any) => {
        try {
          if (!socket.data.user) {
            socket.emit('error', { error: 'Not authenticated' });
            return;
          }

          const user = socket.data.user as SocketUser;
          if (!user.courier_id) {
            socket.emit('error', { error: 'Not a courier' });
            return;
          }

          // Validate location data
          const { latitude, longitude, accuracy_meters, speed_kmh, heading_degrees } = data;
          if (!latitude || !longitude) {
            socket.emit('error', { error: 'Invalid location data' });
            return;
          }

          // Update courier location in database
          await this.updateCourierLocation(user.courier_id, {
            latitude,
            longitude,
            accuracy_meters,
            speed_kmh,
            heading_degrees,
          });

          // Broadcast to relevant tracking rooms
          await this.broadcastCourierLocationUpdate(user.courier_id, data);

          logger.debug('Courier location updated', {
            courier_id: user.courier_id,
            latitude,
            longitude,
          });
        } catch (error: any) {
          logger.error('Error updating courier location', { error: error.message });
          socket.emit('error', { error: 'Failed to update location' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        logger.info('Client disconnected', { socket_id: socket.id, reason });

        if (socket.data.user) {
          const user = socket.data.user as SocketUser;
          this.userSockets.delete(user.id);

          // Remove from all tracking rooms
          this.trackingRooms.forEach((room, assignmentId) => {
            if (room.participants.has(socket.id)) {
              room.participants.delete(socket.id);
              if (room.participants.size === 0) {
                this.trackingRooms.delete(assignmentId);
              }
            }
          });
        }
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error('Socket error', { socket_id: socket.id, error: error.message });
      });
    });
  }

  /**
   * Authenticate socket connection using JWT token
   */
  private async authenticateSocket(token: string): Promise<SocketUser | null> {
    try {
      const { data: user, error } = await supabase.auth.getUser(token);
      if (error || !user.user) {
        return null;
      }

      // Get courier profile if user is a courier
      let courier_id: string | undefined;
      const { data: courierProfile } = await supabase
        .from('courier_profiles')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (courierProfile) {
        courier_id = courierProfile.id;
      }

      return {
        id: user.user.id,
        email: user.user.email || '',
        role: user.user.app_metadata?.role || 'user',
        courier_id,
      };
    } catch (error: any) {
      logger.error('Socket authentication error', { error: error.message });
      return null;
    }
  }

  /**
   * Verify user has access to tracking data for an assignment
   */
  private async verifyTrackingAccess(assignmentId: string, userId: string): Promise<boolean> {
    try {
      // Check if user is the courier
      const { data: courierAssignment } = await supabase
        .from('delivery_assignments')
        .select(
          `
          id,
          courier_profiles!inner(
            user_id
          )
        `
        )
        .eq('id', assignmentId)
        .eq('courier_profiles.user_id', userId)
        .single();

      if (courierAssignment) {
        return true;
      }

      // Check if user is the customer
      const { data: customerAssignment } = await supabase
        .from('delivery_assignments')
        .select(
          `
          id,
          ecommerce_orders!inner(
            user_id
          )
        `
        )
        .eq('id', assignmentId)
        .eq('ecommerce_orders.user_id', userId)
        .single();

      if (customerAssignment) {
        return true;
      }

      // Check if user is admin/dispatcher
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role_name')
        .eq('user_id', userId)
        .in('role_name', ['ADMIN', 'DISPATCHER'])
        .single();

      return !!userRole;
    } catch (error: any) {
      logger.error('Error verifying tracking access', { error: error.message });
      return false;
    }
  }

  /**
   * Get current tracking data for an assignment
   */
  private async getCurrentTrackingData(assignmentId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('delivery_tracking')
        .select(
          `
          *,
          delivery_assignments!inner(
            id,
            assignment_number,
            status,
            recipient_name
          )
        `
        )
        .eq('delivery_assignment_id', assignmentId)
        .eq('is_active_tracking', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching current tracking data', { error });
        return null;
      }

      return data;
    } catch (error: any) {
      logger.error('Error getting current tracking data', { error: error.message });
      return null;
    }
  }

  /**
   * Update courier location in database
   */
  private async updateCourierLocation(
    courierId: string,
    locationData: {
      latitude: number;
      longitude: number;
      accuracy_meters?: number;
      speed_kmh?: number;
      heading_degrees?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('courier_profiles')
        .update({
          current_latitude: locationData.latitude,
          current_longitude: locationData.longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', courierId);

      if (error) {
        logger.error('Error updating courier location in database', { error });
      }
    } catch (error: any) {
      logger.error('Error updating courier location', { error: error.message });
    }
  }

  /**
   * Broadcast courier location update to relevant tracking rooms
   */
  private async broadcastCourierLocationUpdate(
    courierId: string,
    locationData: any
  ): Promise<void> {
    try {
      // Get active assignments for this courier
      const { data: assignments, error } = await supabase
        .from('delivery_assignments')
        .select('id')
        .eq('courier_id', courierId)
        .in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
        .is('deleted_at', null);

      if (error) {
        logger.error('Error fetching courier assignments', { error });
        return;
      }

      // Broadcast to each assignment's tracking room
      assignments?.forEach(assignment => {
        const roomName = `tracking:${assignment.id}`;
        this.io?.to(roomName).emit('courier_location_update', {
          assignment_id: assignment.id,
          courier_id: courierId,
          location: locationData,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error: any) {
      logger.error('Error broadcasting courier location update', { error: error.message });
    }
  }

  /**
   * Broadcast tracking update to assignment room
   */
  async broadcastTrackingUpdate(trackingRecord: DeliveryTracking): Promise<void> {
    try {
      if (!this.io) {
        logger.warn('WebSocket server not initialized');
        return;
      }

      const roomName = `tracking:${trackingRecord.assignment_id}`;
      const room = this.trackingRooms.get(trackingRecord.assignment_id);

      if (room && room.participants.size > 0) {
        this.io.to(roomName).emit('tracking_update', {
          ...trackingRecord,
          timestamp: new Date().toISOString(),
        });

        room.last_update = new Date().toISOString();

        logger.info('Tracking update broadcasted', {
          assignment_id: trackingRecord.assignment_id,
          participants: room.participants.size,
          tracking_id: trackingRecord.id,
        });
      }
    } catch (error: any) {
      logger.error('Error broadcasting tracking update', { error: error.message });
    }
  }

  /**
   * Broadcast delivery status update
   */
  async broadcastStatusUpdate(assignmentId: string, status: string, data?: any): Promise<void> {
    try {
      if (!this.io) {
        logger.warn('WebSocket server not initialized');
        return;
      }

      const roomName = `tracking:${assignmentId}`;
      this.io.to(roomName).emit('status_update', {
        assignment_id: assignmentId,
        status,
        data,
        timestamp: new Date().toISOString(),
      });

      logger.info('Status update broadcasted', {
        assignment_id: assignmentId,
        status,
      });
    } catch (error: any) {
      logger.error('Error broadcasting status update', { error: error.message });
    }
  }

  /**
   * Get WebSocket server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Get tracking room statistics
   */
  getTrackingStats(): {
    active_rooms: number;
    total_participants: number;
    rooms: Array<{ assignment_id: string; participants: number; last_update?: string }>;
  } {
    const rooms = Array.from(this.trackingRooms.entries()).map(([assignmentId, room]) => ({
      assignment_id: assignmentId,
      participants: room.participants.size,
      last_update: room.last_update,
    }));

    return {
      active_rooms: this.trackingRooms.size,
      total_participants: rooms.reduce((sum, room) => sum + room.participants, 0),
      rooms,
    };
  }

  /**
   * Cleanup inactive tracking rooms
   */
  async cleanupInactiveRooms(maxInactiveMinutes: number = 30): Promise<void> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - maxInactiveMinutes);

      const roomsToDelete: string[] = [];

      this.trackingRooms.forEach((room, assignmentId) => {
        if (room.participants.size === 0) {
          roomsToDelete.push(assignmentId);
        } else if (room.last_update && new Date(room.last_update) < cutoffTime) {
          // Check if assignment is still active
          this.verifyAssignmentActive(assignmentId).then(isActive => {
            if (!isActive) {
              roomsToDelete.push(assignmentId);
            }
          });
        }
      });

      roomsToDelete.forEach(assignmentId => {
        this.trackingRooms.delete(assignmentId);
        logger.info('Cleaned up inactive tracking room', { assignment_id: assignmentId });
      });

      if (roomsToDelete.length > 0) {
        logger.info('Tracking room cleanup completed', {
          cleaned_rooms: roomsToDelete.length,
          active_rooms: this.trackingRooms.size,
        });
      }
    } catch (error: any) {
      logger.error('Error cleaning up inactive rooms', { error: error.message });
    }
  }

  /**
   * Verify if assignment is still active
   */
  private async verifyAssignmentActive(assignmentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select('status')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single();

      if (error) {
        return false;
      }

      const activeStatuses = ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'];
      return activeStatuses.includes(data.status);
    } catch (error: any) {
      logger.error('Error verifying assignment active status', { error: error.message });
      return false;
    }
  }
}

export const webSocketService = new WebSocketService();
