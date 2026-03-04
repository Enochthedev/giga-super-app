import { Server } from 'socket.io';
import winston from 'winston';

export class NotificationService {
  private io: Server;
  private logger: winston.Logger;

  constructor(io: Server, logger: winston.Logger) {
    this.io = io;
    this.logger = logger;
  }

  /**
   * Notify all online drivers about a new ride request
   */
  notifyDriversOfNewRide(ride: any, passengerInfo?: any) {
    try {
      const notification = {
        rideId: ride.id,
        rideNumber: ride.ride_number,
        pickupLocation: ride.pickup_location,
        pickupAddress: ride.pickup_address,
        dropoffLocation: ride.dropoff_location,
        dropoffAddress: ride.dropoff_address,
        estimatedFare: ride.base_fare,
        distance: ride.distance_km,
        estimatedDuration: ride.estimated_duration_minutes,
        passengerName: passengerInfo?.first_name || 'Passenger',
        passengerRating: passengerInfo?.rating || null,
        timestamp: new Date().toISOString(),
      };

      // Broadcast to all drivers in the 'drivers' room
      this.io.to('drivers').emit('ride:new-request', notification);

      this.logger.info('Notified drivers of new ride', {
        rideId: ride.id,
        rideNumber: ride.ride_number,
      });
    } catch (error) {
      this.logger.error('Failed to notify drivers of new ride', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rideId: ride.id,
      });
    }
  }

  /**
   * Notify specific drivers (geo-targeted)
   */
  notifySpecificDrivers(driverIds: string[], ride: any, passengerInfo?: any) {
    try {
      const notification = {
        rideId: ride.id,
        rideNumber: ride.ride_number,
        pickupLocation: ride.pickup_location,
        pickupAddress: ride.pickup_address,
        dropoffLocation: ride.dropoff_location,
        dropoffAddress: ride.dropoff_address,
        estimatedFare: ride.base_fare,
        distance: ride.distance_km,
        estimatedDuration: ride.estimated_duration_minutes,
        passengerName: passengerInfo?.first_name || 'Passenger',
        passengerRating: passengerInfo?.rating || null,
        timestamp: new Date().toISOString(),
      };

      // Send to specific drivers
      driverIds.forEach(driverId => {
        const socketId = this.getDriverSocketId(driverId);
        if (socketId) {
          this.io.to(socketId).emit('ride:new-request', notification);
        }
      });

      this.logger.info('Notified specific drivers of new ride', {
        rideId: ride.id,
        driverCount: driverIds.length,
      });
    } catch (error) {
      this.logger.error('Failed to notify specific drivers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rideId: ride.id,
      });
    }
  }

  /**
   * Notify passenger that driver accepted their ride
   */
  notifyPassengerRideAccepted(passengerId: string, ride: any, driverInfo: any) {
    try {
      const socketId = this.getPassengerSocketId(passengerId);
      if (!socketId) {
        this.logger.warn('Passenger not connected via socket', { passengerId });
        return;
      }

      const notification = {
        rideId: ride.id,
        rideNumber: ride.ride_number,
        status: 'accepted',
        driver: {
          id: driverInfo.user_id,
          name: `${driverInfo.user?.first_name || ''} ${driverInfo.user?.last_name || ''}`.trim(),
          photo: driverInfo.user?.avatar_url,
          rating: driverInfo.rating,
          vehicle: driverInfo.vehicle_info,
          phone: driverInfo.user?.phone,
        },
        eta: ride.driver_eta_minutes,
        timestamp: new Date().toISOString(),
      };

      this.io.to(socketId).emit('ride:accepted', notification);

      this.logger.info('Notified passenger of ride acceptance', {
        rideId: ride.id,
        passengerId,
      });
    } catch (error) {
      this.logger.error('Failed to notify passenger of ride acceptance', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rideId: ride.id,
      });
    }
  }

  /**
   * Notify that ride is no longer available (another driver accepted)
   */
  notifyRideUnavailable(rideId: string, _excludeDriverId?: string) {
    try {
      // Broadcast to all drivers except the one who accepted
      this.io.to('drivers').emit('ride:unavailable', {
        rideId,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Notified drivers that ride is unavailable', { rideId });
    } catch (error) {
      this.logger.error('Failed to notify ride unavailable', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rideId,
      });
    }
  }

  /**
   * Notify about ride status change
   */
  notifyRideStatusChange(ride: any, recipientId: string, recipientType: 'driver' | 'passenger') {
    try {
      const socketId =
        recipientType === 'driver'
          ? this.getDriverSocketId(recipientId)
          : this.getPassengerSocketId(recipientId);

      if (!socketId) {
        this.logger.warn(`${recipientType} not connected via socket`, {
          recipientId,
          rideId: ride.id,
        });
        return;
      }

      this.io.to(socketId).emit('ride:status-update', {
        rideId: ride.id,
        status: ride.status,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Notified of ride status change', {
        rideId: ride.id,
        status: ride.status,
        recipientType,
      });
    } catch (error) {
      this.logger.error('Failed to notify ride status change', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rideId: ride.id,
      });
    }
  }

  /**
   * Notify about ride cancellation
   */
  notifyRideCancelled(
    ride: any,
    recipientId: string,
    recipientType: 'driver' | 'passenger',
    cancelledBy: 'driver' | 'passenger',
    reason?: string
  ) {
    try {
      const socketId =
        recipientType === 'driver'
          ? this.getDriverSocketId(recipientId)
          : this.getPassengerSocketId(recipientId);

      if (!socketId) {
        this.logger.warn(`${recipientType} not connected via socket`, { recipientId });
        return;
      }

      this.io.to(socketId).emit('ride:cancelled', {
        rideId: ride.id,
        cancelledBy,
        reason,
        fee: ride.cancellation_fee || 0,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Notified of ride cancellation', {
        rideId: ride.id,
        recipientType,
        cancelledBy,
      });
    } catch (error) {
      this.logger.error('Failed to notify ride cancellation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rideId: ride.id,
      });
    }
  }

  /**
   * Helper to get driver socket ID from active connections
   * This assumes activeDrivers Map is accessible
   */
  private getDriverSocketId(driverId: string): string | undefined {
    // Access the activeDrivers map from the parent scope
    // This will be injected when we integrate with index.ts
    return (this.io as any).activeDrivers?.get(driverId);
  }

  /**
   * Helper to get passenger socket ID from active connections
   */
  private getPassengerSocketId(passengerId: string): string | undefined {
    // Access the activeRiders map from the parent scope
    return (this.io as any).activeRiders?.get(passengerId);
  }

  /**
   * Set the active connections maps
   */
  setActiveConnections(activeDrivers: Map<string, string>, activeRiders: Map<string, string>) {
    (this.io as any).activeDrivers = activeDrivers;
    (this.io as any).activeRiders = activeRiders;
  }
}
