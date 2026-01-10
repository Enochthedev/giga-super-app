import { Queue, Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
import express from 'express';
import IORedis from 'ioredis';
import nodemailer from 'nodemailer';
import { Twilio } from 'twilio';
import winston from 'winston';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3007', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// Redis connection
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Notification Queues
export const emailQueue = new Queue('email-notifications', { connection });
export const smsQueue = new Queue('sms-notifications', { connection });
export const pushQueue = new Queue('push-notifications', { connection });

// Email Worker
const emailWorker = new Worker(
  'email-notifications',
  async (job: Job) => {
    const { to, subject, html, text } = job.data;
    
    logger.info('Sending email', { to, subject, jobId: job.id });

    try {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'notifications@giga.com',
        to,
        subject,
        html,
        text,
      });

      logger.info('Email sent successfully', { to, jobId: job.id });
      return { success: true, to };
    } catch (error: any) {
      logger.error('Failed to send email', { error: error.message, to });
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

// SMS Worker
const smsWorker = new Worker(
  'sms-notifications',
  async (job: Job) => {
    const { to, message } = job.data;
    
    logger.info('Sending SMS', { to, jobId: job.id });

    if (!twilioClient) {
      logger.warn('Twilio not configured, skipping SMS');
      return { success: false, message: 'Twilio not configured' };
    }

    try {
      await twilioClient.messages.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: message,
      });

      logger.info('SMS sent successfully', { to, jobId: job.id });
      return { success: true, to };
    } catch (error: any) {
      logger.error('Failed to send SMS', { error: error.message, to });
      throw error;
    }
  },
  { connection, concurrency: 10 }
);

// Push Notification Worker (placeholder for Firebase/OneSignal integration)
const pushWorker = new Worker(
  'push-notifications',
  async (job: Job) => {
    const { userId, title, body, data } = job.data;
    
    logger.info('Sending push notification', { userId, title, jobId: job.id });

    // TODO: Integrate with Firebase Cloud Messaging or OneSignal
    logger.warn('Push notifications not implemented yet');

    return { success: true, userId };
  },
  { connection, concurrency: 20 }
);

// Express app
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notifications-service',
    timestamp: new Date().toISOString(),
  });
});

// Send notification endpoint
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { type, ...data } = req.body;

    let job;
    if (type === 'email') {
      job = await emailQueue.add('send-email', data, { attempts: 3 });
    } else if (type === 'sms') {
      job = await smsQueue.add('send-sms', data, { attempts: 3 });
    } else if (type === 'push') {
      job = await pushQueue.add('send-push', data, { attempts: 3 });
    } else {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    res.status(202).json({ success: true, jobId: job.id, type });
  } catch (error: any) {
    logger.error('Failed to queue notification', { error: error.message });
    res.status(500).json({ error: 'Failed to queue notification' });
  }
});

// Worker event listeners
[emailWorker, smsWorker, pushWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info(`${worker.name} job completed`, { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logger.error(`${worker.name} job failed`, { jobId: job?.id, error: error.message });
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Notifications Service started`, { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailWorker.close();
  await smsWorker.close();
  await pushWorker.close();
  await connection.quit();
  process.exit(0);
});

export default app;
