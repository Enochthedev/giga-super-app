import { createClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cache for user preferences (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export interface UserPreferences {
  id?: string;
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  marketing_emails: boolean;
  booking_notifications: boolean;
  payment_notifications: boolean;
  delivery_notifications: boolean;
  social_notifications: boolean;
  security_notifications: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at?: string;
  updated_at?: string;
}

export class PreferencesService {
  /**
   * Get user notification preferences with caching
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const cacheKey = `preferences:${userId}`;
    let preferences = cache.get<UserPreferences>(cacheKey);

    if (!preferences) {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Failed to get user preferences', { error, userId });
      }

      // Return defaults if no preferences found
      preferences = data || this.getDefaultPreferences(userId);
      cache.set(cacheKey, preferences);
    }

    return preferences;
  }

  /**
   * Update user notification preferences
   */
  static async updateUserPreferences(
    userId: string,
    updates: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to update user preferences', { error, userId });
      throw new Error('Failed to update preferences');
    }

    // Update cache
    const cacheKey = `preferences:${userId}`;
    cache.set(cacheKey, data);

    return data;
  }

  /**
   * Check if a notification is allowed based on user preferences
   */
  static async checkNotificationAllowed(
    userId: string,
    type: 'email' | 'sms' | 'push',
    category: string = 'general'
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const preferences = await this.getUserPreferences(userId);

      // Check if notification type is enabled
      if (type === 'email' && !preferences.email_enabled) {
        return { allowed: false, reason: 'Email notifications disabled' };
      }
      if (type === 'sms' && !preferences.sms_enabled) {
        return { allowed: false, reason: 'SMS notifications disabled' };
      }
      if (type === 'push' && !preferences.push_enabled) {
        return { allowed: false, reason: 'Push notifications disabled' };
      }

      // Check category-specific preferences
      const categoryAllowed = this.checkCategoryPreference(preferences, category);
      if (!categoryAllowed) {
        return { allowed: false, reason: `${category} notifications disabled` };
      }

      // Check email frequency for email notifications
      if (type === 'email' && preferences.email_frequency === 'never') {
        return { allowed: false, reason: 'Email frequency set to never' };
      }

      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        return { allowed: false, reason: 'Currently in quiet hours' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking notification permission', { error, userId });
      // Default to allow if there's an error
      return { allowed: true };
    }
  }

  /**
   * Check if current time is within user's quiet hours
   */
  static isQuietHours(preferences: UserPreferences): boolean {
    try {
      const now = new Date();

      // Convert to user's timezone
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: preferences.timezone }));
      const currentTime = userTime.toTimeString().slice(0, 5); // HH:MM format

      const startTime = preferences.quiet_hours_start;
      const endTime = preferences.quiet_hours_end;

      if (!startTime || !endTime) return false;

      if (startTime <= endTime) {
        // Quiet hours within same day (e.g., 22:00 to 08:00 next day)
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        // Quiet hours span midnight (e.g., 22:00 to 08:00)
        return currentTime >= startTime || currentTime <= endTime;
      }
    } catch (error) {
      logger.error('Error checking quiet hours', { error, preferences });
      return false;
    }
  }

  /**
   * Calculate delay until quiet hours end
   */
  static getDelayUntilActiveHours(preferences: UserPreferences): number {
    try {
      const now = new Date();
      const endTime = preferences.quiet_hours_end;

      if (!endTime) return 0;

      const [hours, minutes] = endTime.split(':').map(Number);

      // Create end time in user's timezone
      const userNow = new Date(now.toLocaleString('en-US', { timeZone: preferences.timezone }));
      const endDate = new Date(userNow);
      endDate.setHours(hours, minutes, 0, 0);

      // If end time is before current time, it's tomorrow
      if (endDate <= userNow) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const delay = endDate.getTime() - userNow.getTime();
      return Math.max(0, delay);
    } catch (error) {
      logger.error('Error calculating delay until active hours', { error, preferences });
      return 0;
    }
  }

  /**
   * Check if a specific category is allowed
   */
  private static checkCategoryPreference(preferences: UserPreferences, category: string): boolean {
    switch (category.toLowerCase()) {
      case 'marketing':
        return preferences.marketing_emails;
      case 'booking':
        return preferences.booking_notifications;
      case 'payment':
        return preferences.payment_notifications;
      case 'delivery':
        return preferences.delivery_notifications;
      case 'social':
        return preferences.social_notifications;
      case 'security':
        return preferences.security_notifications;
      case 'general':
      default:
        return true; // General notifications are always allowed if type is enabled
    }
  }

  /**
   * Get default preferences for a new user
   */
  private static getDefaultPreferences(userId: string): UserPreferences {
    return {
      user_id: userId,
      email_enabled: true,
      sms_enabled: true,
      push_enabled: true,
      marketing_emails: false,
      booking_notifications: true,
      payment_notifications: true,
      delivery_notifications: true,
      social_notifications: true,
      security_notifications: true,
      email_frequency: 'immediate',
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'UTC',
    };
  }

  /**
   * Validate preferences data
   */
  static validatePreferences(preferences: Partial<UserPreferences>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate email frequency
    if (
      preferences.email_frequency &&
      !['immediate', 'daily', 'weekly', 'never'].includes(preferences.email_frequency)
    ) {
      errors.push('Invalid email frequency');
    }

    // Validate time format for quiet hours
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (preferences.quiet_hours_start && !timeRegex.test(preferences.quiet_hours_start)) {
      errors.push('Invalid quiet hours start time format (use HH:MM)');
    }
    if (preferences.quiet_hours_end && !timeRegex.test(preferences.quiet_hours_end)) {
      errors.push('Invalid quiet hours end time format (use HH:MM)');
    }

    // Validate timezone
    if (preferences.timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: preferences.timezone });
      } catch {
        errors.push('Invalid timezone');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clear preferences cache for a user
   */
  static clearCache(userId: string): void {
    const cacheKey = `preferences:${userId}`;
    cache.del(cacheKey);
  }

  /**
   * Get notification frequency delay in milliseconds
   */
  static getFrequencyDelay(frequency: string): number {
    switch (frequency) {
      case 'immediate':
        return 0;
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'never':
        return -1; // Never send
      default:
        return 0;
    }
  }

  /**
   * Check if user has unsubscribed from a specific type
   */
  static async checkUnsubscribeStatus(
    userId: string,
    type: 'email' | 'sms' | 'all'
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('unsubscribe_tokens')
      .select('used_at')
      .eq('user_id', userId)
      .eq('type', type)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error checking unsubscribe status', { error, userId, type });
      return false;
    }

    return data && data.used_at !== null;
  }
}
