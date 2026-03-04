import * as admin from 'firebase-admin';
import winston from 'winston';

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

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Returns true if successful, false if credentials not available
 */
function initializeFirebase(): boolean {
  if (firebaseInitialized) {
    return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    logger.warn('Firebase credentials not configured, push notifications will be disabled');
    return false;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
        clientEmail,
      }),
    });

    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Send push notification to a single device
 */
export async function sendPushNotification(
  deviceToken: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<boolean> {
  if (!initializeFirebase()) {
    logger.warn('Push notification skipped - Firebase not configured');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      token: deviceToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'ride_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    await admin.messaging().send(message);
    logger.info('Push notification sent successfully', {
      deviceToken: deviceToken.substring(0, 10) + '...',
    });
    return true;
  } catch (error) {
    logger.error('Failed to send push notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      deviceToken: deviceToken.substring(0, 10) + '...',
    });
    return false;
  }
}

/**
 * Send push notification to multiple devices
 */
export async function sendMulticastPushNotification(
  deviceTokens: string[],
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<{ successCount: number; failureCount: number }> {
  if (!initializeFirebase()) {
    logger.warn('Push notifications skipped - Firebase not configured');
    return { successCount: 0, failureCount: deviceTokens.length };
  }

  if (deviceTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens: deviceTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'ride_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    logger.info('Multicast push notifications sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
      totalCount: deviceTokens.length,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Failed to send multicast push notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
      deviceCount: deviceTokens.length,
    });
    return { successCount: 0, failureCount: deviceTokens.length };
  }
}

/**
 * Send push notification to a topic (e.g., all drivers)
 */
export async function sendTopicPushNotification(
  topic: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<boolean> {
  if (!initializeFirebase()) {
    logger.warn('Push notification skipped - Firebase not configured');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'ride_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    await admin.messaging().send(message);
    logger.info('Topic push notification sent successfully', { topic });
    return true;
  } catch (error) {
    logger.error('Failed to send topic push notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      topic,
    });
    return false;
  }
}

/**
 * Subscribe device tokens to a topic
 */
export async function subscribeToTopic(
  deviceTokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  if (!initializeFirebase()) {
    logger.warn('Topic subscription skipped - Firebase not configured');
    return { successCount: 0, failureCount: deviceTokens.length };
  }

  try {
    const response = await admin.messaging().subscribeToTopic(deviceTokens, topic);

    logger.info('Devices subscribed to topic', {
      topic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Failed to subscribe devices to topic', {
      error: error instanceof Error ? error.message : 'Unknown error',
      topic,
    });
    return { successCount: 0, failureCount: deviceTokens.length };
  }
}

/**
 * Unsubscribe device tokens from a topic
 */
export async function unsubscribeFromTopic(
  deviceTokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  if (!initializeFirebase()) {
    logger.warn('Topic unsubscription skipped - Firebase not configured');
    return { successCount: 0, failureCount: deviceTokens.length };
  }

  try {
    const response = await admin.messaging().unsubscribeFromTopic(deviceTokens, topic);

    logger.info('Devices unsubscribed from topic', {
      topic,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    logger.error('Failed to unsubscribe devices from topic', {
      error: error instanceof Error ? error.message : 'Unknown error',
      topic,
    });
    return { successCount: 0, failureCount: deviceTokens.length };
  }
}

/**
 * Check if Firebase is configured and available
 */
export function isFirebaseAvailable(): boolean {
  return initializeFirebase();
}
