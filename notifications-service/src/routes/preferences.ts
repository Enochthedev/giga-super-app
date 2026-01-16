import { createClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { PreferencesService, UserPreferences } from '../utils/preferences.js';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false },
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  requestId?: string;
}

// Middleware to check authentication
const requireAuth = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
  next();
};

// GET /api/v1/preferences - Get user preferences
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = await PreferencesService.getUserPreferences(userId);

    // Check unsubscribe status
    const emailUnsubscribed = await PreferencesService.checkUnsubscribeStatus(userId, 'email');
    const smsUnsubscribed = await PreferencesService.checkUnsubscribeStatus(userId, 'sms');
    const allUnsubscribed = await PreferencesService.checkUnsubscribeStatus(userId, 'all');

    res.json({
      success: true,
      data: {
        ...preferences,
        unsubscribe_status: {
          email: emailUnsubscribed,
          sms: smsUnsubscribed,
          all: allUnsubscribed,
        },
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching user preferences', {
      error: error.message,
      userId: req.user!.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// PUT /api/v1/preferences - Update user preferences
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const updates = req.body;

    // Validate preferences data
    const validation = PreferencesService.validatePreferences(updates);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preferences data',
        details: { errors: validation.errors },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Remove fields that shouldn't be updated directly
    const { id, user_id, created_at, updated_at, ...allowedUpdates } = updates;

    const updatedPreferences = await PreferencesService.updateUserPreferences(
      userId,
      allowedUpdates
    );

    logger.info('User preferences updated', {
      userId,
      changes: Object.keys(allowedUpdates),
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: updatedPreferences,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error updating user preferences', {
      error: error.message,
      userId: req.user!.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/preferences/unsubscribe - Generate unsubscribe token and optionally unsubscribe
router.post('/unsubscribe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type = 'email', immediate = false } = req.body;

    // Validate type
    if (!['email', 'sms', 'all'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid unsubscribe type. Must be email, sms, or all',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Generate unsubscribe token
    const token = uuidv4();
    const { error: tokenError } = await supabase.from('unsubscribe_tokens').insert({
      user_id: userId,
      token,
      type,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    });

    if (tokenError) {
      logger.error('Failed to create unsubscribe token', {
        error: tokenError,
        userId,
        requestId: req.requestId,
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create unsubscribe token',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // If immediate unsubscribe requested, update preferences
    if (immediate) {
      const updates: Partial<UserPreferences> = {};

      switch (type) {
        case 'email':
          updates.email_enabled = false;
          break;
        case 'sms':
          updates.sms_enabled = false;
          break;
        case 'all':
          updates.email_enabled = false;
          updates.sms_enabled = false;
          updates.push_enabled = false;
          break;
      }

      await PreferencesService.updateUserPreferences(userId, updates);

      // Mark token as used
      await supabase
        .from('unsubscribe_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);
    }

    const unsubscribeUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/v1/unsubscribe/${token}`;

    logger.info('Unsubscribe token generated', {
      userId,
      type,
      immediate,
      token,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        token,
        unsubscribe_url: unsubscribeUrl,
        type,
        immediate_unsubscribe: immediate,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error creating unsubscribe token', {
      error: error.message,
      userId: req.user!.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create unsubscribe token',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/unsubscribe/:token - Handle unsubscribe link (public endpoint)
router.get('/unsubscribe/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Validate and get token
    const { data: tokenData, error: tokenError } = await supabase
      .from('unsubscribe_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Invalid or Expired Unsubscribe Link</h2>
            <p>This unsubscribe link is invalid or has expired.</p>
            <p>Please contact support if you need assistance.</p>
          </body>
        </html>
      `);
    }

    // Check if already used
    if (tokenData.used_at) {
      return res.status(200).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Already Unsubscribed</h2>
            <p>You have already been unsubscribed from ${tokenData.type} notifications.</p>
            <p>If you continue to receive notifications, please contact support.</p>
          </body>
        </html>
      `);
    }

    // Update user preferences
    const updates: Partial<UserPreferences> = {};

    switch (tokenData.type) {
      case 'email':
        updates.email_enabled = false;
        break;
      case 'sms':
        updates.sms_enabled = false;
        break;
      case 'all':
        updates.email_enabled = false;
        updates.sms_enabled = false;
        updates.push_enabled = false;
        break;
    }

    await PreferencesService.updateUserPreferences(tokenData.user_id, updates);

    // Mark token as used
    await supabase
      .from('unsubscribe_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    // Clear preferences cache
    PreferencesService.clearCache(tokenData.user_id);

    logger.info('User unsubscribed via link', {
      userId: tokenData.user_id,
      type: tokenData.type,
      token,
    });

    res.status(200).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Successfully Unsubscribed</h2>
          <p>You have been unsubscribed from ${tokenData.type} notifications.</p>
          <p>You can update your notification preferences anytime by logging into your account.</p>
          <div style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences" 
               style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Manage Preferences
            </a>
          </div>
        </body>
      </html>
    `);
  } catch (error: any) {
    logger.error('Error processing unsubscribe', {
      error: error.message,
      token: req.params.token,
    });
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>Error Processing Unsubscribe</h2>
          <p>There was an error processing your unsubscribe request.</p>
          <p>Please try again later or contact support.</p>
        </body>
      </html>
    `);
  }
});

// POST /api/v1/preferences/resubscribe - Resubscribe to notifications
router.post('/resubscribe', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type = 'email' } = req.body;

    // Validate type
    if (!['email', 'sms', 'all'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resubscribe type. Must be email, sms, or all',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Update preferences to re-enable notifications
    const updates: Partial<UserPreferences> = {};

    switch (type) {
      case 'email':
        updates.email_enabled = true;
        break;
      case 'sms':
        updates.sms_enabled = true;
        break;
      case 'all':
        updates.email_enabled = true;
        updates.sms_enabled = true;
        updates.push_enabled = true;
        break;
    }

    const updatedPreferences = await PreferencesService.updateUserPreferences(userId, updates);

    logger.info('User resubscribed', {
      userId,
      type,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        message: `Successfully resubscribed to ${type} notifications`,
        preferences: updatedPreferences,
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error resubscribing user', {
      error: error.message,
      userId: req.user!.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to resubscribe',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/preferences/check/:type - Check if notification type is allowed
router.get('/check/:type', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type } = req.params;
    const { category = 'general' } = req.query;

    // Validate type
    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification type. Must be email, sms, or push',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    const result = await PreferencesService.checkNotificationAllowed(
      userId,
      type as 'email' | 'sms' | 'push',
      category as string
    );

    res.json({
      success: true,
      data: {
        type,
        category,
        allowed: result.allowed,
        reason: result.reason,
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error checking notification permission', {
      error: error.message,
      userId: req.user!.id,
      type: req.params.type,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to check notification permission',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/preferences/quiet-hours - Check if currently in quiet hours
router.get('/quiet-hours', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = await PreferencesService.getUserPreferences(userId);

    const isQuietHours = PreferencesService.isQuietHours(preferences);
    const delayUntilActive = isQuietHours
      ? PreferencesService.getDelayUntilActiveHours(preferences)
      : 0;

    res.json({
      success: true,
      data: {
        is_quiet_hours: isQuietHours,
        quiet_hours_start: preferences.quiet_hours_start,
        quiet_hours_end: preferences.quiet_hours_end,
        timezone: preferences.timezone,
        delay_until_active_ms: delayUntilActive,
        delay_until_active_hours: Math.round((delayUntilActive / (1000 * 60 * 60)) * 100) / 100,
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error checking quiet hours', {
      error: error.message,
      userId: req.user!.id,
      requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to check quiet hours',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

export default router;
