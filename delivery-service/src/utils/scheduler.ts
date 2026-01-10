import { createClient } from '@supabase/supabase-js';

import config from '@/config';
import { webSocketService } from '@/services/websocket';
import logger from '@/utils/logger';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

class SchedulerService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start all scheduled tasks
   */
  start(): void {
    this.startTrackingDataCleanup();
    this.startWebSocketRoomCleanup();
    this.startInactiveAssignmentCleanup();
    logger.info('Scheduler service started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      logger.info(`Stopped scheduled task: ${name}`);
    });
    this.intervals.clear();
    logger.info('Scheduler service stopped');
  }

  /**
   * Start automatic tracking data cleanup
   * Runs every 6 hours to clean up old tracking data
   */
  private startTrackingDataCleanup(): void {
    const intervalMs = 6 * 60 * 60 * 1000; // 6 hours
    const retentionHours = 72; // 3 days

    const interval = setInterval(async () => {
      try {
        logger.info('Starting automatic tracking data cleanup');

        // Get completed assignments older than retention period
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - retentionHours);

        const { data: completedAssignments, error } = await supabase
          .from('delivery_assignments')
          .select('id')
          .in('status', ['delivered', 'failed', 'cancelled', 'returned'])
          .lt('updated_at', cutoffTime.toISOString())
          .is('deleted_at', null);

        if (error) {
          logger.error('Error fetching completed assignments for cleanup', { error });
          return;
        }

        if (!completedAssignments || completedAssignments.length === 0) {
          logger.info('No assignments found for tracking data cleanup');
          return;
        }

        let totalDeleted = 0;

        // Clean up tracking data for each completed assignment
        for (const assignment of completedAssignments) {
          try {
            const { data, error: deleteError } = await supabase
              .from('delivery_tracking')
              .delete()
              .eq('delivery_assignment_id', assignment.id)
              .lt('timestamp', cutoffTime.toISOString())
              .select('id');

            if (deleteError) {
              logger.error('Error deleting tracking data', {
                assignment_id: assignment.id,
                error: deleteError,
              });
              continue;
            }

            const deletedCount = data?.length || 0;
            totalDeleted += deletedCount;

            if (deletedCount > 0) {
              logger.debug('Cleaned up tracking data', {
                assignment_id: assignment.id,
                deleted_count: deletedCount,
              });
            }
          } catch (error: any) {
            logger.error('Error cleaning up tracking data for assignment', {
              assignment_id: assignment.id,
              error: error.message,
            });
          }
        }

        logger.info('Automatic tracking data cleanup completed', {
          assignments_processed: completedAssignments.length,
          total_records_deleted: totalDeleted,
          retention_hours: retentionHours,
        });
      } catch (error: any) {
        logger.error('Error during automatic tracking data cleanup', {
          error: error.message,
        });
      }
    }, intervalMs);

    this.intervals.set('tracking-data-cleanup', interval);
    logger.info('Started automatic tracking data cleanup', {
      interval_hours: intervalMs / (60 * 60 * 1000),
      retention_hours: retentionHours,
    });
  }

  /**
   * Start automatic WebSocket room cleanup
   * Runs every 30 minutes to clean up inactive rooms
   */
  private startWebSocketRoomCleanup(): void {
    const intervalMs = 30 * 60 * 1000; // 30 minutes
    const maxInactiveMinutes = 60; // 1 hour

    const interval = setInterval(async () => {
      try {
        logger.debug('Starting automatic WebSocket room cleanup');
        await webSocketService.cleanupInactiveRooms(maxInactiveMinutes);
      } catch (error: any) {
        logger.error('Error during automatic WebSocket room cleanup', {
          error: error.message,
        });
      }
    }, intervalMs);

    this.intervals.set('websocket-room-cleanup', interval);
    logger.info('Started automatic WebSocket room cleanup', {
      interval_minutes: intervalMs / (60 * 1000),
      max_inactive_minutes: maxInactiveMinutes,
    });
  }

  /**
   * Start automatic inactive assignment cleanup
   * Runs every 12 hours to update stale assignments
   */
  private startInactiveAssignmentCleanup(): void {
    const intervalMs = 12 * 60 * 60 * 1000; // 12 hours
    const staleHours = 24; // 24 hours

    const interval = setInterval(async () => {
      try {
        logger.info('Starting automatic inactive assignment cleanup');

        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - staleHours);

        // Find assignments that have been in transit for too long
        const { data: staleAssignments, error } = await supabase
          .from('delivery_assignments')
          .select('id, assignment_number, status, courier_id')
          .in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
          .lt('updated_at', cutoffTime.toISOString())
          .is('deleted_at', null);

        if (error) {
          logger.error('Error fetching stale assignments', { error });
          return;
        }

        if (!staleAssignments || staleAssignments.length === 0) {
          logger.info('No stale assignments found');
          return;
        }

        let updatedCount = 0;

        // Mark stale assignments as failed
        for (const assignment of staleAssignments) {
          try {
            const { error: updateError } = await supabase
              .from('delivery_assignments')
              .update({
                status: 'failed',
                failed_at: new Date().toISOString(),
                courier_notes: 'Automatically marked as failed due to inactivity',
                updated_at: new Date().toISOString(),
              })
              .eq('id', assignment.id);

            if (updateError) {
              logger.error('Error updating stale assignment', {
                assignment_id: assignment.id,
                error: updateError,
              });
              continue;
            }

            updatedCount++;

            // Broadcast status update
            await webSocketService.broadcastStatusUpdate(assignment.id, 'failed', {
              reason: 'automatic_timeout',
              timeout_hours: staleHours,
            });

            logger.info('Marked stale assignment as failed', {
              assignment_id: assignment.id,
              assignment_number: assignment.assignment_number,
              previous_status: assignment.status,
              courier_id: assignment.courier_id,
            });
          } catch (error: any) {
            logger.error('Error processing stale assignment', {
              assignment_id: assignment.id,
              error: error.message,
            });
          }
        }

        logger.info('Automatic inactive assignment cleanup completed', {
          assignments_found: staleAssignments.length,
          assignments_updated: updatedCount,
          stale_hours: staleHours,
        });
      } catch (error: any) {
        logger.error('Error during automatic inactive assignment cleanup', {
          error: error.message,
        });
      }
    }, intervalMs);

    this.intervals.set('inactive-assignment-cleanup', interval);
    logger.info('Started automatic inactive assignment cleanup', {
      interval_hours: intervalMs / (60 * 60 * 1000),
      stale_hours: staleHours,
    });
  }

  /**
   * Manual cleanup trigger for testing/admin purposes
   */
  async triggerManualCleanup(
    type: 'tracking' | 'websocket' | 'assignments' | 'all'
  ): Promise<void> {
    try {
      logger.info('Manual cleanup triggered', { type });

      switch (type) {
        case 'tracking':
          // Trigger tracking data cleanup with shorter retention
          const retentionHours = 24; // 1 day for manual cleanup
          const cutoffTime = new Date();
          cutoffTime.setHours(cutoffTime.getHours() - retentionHours);

          const { data: assignments, error } = await supabase
            .from('delivery_assignments')
            .select('id')
            .in('status', ['delivered', 'failed', 'cancelled', 'returned'])
            .lt('updated_at', cutoffTime.toISOString());

          if (!error && assignments) {
            let totalDeleted = 0;
            for (const assignment of assignments) {
              const { data } = await supabase
                .from('delivery_tracking')
                .delete()
                .eq('delivery_assignment_id', assignment.id)
                .lt('timestamp', cutoffTime.toISOString())
                .select('id');
              totalDeleted += data?.length || 0;
            }
            logger.info('Manual tracking cleanup completed', { total_deleted: totalDeleted });
          }
          break;

        case 'websocket':
          await webSocketService.cleanupInactiveRooms(15); // 15 minutes for manual cleanup
          break;

        case 'assignments':
          // Manual assignment cleanup with shorter timeout
          const staleHours = 12; // 12 hours for manual cleanup
          const staleCutoff = new Date();
          staleCutoff.setHours(staleCutoff.getHours() - staleHours);

          const { data: staleAssignments } = await supabase
            .from('delivery_assignments')
            .select('id')
            .in('status', ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'])
            .lt('updated_at', staleCutoff.toISOString());

          if (staleAssignments) {
            for (const assignment of staleAssignments) {
              await supabase
                .from('delivery_assignments')
                .update({
                  status: 'failed',
                  failed_at: new Date().toISOString(),
                  courier_notes: 'Manually marked as failed due to inactivity',
                })
                .eq('id', assignment.id);
            }
            logger.info('Manual assignment cleanup completed', {
              assignments_updated: staleAssignments.length,
            });
          }
          break;

        case 'all':
          await this.triggerManualCleanup('tracking');
          await this.triggerManualCleanup('websocket');
          await this.triggerManualCleanup('assignments');
          break;
      }

      logger.info('Manual cleanup completed', { type });
    } catch (error: any) {
      logger.error('Error during manual cleanup', { type, error: error.message });
      throw error;
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    active_tasks: number;
    tasks: Array<{ name: string; active: boolean }>;
  } {
    const tasks = [
      'tracking-data-cleanup',
      'websocket-room-cleanup',
      'inactive-assignment-cleanup',
    ].map(name => ({
      name,
      active: this.intervals.has(name),
    }));

    return {
      active_tasks: this.intervals.size,
      tasks,
    };
  }
}

export const schedulerService = new SchedulerService();
