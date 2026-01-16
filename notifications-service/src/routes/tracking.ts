import { Request, Response, Router } from 'express';
import winston from 'winston';
import { DeliveryTracking } from '../utils/tracking.js';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// 1x1 transparent pixel for email open tracking
const TRACKING_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// GET /api/v1/tracking/open/:notificationId.png - Track email opens
router.get('/open/:notificationId.png', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    // Extract metadata from request
    const metadata = {
      user_agent: req.get('User-Agent'),
      ip_address: req.ip || req.connection.remoteAddress,
      referer: req.get('Referer'),
      timestamp: new Date().toISOString(),
    };

    // Track the email open asynchronously (don't wait for completion)
    DeliveryTracking.trackEmailOpen(notificationId, metadata).catch(error => {
      logger.error('Failed to track email open', {
        error: error.message,
        notificationId,
        metadata,
      });
    });

    // Return tracking pixel immediately
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.send(TRACKING_PIXEL);

    logger.info('Email open tracked', {
      notificationId,
      userAgent: metadata.user_agent,
      ipAddress: metadata.ip_address,
    });
  } catch (error: any) {
    logger.error('Error in email open tracking', {
      error: error.message,
      notificationId: req.params.notificationId,
    });

    // Still return the tracking pixel even if tracking fails
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.send(TRACKING_PIXEL);
  }
});

// GET /api/v1/tracking/click/:notificationId - Track email clicks and redirect
router.get('/click/:notificationId', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing url parameter',
      });
    }

    const originalUrl = decodeURIComponent(url as string);

    // Validate URL format
    try {
      new URL(originalUrl);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    // Extract metadata from request
    const metadata = {
      user_agent: req.get('User-Agent'),
      ip_address: req.ip || req.connection.remoteAddress,
      referer: req.get('Referer'),
      timestamp: new Date().toISOString(),
    };

    // Track the email click asynchronously (don't wait for completion)
    DeliveryTracking.trackEmailClick(notificationId, originalUrl, metadata).catch(error => {
      logger.error('Failed to track email click', {
        error: error.message,
        notificationId,
        originalUrl,
        metadata,
      });
    });

    logger.info('Email click tracked', {
      notificationId,
      originalUrl,
      userAgent: metadata.user_agent,
      ipAddress: metadata.ip_address,
    });

    // Redirect to original URL
    res.redirect(302, originalUrl);
  } catch (error: any) {
    logger.error('Error in email click tracking', {
      error: error.message,
      notificationId: req.params.notificationId,
      url: req.query.url,
    });

    // If tracking fails, still try to redirect if URL is valid
    const { url } = req.query;
    if (url) {
      try {
        const originalUrl = decodeURIComponent(url as string);
        new URL(originalUrl); // Validate URL
        return res.redirect(302, originalUrl);
      } catch {
        // Invalid URL, return error
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process click tracking',
    });
  }
});

// POST /api/v1/tracking/webhook/twilio - Twilio SMS status webhook
router.post('/webhook/twilio', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;

    logger.info('Twilio webhook received', {
      messageSid: webhookData.MessageSid,
      status: webhookData.MessageStatus,
      timestamp: new Date().toISOString(),
    });

    // Process webhook asynchronously
    DeliveryTracking.processWebhook('twilio', webhookData).catch(error => {
      logger.error('Failed to process Twilio webhook', {
        error: error.message,
        webhookData,
      });
    });

    // Respond immediately to Twilio
    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Error processing Twilio webhook', {
      error: error.message,
      body: req.body,
    });
    res.status(500).send('Error');
  }
});

// POST /api/v1/tracking/webhook/sendgrid - SendGrid email event webhook
router.post('/webhook/sendgrid', async (req: Request, res: Response) => {
  try {
    const events = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'Expected array of events',
      });
    }

    logger.info('SendGrid webhook received', {
      eventCount: events.length,
      timestamp: new Date().toISOString(),
    });

    // Process webhook asynchronously
    DeliveryTracking.processWebhook('sendgrid', events).catch(error => {
      logger.error('Failed to process SendGrid webhook', {
        error: error.message,
        eventCount: events.length,
      });
    });

    // Respond immediately to SendGrid
    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Error processing SendGrid webhook', {
      error: error.message,
      body: req.body,
    });
    res.status(500).send('Error');
  }
});

// POST /api/v1/tracking/webhook/firebase - Firebase push notification webhook
router.post('/webhook/firebase', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;

    logger.info('Firebase webhook received', {
      timestamp: new Date().toISOString(),
      dataKeys: Object.keys(webhookData),
    });

    // Process webhook asynchronously
    DeliveryTracking.processWebhook('firebase', webhookData).catch(error => {
      logger.error('Failed to process Firebase webhook', {
        error: error.message,
        webhookData,
      });
    });

    // Respond immediately to Firebase
    res.status(200).send('OK');
  } catch (error: any) {
    logger.error('Error processing Firebase webhook', {
      error: error.message,
      body: req.body,
    });
    res.status(500).send('Error');
  }
});

// GET /api/v1/tracking/health - Health check for tracking endpoints
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'notification-tracking',
    timestamp: new Date().toISOString(),
    endpoints: {
      email_open: '/api/v1/tracking/open/:notificationId.png',
      email_click: '/api/v1/tracking/click/:notificationId?url=<encoded_url>',
      twilio_webhook: '/api/v1/tracking/webhook/twilio',
      sendgrid_webhook: '/api/v1/tracking/webhook/sendgrid',
      firebase_webhook: '/api/v1/tracking/webhook/firebase',
    },
  });
});

// Middleware to validate webhook signatures (if needed)
const validateWebhookSignature = (provider: string) => {
  return (req: Request, res: Response, next: Function) => {
    try {
      switch (provider) {
        case 'twilio':
          // Twilio webhook signature validation
          const twilioSignature = req.get('X-Twilio-Signature');
          if (!twilioSignature) {
            logger.warn('Missing Twilio signature', { url: req.url });
            // In production, you might want to reject unsigned webhooks
            // return res.status(401).send('Unauthorized');
          }
          break;

        case 'sendgrid':
          // SendGrid webhook signature validation
          const sendgridSignature = req.get('X-Twilio-Email-Event-Webhook-Signature');
          if (!sendgridSignature) {
            logger.warn('Missing SendGrid signature', { url: req.url });
            // In production, you might want to reject unsigned webhooks
            // return res.status(401).send('Unauthorized');
          }
          break;

        case 'firebase':
          // Firebase webhook authentication (if implemented)
          const firebaseAuth = req.get('Authorization');
          if (!firebaseAuth) {
            logger.warn('Missing Firebase authorization', { url: req.url });
          }
          break;
      }

      next();
    } catch (error: any) {
      logger.error('Webhook signature validation error', {
        error: error.message,
        provider,
        url: req.url,
      });
      res.status(401).send('Unauthorized');
    }
  };
};

// Apply signature validation to webhook endpoints
router.use('/webhook/twilio', validateWebhookSignature('twilio'));
router.use('/webhook/sendgrid', validateWebhookSignature('sendgrid'));
router.use('/webhook/firebase', validateWebhookSignature('firebase'));

export default router;
