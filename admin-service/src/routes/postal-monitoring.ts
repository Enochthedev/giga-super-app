import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import { AuthRequest, authenticate, requireAnyAccess } from '../middleware/auth';
import { calculatePagination, getPaginationRange, supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * /api/postal-monitoring/staff:
 *   get:
 *     tags: [Postal Monitoring]
 *     summary: Get postal staff listing
 *     description: Retrieve paginated list of postal staff with search and filtering
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, staff ID, or email
 *         example: 'john'
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region
 *         example: 'lagos'
 *       - in: query
 *         name: office_location
 *         schema:
 *           type: string
 *         description: Filter by office location
 *         example: 'victoria island'
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *         description: Filter by position
 *         example: 'postal officer'
 *     responses:
 *       200:
 *         description: Staff retrieved successfully
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
 *                         format: uuid
 *                       staff_id:
 *                         type: string
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       position:
 *                         type: string
 *                       department:
 *                         type: string
 *                       office_location:
 *                         type: string
 *                       region:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *             example:
 *               success: true
 *               data:
 *                 - id: "s1234567-89ab-cdef-0123-456789abcdef"
 *                   staff_id: "NIPOST001234"
 *                   first_name: "David"
 *                   last_name: "Okafor"
 *                   email: "david.okafor@nipost.gov.ng"
 *                   phone: "+2348012345678"
 *                   position: "Postal Officer"
 *                   department: "Operations"
 *                   office_location: "Lagos Central Post Office"
 *                   region: "Lagos"
 *                   is_active: true
 *                   created_at: "2025-01-15T10:30:00Z"
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 450
 *                 pages: 23
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/staff', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, region, office_location, position } = req.query;
    const { from, to } = getPaginationRange(page as string, limit as string);

    let query = supabase
      .from('nipost_officials')
      .select(
        `
        id,
        employee_id,
        user_id,
        position,
        rank,
        department,
        clearance_level,
        is_active,
        created_at,
        user_profiles!nipost_officials_user_id_fkey(first_name, last_name, email, phone),
        nipost_offices!nipost_officials_office_id_fkey(office_name, city, state_province),
        nipost_regions!nipost_officials_region_id_fkey(region_name, region_code)
      `,
        { count: 'exact' }
      )
      .range(from, to)
      .order('created_at', { ascending: false });

    if (search) {
      // Search in user profile fields via join
      const { data: searchResults } = await supabase
        .from('user_profiles')
        .select('id')
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);

      const userIds = searchResults?.map((u: any) => u.id) || [];

      if (userIds.length > 0) {
        query = query.or(`user_id.in.(${userIds.join(',')}),employee_id.ilike.%${search}%`);
      } else {
        query = query.ilike('employee_id', `%${search}%`);
      }
    }

    if (region) {
      const { data: regionData } = await supabase
        .from('nipost_regions')
        .select('id')
        .or(`region_name.ilike.%${region}%,region_code.ilike.%${region}%`)
        .limit(1)
        .single();

      if (regionData) {
        query = query.eq('region_id', regionData.id);
      }
    }

    if (office_location) {
      const { data: officeData } = await supabase
        .from('nipost_offices')
        .select('id')
        .or(`office_name.ilike.%${office_location}%,city.ilike.%${office_location}%`)
        .limit(1)
        .single();

      if (officeData) {
        query = query.eq('office_id', officeData.id);
      }
    }

    if (position) {
      query = query.ilike('position', `%${position}%`);
    }

    const { data: staff, count, error } = await query;

    if (error) throw error;

    await createAudit(req, 'view_postal_staff', 'postal_monitoring');

    res.json({
      success: true,
      data: staff,
      pagination: calculatePagination(page as string, limit as string, count || 0),
    });
  } catch (error: any) {
    logger.error('Failed to get postal staff', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch postal staff' });
  }
});

export default router;
