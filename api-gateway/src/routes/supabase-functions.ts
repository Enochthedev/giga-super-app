/**
 * Supabase Edge Functions - Swagger Documentation
 *
 * This file contains OpenAPI/Swagger documentation for all Supabase Edge Functions
 * that are proxied through the API Gateway.
 *
 * These routes are handled by the supabaseProxy middleware.
 */

// =====================================================
// USER MANAGEMENT
// =====================================================

/**
 * @openapi
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     description: |
 *       Retrieves the authenticated user's complete profile including:
 *       - Basic information (name, email, phone)
 *       - All assigned roles
 *       - Currently active role
 *       - Profile picture URL
 *       - Account verification status
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
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
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "user@example.com"
 *                     first_name:
 *                       type: string
 *                       example: "Chidi"
 *                     last_name:
 *                       type: string
 *                       example: "Okonkwo"
 *                     phone:
 *                       type: string
 *                       example: "+2348012345678"
 *                     avatar_url:
 *                       type: string
 *                       format: uri
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [CUSTOMER, VENDOR, DRIVER, HOST, ADVERTISER, ADMIN]
 *                       example: ["CUSTOMER", "DRIVER"]
 *                     active_role:
 *                       type: string
 *                       enum: [CUSTOMER, VENDOR, DRIVER, HOST, ADVERTISER, ADMIN]
 *                       example: "DRIVER"
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/v1/users/profile/update:
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: "Chidi"
 *               last_name:
 *                 type: string
 *                 example: "Okonkwo"
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Software developer based in Lagos"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/v1/users/profile/picture:
 *   post:
 *     summary: Upload profile picture
 *     description: Upload or update the user's profile picture
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP). Max 5MB.
 *     responses:
 *       200:
 *         description: Picture uploaded successfully
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
 *                     url:
 *                       type: string
 *                       format: uri
 *                       example: "https://storage.supabase.co/avatars/user123.jpg"
 *       400:
 *         description: Invalid file format or size
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/v1/users/address:
 *   post:
 *     summary: Add a new address
 *     description: Add a delivery/pickup address to the user's account
 *     tags:
 *       - User Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - address_line1
 *               - city
 *               - state
 *             properties:
 *               label:
 *                 type: string
 *                 example: "Home"
 *                 description: Label for the address (Home, Office, etc.)
 *               address_line1:
 *                 type: string
 *                 example: "15 Admiralty Way"
 *               address_line2:
 *                 type: string
 *                 example: "Lekki Phase 1"
 *               city:
 *                 type: string
 *                 example: "Lagos"
 *               state:
 *                 type: string
 *                 example: "Lagos"
 *               postal_code:
 *                 type: string
 *                 example: "101233"
 *               country:
 *                 type: string
 *                 default: "Nigeria"
 *               latitude:
 *                 type: number
 *                 format: double
 *                 example: 6.4541
 *               longitude:
 *                 type: number
 *                 format: double
 *                 example: 3.4744
 *               is_default:
 *                 type: boolean
 *                 default: false
 *           example:
 *             label: "Home"
 *             address_line1: "15 Admiralty Way"
 *             address_line2: "Lekki Phase 1"
 *             city: "Lagos"
 *             state: "Lagos"
 *             postal_code: "101233"
 *             is_default: true
 *     responses:
 *       201:
 *         description: Address added successfully
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
 *                     label:
 *                       type: string
 *                     address_line1:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

// =====================================================
// ROLE MANAGEMENT
// =====================================================

/**
 * @openapi
 * /api/v1/roles/apply:
 *   post:
 *     summary: Apply for a specialized role
 *     description: |
 *       Submit an application to become a VENDOR, DRIVER, HOST, or ADVERTISER.
 *
 *       **Application Process:**
 *       1. User submits application with required documents
 *       2. Application enters "pending" status
 *       3. Admin reviews and approves/rejects
 *       4. On approval, role is granted and profile created
 *
 *       **Required Documents by Role:**
 *       - **DRIVER**: Driver's license, vehicle registration
 *       - **VENDOR**: Business registration, tax ID
 *       - **HOST**: Property ownership proof, ID
 *       - **ADVERTISER**: Business registration
 *     tags:
 *       - Role Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_name
 *             properties:
 *               role_name:
 *                 type: string
 *                 enum: [VENDOR, DRIVER, HOST, ADVERTISER]
 *                 description: The role you're applying for
 *               application_data:
 *                 type: object
 *                 description: Role-specific information
 *                 properties:
 *                   business_name:
 *                     type: string
 *                     example: "Chidi Electronics"
 *                   business_type:
 *                     type: string
 *                     example: "Electronics"
 *                   license_number:
 *                     type: string
 *                     example: "LAG-DRV-123456"
 *                   vehicle_type:
 *                     type: string
 *                     example: "Sedan"
 *                   vehicle_model:
 *                     type: string
 *                     example: "Toyota Corolla 2022"
 *                   vehicle_plate:
 *                     type: string
 *                     example: "KJA-123-XY"
 *               document_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: URLs to uploaded supporting documents
 *           examples:
 *             vendor_application:
 *               summary: Vendor Application
 *               value:
 *                 role_name: "VENDOR"
 *                 application_data:
 *                   business_name: "Chidi Electronics"
 *                   business_type: "Electronics"
 *                   rc_number: "RC-1234567"
 *                 document_urls:
 *                   - "https://storage.supabase.co/docs/cac-certificate.pdf"
 *             driver_application:
 *               summary: Driver Application
 *               value:
 *                 role_name: "DRIVER"
 *                 application_data:
 *                   license_number: "LAG-DRV-123456"
 *                   vehicle_type: "Sedan"
 *                   vehicle_model: "Toyota Corolla 2022"
 *                   vehicle_plate: "KJA-123-XY"
 *                 document_urls:
 *                   - "https://storage.supabase.co/docs/drivers-license.pdf"
 *                   - "https://storage.supabase.co/docs/vehicle-registration.pdf"
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
 *                     application_id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: "pending"
 *                     message:
 *                       type: string
 *                       example: "Application submitted. You will be notified when reviewed."
 *       400:
 *         description: Invalid role or user already has this role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "ROLE_ALREADY_EXISTS"
 *                     message:
 *                       type: string
 *                       example: "You already have the VENDOR role"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/v1/roles/switch:
 *   post:
 *     summary: Switch active role
 *     description: |
 *       Switch to a different role that the user has been granted.
 *       The user must already have the target role assigned.
 *
 *       **Example Use Cases:**
 *       - Driver switching to Customer role to book a ride
 *       - Vendor switching to Customer to shop on the platform
 *     tags:
 *       - Role Management
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_name
 *             properties:
 *               role_name:
 *                 type: string
 *                 enum: [CUSTOMER, VENDOR, DRIVER, HOST, ADVERTISER, ADMIN]
 *                 description: The role to switch to (must be one you have)
 *           example:
 *             role_name: "DRIVER"
 *     responses:
 *       200:
 *         description: Role switched successfully
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
 *                     active_role:
 *                       type: string
 *                       example: "DRIVER"
 *                     message:
 *                       type: string
 *                       example: "Switched to DRIVER role"
 *       400:
 *         description: User doesn't have the requested role
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/v1/roles/review:
 *   post:
 *     summary: Review role application (Admin only)
 *     description: |
 *       Approve or reject a pending role application.
 *       **Requires ADMIN role.**
 *
 *       On approval:
 *       - Role is added to user's roles
 *       - Role-specific profile is created (driver_profiles, vendor_profiles, etc.)
 *       - User is notified
 *     tags:
 *       - Role Management
 *       - Admin
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - application_id
 *               - action
 *             properties:
 *               application_id:
 *                 type: string
 *                 format: uuid
 *                 description: The application to review
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Approve or reject the application
 *               review_notes:
 *                 type: string
 *                 description: Notes for the applicant (especially for rejections)
 *                 example: "Documents verified successfully"
 *           examples:
 *             approve:
 *               summary: Approve application
 *               value:
 *                 application_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 action: "approve"
 *                 review_notes: "All documents verified. Welcome aboard!"
 *             reject:
 *               summary: Reject application
 *               value:
 *                 application_id: "123e4567-e89b-12d3-a456-426614174000"
 *                 action: "reject"
 *                 review_notes: "Driver's license expired. Please upload a valid license."
 *     responses:
 *       200:
 *         description: Application reviewed successfully
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
 *                     application_id:
 *                       type: string
 *                       format: uuid
 *                     new_status:
 *                       type: string
 *                       enum: [approved, rejected]
 *                     user_notified:
 *                       type: boolean
 *                       example: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Application not found
 */

// =====================================================
// HOTEL MANAGEMENT
// =====================================================

/**
 * @openapi
 * /api/v1/hotels/search:
 *   post:
 *     summary: Search for hotels
 *     description: |
 *       Search hotels by location, dates, guests, amenities, and price range.
 *       Returns paginated results with availability and pricing.
 *     tags:
 *       - Hotels
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - location
 *               - check_in
 *               - check_out
 *             properties:
 *               location:
 *                 type: string
 *                 description: City or area to search
 *                 example: "Lagos"
 *               check_in:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-15"
 *               check_out:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-20"
 *               guests:
 *                 type: integer
 *                 minimum: 1
 *                 default: 2
 *                 example: 2
 *               rooms:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 example: 1
 *               price_min:
 *                 type: number
 *                 description: Minimum price per night in NGN
 *                 example: 10000
 *               price_max:
 *                 type: number
 *                 description: Maximum price per night in NGN
 *                 example: 100000
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required amenities
 *                 example: ["wifi", "pool", "parking", "gym"]
 *               star_rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Minimum star rating
 *                 example: 4
 *               sort_by:
 *                 type: string
 *                 enum: [price_low, price_high, rating, distance]
 *                 default: rating
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 20
 *           example:
 *             location: "Victoria Island, Lagos"
 *             check_in: "2026-03-15"
 *             check_out: "2026-03-20"
 *             guests: 2
 *             rooms: 1
 *             price_min: 25000
 *             price_max: 75000
 *             amenities: ["wifi", "pool"]
 *             star_rating: 4
 *     responses:
 *       200:
 *         description: Hotels found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Hotel'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 45
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */

/**
 * @openapi
 * /api/v1/hotels/{hotel_id}:
 *   get:
 *     summary: Get hotel details
 *     description: Get full details of a specific hotel including rooms, amenities, and reviews
 *     tags:
 *       - Hotels
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotel_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The hotel's unique identifier
 *     responses:
 *       200:
 *         description: Hotel details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Hotel'
 *                     - type: object
 *                       properties:
 *                         room_types:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                                 example: "Deluxe Suite"
 *                               price_per_night:
 *                                 type: number
 *                                 example: 45000
 *                               capacity:
 *                                 type: integer
 *                                 example: 2
 *                               amenities:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                         recent_reviews:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/HotelReview'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/v1/hotels/{hotel_id}/reviews:
 *   get:
 *     summary: Get hotel reviews
 *     description: Get paginated reviews for a specific hotel
 *     tags:
 *       - Hotels
 *       - Reviews
 *     parameters:
 *       - in: path
 *         name: hotel_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by star rating
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [newest, oldest, highest_rating, lowest_rating, most_helpful]
 *           default: newest
 *     responses:
 *       200:
 *         description: Reviews retrieved
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/HotelReview'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         average_rating:
 *                           type: number
 *                           example: 4.5
 *                         total_reviews:
 *                           type: integer
 *                           example: 234
 *                         rating_breakdown:
 *                           type: object
 *                           properties:
 *                             5: { type: integer, example: 150 }
 *                             4: { type: integer, example: 50 }
 *                             3: { type: integer, example: 20 }
 *                             2: { type: integer, example: 10 }
 *                             1: { type: integer, example: 4 }
 */

/**
 * @openapi
 * /api/v1/hotels/{hotel_id}/availability:
 *   get:
 *     summary: Check room availability
 *     description: Check room availability for specific dates
 *     tags:
 *       - Hotels
 *       - Rooms
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotel_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: check_in
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-03-15"
 *       - in: query
 *         name: check_out
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-03-20"
 *       - in: query
 *         name: guests
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 2
 *     responses:
 *       200:
 *         description: Availability information
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
 *                     available:
 *                       type: boolean
 *                       example: true
 *                     room_types:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RoomAvailability'
 */

/**
 * @openapi
 * /api/v1/hotels/{hotel_id}/price:
 *   post:
 *     summary: Calculate booking price
 *     description: Calculate the total price for a booking including taxes and fees
 *     tags:
 *       - Hotels
 *       - Bookings
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: hotel_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room_type_id
 *               - check_in
 *               - check_out
 *             properties:
 *               room_type_id:
 *                 type: string
 *                 format: uuid
 *               check_in:
 *                 type: string
 *                 format: date
 *               check_out:
 *                 type: string
 *                 format: date
 *               rooms:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               promo_code:
 *                 type: string
 *                 description: Optional promotional code
 *     responses:
 *       200:
 *         description: Price calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BookingPrice'
 */

// =====================================================
// TAXI / RIDE MANAGEMENT
// =====================================================

/**
 * @openapi
 * /api/v1/rides/request:
 *   post:
 *     summary: Request a ride
 *     description: |
 *       Request a new ride. The system will find available drivers and notify them.
 *
 *       **Vehicle Types:**
 *       - **standard**: Economy vehicles
 *       - **comfort**: Mid-range vehicles with AC
 *       - **premium**: Luxury vehicles
 *       - **xl**: Larger vehicles for groups
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup_lat
 *               - pickup_lng
 *               - dropoff_lat
 *               - dropoff_lng
 *             properties:
 *               pickup_address:
 *                 type: string
 *                 example: "Lekki Phase 1, Lagos"
 *               pickup_lat:
 *                 type: number
 *                 format: double
 *                 example: 6.4541
 *               pickup_lng:
 *                 type: number
 *                 format: double
 *                 example: 3.4744
 *               dropoff_address:
 *                 type: string
 *                 example: "Victoria Island, Lagos"
 *               dropoff_lat:
 *                 type: number
 *                 format: double
 *                 example: 6.4281
 *               dropoff_lng:
 *                 type: number
 *                 format: double
 *                 example: 3.4219
 *               vehicle_type:
 *                 type: string
 *                 enum: [standard, comfort, premium, xl]
 *                 default: standard
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, wallet]
 *                 default: cash
 *               notes:
 *                 type: string
 *                 description: Special instructions for the driver
 *                 example: "Please call when you arrive"
 *           example:
 *             pickup_address: "Lekki Phase 1, Lagos"
 *             pickup_lat: 6.4541
 *             pickup_lng: 3.4744
 *             dropoff_address: "Victoria Island, Lagos"
 *             dropoff_lat: 6.4281
 *             dropoff_lng: 3.4219
 *             vehicle_type: "comfort"
 *             payment_method: "wallet"
 *     responses:
 *       201:
 *         description: Ride requested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @openapi
 * /api/v1/rides/estimate:
 *   post:
 *     summary: Get ride price estimate
 *     description: Get estimated price and duration for a ride without booking
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup_lat
 *               - pickup_lng
 *               - dropoff_lat
 *               - dropoff_lng
 *             properties:
 *               pickup_lat:
 *                 type: number
 *                 format: double
 *                 example: 6.4541
 *               pickup_lng:
 *                 type: number
 *                 format: double
 *                 example: 3.4744
 *               dropoff_lat:
 *                 type: number
 *                 format: double
 *                 example: 6.4281
 *               dropoff_lng:
 *                 type: number
 *                 format: double
 *                 example: 3.4219
 *     responses:
 *       200:
 *         description: Estimate calculated
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
 *                     estimates:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RideEstimate'
 *                     distance_km:
 *                       type: number
 *                       example: 8.5
 *                     estimated_duration:
 *                       type: integer
 *                       description: Duration in minutes
 *                       example: 25
 */

/**
 * @openapi
 * /api/v1/rides/accept:
 *   post:
 *     summary: Accept a ride request (Driver only)
 *     description: Driver accepts a ride request. Requires DRIVER role.
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_id
 *             properties:
 *               ride_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Ride accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         description: Ride already accepted or cancelled
 *       403:
 *         description: Not a driver or not active
 */

/**
 * @openapi
 * /api/v1/rides/start:
 *   post:
 *     summary: Start a ride (Driver only)
 *     description: Driver marks that the ride has started (after passenger pickup)
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_id
 *             properties:
 *               ride_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Ride started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 */

/**
 * @openapi
 * /api/v1/rides/complete:
 *   post:
 *     summary: Complete a ride (Driver only)
 *     description: Driver marks the ride as completed and triggers payment
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_id
 *             properties:
 *               ride_id:
 *                 type: string
 *                 format: uuid
 *               final_fare:
 *                 type: number
 *                 description: Final fare (if different from estimate due to route changes)
 *     responses:
 *       200:
 *         description: Ride completed
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
 *                     ride:
 *                       $ref: '#/components/schemas/Ride'
 *                     payment_status:
 *                       type: string
 *                       enum: [pending, completed, failed]
 *                     earnings:
 *                       type: number
 *                       description: Driver's earnings for this ride
 *                       example: 2800
 */

/**
 * @openapi
 * /api/v1/rides/cancel:
 *   post:
 *     summary: Cancel a ride
 *     description: Cancel a ride request (before or after driver acceptance)
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ride_id
 *             properties:
 *               ride_id:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: "Driver is taking too long"
 *     responses:
 *       200:
 *         description: Ride cancelled
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
 *                     cancellation_fee:
 *                       type: number
 *                       description: Fee charged for late cancellation (if applicable)
 *                       example: 500
 *                     message:
 *                       type: string
 *                       example: "Ride cancelled successfully"
 */

/**
 * @openapi
 * /api/v1/rides/nearby-drivers:
 *   get:
 *     summary: Get nearby drivers
 *     description: Get list of drivers near a specific location
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *         example: 6.4541
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *         example: 3.4744
 *       - in: query
 *         name: radius_km
 *         schema:
 *           type: number
 *           default: 5
 *         description: Search radius in kilometers
 *       - in: query
 *         name: vehicle_type
 *         schema:
 *           type: string
 *           enum: [standard, comfort, premium, xl]
 *         description: Filter by vehicle type
 *     responses:
 *       200:
 *         description: Nearby drivers found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/NearbyDriver'
 */

/**
 * @openapi
 * /api/v1/rides/history:
 *   get:
 *     summary: Get ride history
 *     description: Get paginated list of user's past rides
 *     tags:
 *       - Taxi/Ride
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, cancelled, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Ride history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ride'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     pages: { type: integer }
 */

// =====================================================
// E-COMMERCE / CART
// =====================================================

/**
 * @openapi
 * /api/v1/cart:
 *   get:
 *     summary: Get user's cart
 *     description: Get the current user's shopping cart with all items
 *     tags:
 *       - E-commerce
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 */

/**
 * @openapi
 * /api/v1/cart/add:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the shopping cart
 *     tags:
 *       - E-commerce
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCartRequest'
 *           example:
 *             product_id: "123e4567-e89b-12d3-a456-426614174000"
 *             quantity: 2
 *             variant_id: "456e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Product not available or invalid quantity
 */

/**
 * @openapi
 * /api/v1/cart/checkout:
 *   post:
 *     summary: Checkout cart
 *     description: Convert cart to order and initiate payment
 *     tags:
 *       - E-commerce
 *       - Payments
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutRequest'
 *           example:
 *             address_id: "123e4567-e89b-12d3-a456-426614174000"
 *             payment_method: "card"
 *             use_wallet_balance: true
 *             coupon_code: "SAVE10"
 *             delivery_notes: "Please leave at the gate"
 *     responses:
 *       200:
 *         description: Order created
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
 *                     order:
 *                       $ref: '#/components/schemas/Order'
 *                     payment_url:
 *                       type: string
 *                       format: uri
 *                       description: URL to complete payment (if card payment)
 *       400:
 *         description: Cart is empty or invalid address
 */

// =====================================================
// CALLING SYSTEM
// =====================================================

/**
 * @openapi
 * /api/v1/calls/initiate:
 *   post:
 *     summary: Initiate a call
 *     description: Start a voice or video call with another user
 *     tags:
 *       - Calling
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InitiateCallRequest'
 *     responses:
 *       200:
 *         description: Call initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 */

/**
 * @openapi
 * /api/v1/calls/answer:
 *   post:
 *     summary: Answer an incoming call
 *     tags:
 *       - Calling
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - call_id
 *             properties:
 *               call_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Call answered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 */

/**
 * @openapi
 * /api/v1/calls/decline:
 *   post:
 *     summary: Decline an incoming call
 *     tags:
 *       - Calling
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - call_id
 *             properties:
 *               call_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Call declined
 */

/**
 * @openapi
 * /api/v1/calls/end:
 *   post:
 *     summary: End an active call
 *     tags:
 *       - Calling
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - call_id
 *             properties:
 *               call_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Call ended
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
 *                     duration_seconds:
 *                       type: integer
 *                       example: 245
 */

// =====================================================
// MEDIA / FILE UPLOADS
// =====================================================

/**
 * @openapi
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload a file
 *     description: Upload files (images, documents) to storage
 *     tags:
 *       - Files
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               bucket:
 *                 type: string
 *                 enum: [avatars, documents, products, hotels]
 *                 default: documents
 *               folder:
 *                 type: string
 *                 description: Optional folder path within bucket
 *     responses:
 *       200:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaUploadResponse'
 */

/**
 * @openapi
 * /api/v1/media/process-image:
 *   post:
 *     summary: Process an image
 *     description: Apply transformations to an uploaded image (resize, crop, optimize)
 *     tags:
 *       - Files
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image_url
 *             properties:
 *               image_url:
 *                 type: string
 *                 format: uri
 *               width:
 *                 type: integer
 *                 description: Target width
 *               height:
 *                 type: integer
 *                 description: Target height
 *               quality:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 80
 *               format:
 *                 type: string
 *                 enum: [jpeg, png, webp]
 *                 default: webp
 *     responses:
 *       200:
 *         description: Image processed
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
 *                     url:
 *                       type: string
 *                       format: uri
 *                     size:
 *                       type: integer
 *                     width:
 *                       type: integer
 *                     height:
 *                       type: integer
 */

// =====================================================
// SUPPORT
// =====================================================

/**
 * @openapi
 * /api/v1/support/tickets:
 *   get:
 *     summary: Get my support tickets
 *     description: Get list of user's support tickets
 *     tags:
 *       - Support
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, closed, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Tickets retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SupportTicket'
 */

// Export for swagger config
export {};
