import { Response, Router } from 'express';
import winston from 'winston';

import { AuthRequest, authenticate } from '../middleware/auth';
import { supabase } from '../utils/database';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

/**
 * @swagger
 * tags:
 *   - name: Public Applications
 *     description: Public endpoints for role applications (Postal Staff, Couriers, etc.)
 */

/**
 * @swagger
 * /api/public/apply/postal-staff:
 *   post:
 *     tags: [Public Applications]
 *     summary: Apply for postal staff role
 *     description: |
 *       Submit an application for a postal staff position (Postmaster, Regional Manager, or Admin Staff).
 *
 *       **Requirements:**
 *       - User must be authenticated (have a Supabase account)
 *       - User must have verified their email
 *       - User can only have one pending application at a time
 *
 *       **Process:**
 *       1. User creates account and verifies email
 *       2. User submits application via this endpoint
 *       3. Application is stored with status 'pending'
 *       4. DOP reviews and approves/rejects application
 *       5. Upon approval, roles are automatically created
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_type
 *               - first_name
 *               - last_name
 *               - email
 *               - phone
 *               - state
 *               - city
 *               - residential_address
 *             properties:
 *               staff_type:
 *                 type: string
 *                 enum: [postmaster, regional_manager, admin_staff]
 *                 description: Type of postal staff position
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 pattern: '^\+?[1-9]\d{1,14}$'
 *               state:
 *                 type: string
 *                 description: Nigerian state
 *               city:
 *                 type: string
 *               residential_address:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               employee_id:
 *                 type: string
 *                 description: Optional existing employee ID
 *               department:
 *                 type: string
 *               position:
 *                 type: string
 *               years_of_service:
 *                 type: integer
 *                 minimum: 0
 *           example:
 *             staff_type: "postmaster"
 *             first_name: "John"
 *             last_name: "Doe"
 *             email: "john.doe@example.com"
 *             phone: "+2348012345678"
 *             state: "Lagos"
 *             city: "Ikeja"
 *             residential_address: "123 Main Street, Ikeja, Lagos"
 *             date_of_birth: "1985-05-15"
 *             gender: "male"
 *             department: "Operations"
 *             position: "Postmaster"
 *             years_of_service: 5
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     staff_type:
 *                       type: string
 *                     approval_status:
 *                       type: string
 *                       example: pending
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: Application submitted successfully. You will be notified once reviewed.
 *       400:
 *         description: Bad request - Validation failed or duplicate application
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *             examples:
 *               duplicate_application:
 *                 value:
 *                   success: false
 *                   error: You already have a pending application
 *                   code: DUPLICATE_APPLICATION
 *               email_not_verified:
 *                 value:
 *                   success: false
 *                   error: Please verify your email before applying
 *                   code: EMAIL_NOT_VERIFIED
 *       401:
 *         description: Unauthorized - Must be logged in
 *       500:
 *         description: Internal server error
 */
router.post('/apply/postal-staff', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      staff_type,
      first_name,
      last_name,
      email,
      phone,
      state,
      city,
      residential_address,
      date_of_birth,
      gender,
      employee_id,
      department,
      position,
      years_of_service,
    } = req.body;

    // Validate required fields
    if (
      !staff_type ||
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !state ||
      !city ||
      !residential_address
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        details: {
          required: [
            'staff_type',
            'first_name',
            'last_name',
            'email',
            'phone',
            'state',
            'city',
            'residential_address',
          ],
        },
      });
    }

    // Validate staff_type
    const validStaffTypes = ['postmaster', 'regional_manager', 'admin_staff'];
    if (!validStaffTypes.includes(staff_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid staff type',
        code: 'INVALID_STAFF_TYPE',
        details: {
          valid_types: validStaffTypes,
        },
      });
    }

    // Check if user already has a pending application
    const { data: existingApplication, error: checkError } = await supabase
      .from('postal_staff')
      .select('id, approval_status')
      .eq('user_id', req.user!.id)
      .eq('approval_status', 'pending')
      .single();

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending application',
        code: 'DUPLICATE_APPLICATION',
        details: {
          application_id: existingApplication.id,
          message: 'Please wait for your current application to be reviewed',
        },
      });
    }

    // Create application
    const { data: application, error } = await supabase
      .from('postal_staff')
      .insert({
        staff_type,
        first_name,
        last_name,
        email,
        phone,
        state,
        city,
        residential_address,
        date_of_birth,
        gender,
        employee_id,
        department,
        position,
        years_of_service,
        user_id: req.user!.id,
        approval_status: 'pending',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create postal staff application', { error: error.message });
      throw error;
    }

    logger.info('Postal staff application created', {
      application_id: application.id,
      user_id: req.user!.id,
      staff_type,
      state,
    });

    res.status(201).json({
      success: true,
      data: {
        id: application.id,
        staff_type: application.staff_type,
        approval_status: application.approval_status,
        created_at: application.created_at,
      },
      message: 'Application submitted successfully. You will be notified once reviewed.',
    });
  } catch (error: any) {
    logger.error('Failed to submit postal staff application', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
      code: 'APPLICATION_SUBMISSION_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/public/apply/courier:
 *   post:
 *     tags: [Public Applications]
 *     summary: Apply for courier role
 *     description: |
 *       Submit an application to become a courier/delivery driver.
 *
 *       **Requirements:**
 *       - User must be authenticated
 *       - User must have verified their email
 *       - Valid driver's license required
 *       - Vehicle information required
 *
 *       **Process:**
 *       1. User creates account and verifies email
 *       2. User submits application with license and vehicle details
 *       3. Application is stored with status 'pending'
 *       4. PMG (for their state) or DOP reviews and approves/rejects
 *       5. Upon approval, courier role is automatically created
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - first_name
 *               - last_name
 *               - email
 *               - phone_number
 *               - state
 *               - license_number
 *               - license_expiry_date
 *               - vehicle_type
 *               - vehicle_registration
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone_number:
 *                 type: string
 *               state:
 *                 type: string
 *                 description: Nigerian state where courier will operate
 *               license_number:
 *                 type: string
 *               license_expiry_date:
 *                 type: string
 *                 format: date
 *               license_class:
 *                 type: string
 *               vehicle_type:
 *                 type: string
 *                 enum: [motorcycle, tricycle, car, van]
 *               vehicle_registration:
 *                 type: string
 *               vehicle_make:
 *                 type: string
 *               vehicle_model:
 *                 type: string
 *               vehicle_year:
 *                 type: integer
 *               vehicle_color:
 *                 type: string
 *               vehicle_capacity_kg:
 *                 type: number
 *                 description: Maximum cargo capacity in kilograms
 *           example:
 *             first_name: "Jane"
 *             last_name: "Smith"
 *             email: "jane.smith@example.com"
 *             phone_number: "+2348098765432"
 *             state: "Lagos"
 *             license_number: "LAG123456"
 *             license_expiry_date: "2026-12-31"
 *             license_class: "C"
 *             vehicle_type: "motorcycle"
 *             vehicle_registration: "ABC-123-XY"
 *             vehicle_make: "Honda"
 *             vehicle_model: "CB125"
 *             vehicle_year: 2022
 *             vehicle_color: "Red"
 *             vehicle_capacity_kg: 50
 *     responses:
 *       201:
 *         description: Courier application submitted successfully
 *       400:
 *         description: Bad request - Validation failed or duplicate application
 *       401:
 *         description: Unauthorized - Must be logged in
 *       500:
 *         description: Internal server error
 */
router.post('/apply/courier', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      state,
      license_number,
      license_expiry_date,
      license_class,
      vehicle_type,
      vehicle_registration,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      vehicle_capacity_kg,
    } = req.body;

    // Validate required fields
    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone_number ||
      !state ||
      !license_number ||
      !license_expiry_date ||
      !vehicle_type ||
      !vehicle_registration
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_REQUIRED_FIELDS',
        details: {
          required: [
            'first_name',
            'last_name',
            'email',
            'phone_number',
            'state',
            'license_number',
            'license_expiry_date',
            'vehicle_type',
            'vehicle_registration',
          ],
        },
      });
    }

    // Validate vehicle type
    const validVehicleTypes = ['motorcycle', 'tricycle', 'car', 'van'];
    if (!validVehicleTypes.includes(vehicle_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vehicle type',
        code: 'INVALID_VEHICLE_TYPE',
        details: {
          valid_types: validVehicleTypes,
        },
      });
    }

    // Check if user already has a pending application
    const { data: existingApplication } = await supabase
      .from('courier_profiles')
      .select('id, approval_status')
      .eq('user_id', req.user!.id)
      .eq('approval_status', 'pending')
      .single();

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending courier application',
        code: 'DUPLICATE_APPLICATION',
        details: {
          application_id: existingApplication.id,
        },
      });
    }

    // Generate courier code
    const courierCode = `COU-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create courier application
    const { data: application, error } = await supabase
      .from('courier_profiles')
      .insert({
        user_id: req.user!.id,
        courier_code: courierCode,
        first_name,
        last_name,
        email,
        phone_number,
        state,
        license_number,
        license_expiry_date,
        vehicle_type,
        vehicle_registration,
        vehicle_capacity_kg: vehicle_capacity_kg || 50,
        approval_status: 'pending',
        is_verified: false,
        is_active: true,
        is_online: false,
        rating: 0,
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create courier application', { error: error.message });
      throw error;
    }

    logger.info('Courier application created', {
      application_id: application.id,
      user_id: req.user!.id,
      state,
      vehicle_type,
    });

    res.status(201).json({
      success: true,
      data: {
        id: application.id,
        courier_code: application.courier_code,
        approval_status: application.approval_status,
        created_at: application.created_at,
      },
      message: 'Courier application submitted successfully. You will be notified once reviewed.',
    });
  } catch (error: any) {
    logger.error('Failed to submit courier application', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
      code: 'APPLICATION_SUBMISSION_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/public/my-applications:
 *   get:
 *     tags: [Public Applications]
 *     summary: Get current user's applications
 *     description: Retrieve all applications submitted by the authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     postal_staff:
 *                       type: array
 *                       items:
 *                         type: object
 *                     courier:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/my-applications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Get postal staff applications
    const { data: postalStaffApps, error: postalError } = await supabase
      .from('postal_staff')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (postalError) throw postalError;

    // Get courier applications
    const { data: courierApps, error: courierError } = await supabase
      .from('courier_profiles')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (courierError) throw courierError;

    res.json({
      success: true,
      data: {
        postal_staff: postalStaffApps || [],
        courier: courierApps || [],
      },
    });
  } catch (error: any) {
    logger.error('Failed to get user applications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
    });
  }
});

export default router;
