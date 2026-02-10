import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess } from '../middleware/auth';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     tags: [Admin Panel]
 *     summary: Get business categories
 *     description: Retrieve list of all business categories available in the platform
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       icon:
 *                         type: string
 *                       color:
 *                         type: string
 *             example:
 *               success: true
 *               data:
 *                 - id: "ecommerce"
 *                   name: "E-commerce"
 *                   description: "Online marketplace and trading"
 *                   icon: "shopping-cart"
 *                   color: "#3B82F6"
 *                 - id: "hotel"
 *                   name: "Hotel Booking"
 *                   description: "Hotel reservations and management"
 *                   icon: "hotel"
 *                   color: "#8B5CF6"
 *                 - id: "taxi"
 *                   name: "Taxi Services"
 *                   description: "Ride-hailing and transportation"
 *                   icon: "car"
 *                   color: "#10B981"
 *                 - id: "media"
 *                   name: "Media & Social"
 *                   description: "Social media and content management"
 *                   icon: "image"
 *                   color: "#F59E0B"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/categories',
  authenticate,
  requireAnyAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const categories = [
        {
          id: 'ecommerce',
          name: 'E-commerce',
          description: 'Online marketplace and trading',
          icon: 'shopping-cart',
          color: '#3B82F6',
        },
        {
          id: 'hotel',
          name: 'Hotel Booking',
          description: 'Hotel reservations and management',
          icon: 'hotel',
          color: '#8B5CF6',
        },
        {
          id: 'taxi',
          name: 'Taxi Services',
          description: 'Ride-hailing and transportation',
          icon: 'car',
          color: '#10B981',
        },
        {
          id: 'media',
          name: 'Media & Social',
          description: 'Social media and content management',
          icon: 'image',
          color: '#F59E0B',
        },
      ];

      await createAudit(req, 'view_categories', 'business_categories');

      res.json({ success: true, data: categories });
    } catch (error: any) {
      logger.error('Failed to get categories', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
);

export default router;
