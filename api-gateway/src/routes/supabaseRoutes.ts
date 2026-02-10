/**
 * Supabase Routes Documentation
 *
 * This file contains JSDoc/OpenAPI documentation for all Supabase-proxied endpoints.
 * These endpoints are handled by the supabaseProxy middleware.
 */

// ===================== HOTEL ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/hotels/search:
 *   get:
 *     summary: Search hotels
 *     description: Search for hotels with filtering by location, dates, price, and amenities
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City to search in
 *         example: Lagos
 *       - in: query
 *         name: check_in
 *         schema:
 *           type: string
 *           format: date
 *         example: '2024-03-15'
 *       - in: query
 *         name: check_out
 *         schema:
 *           type: string
 *           format: date
 *         example: '2024-03-18'
 *       - in: query
 *         name: guests
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 2
 *       - in: query
 *         name: rooms
 *         schema:
 *           type: integer
 *           minimum: 1
 *         example: 1
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: amenities
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by amenities (comma-separated)
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: List of matching hotels
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */

/**
 * @openapi
 * /api/v1/hotels/{id}:
 *   get:
 *     summary: Get hotel details
 *     description: Get detailed information about a specific hotel including rooms and amenities
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel ID
 *     responses:
 *       200:
 *         description: Hotel details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Hotel'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/reviews:
 *   get:
 *     summary: Get hotel reviews
 *     description: Fetch reviews for a specific hotel with pagination
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: List of reviews
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
 *                     $ref: '#/components/schemas/HotelReview'
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/availability:
 *   get:
 *     summary: Check room availability
 *     description: Check available rooms for specific dates
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
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
 *       - in: query
 *         name: check_out
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: guests
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Available rooms
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
 *                     $ref: '#/components/schemas/RoomAvailability'
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/price:
 *   post:
 *     summary: Calculate booking price
 *     description: Calculate total price including taxes and fees for a booking
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - room_type
 *               - check_in
 *               - check_out
 *             properties:
 *               room_type:
 *                 type: string
 *                 example: deluxe
 *               check_in:
 *                 type: string
 *                 format: date
 *               check_out:
 *                 type: string
 *                 format: date
 *               rooms:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Calculated price breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BookingPrice'
 *     security:
 *       - BearerAuth: []
 */

// ===================== RIDE/TAXI ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/rides/request:
 *   post:
 *     summary: Request a ride
 *     description: Request a new ride with pickup and dropoff locations
 *     tags:
 *       - Taxi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RideRequest'
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
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/accept:
 *   post:
 *     summary: Accept a ride (Driver)
 *     description: Driver accepts a ride request
 *     tags:
 *       - Taxi
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
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/start:
 *   post:
 *     summary: Start a ride (Driver)
 *     description: Driver starts the ride after passenger pickup
 *     tags:
 *       - Taxi
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
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/complete:
 *   post:
 *     summary: Complete a ride (Driver)
 *     description: Driver marks the ride as completed
 *     tags:
 *       - Taxi
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
 *                 description: Calculated final fare
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
 *                 data:
 *                   $ref: '#/components/schemas/Ride'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/cancel:
 *   post:
 *     summary: Cancel a ride
 *     description: Cancel an ongoing or requested ride
 *     tags:
 *       - Taxi
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
 *                 example: Changed plans
 *     responses:
 *       200:
 *         description: Ride cancelled
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/estimate:
 *   post:
 *     summary: Get ride estimate
 *     description: Get price and time estimate for a ride
 *     tags:
 *       - Taxi
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
 *                 example: 6.4281
 *               pickup_lng:
 *                 type: number
 *                 example: 3.4219
 *               dropoff_lat:
 *                 type: number
 *                 example: 6.6018
 *               dropoff_lng:
 *                 type: number
 *                 example: 3.3515
 *     responses:
 *       200:
 *         description: Ride estimates for all vehicle types
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
 *                     $ref: '#/components/schemas/RideEstimate'
 */

/**
 * @openapi
 * /api/v1/rides/nearby-drivers:
 *   get:
 *     summary: Get nearby drivers
 *     description: Find available drivers near a location
 *     tags:
 *       - Taxi
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         example: 6.4281
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         example: 3.4219
 *       - in: query
 *         name: vehicle_type
 *         schema:
 *           type: string
 *           enum: [standard, comfort, premium, xl]
 *       - in: query
 *         name: radius_km
 *         schema:
 *           type: number
 *           default: 5
 *     responses:
 *       200:
 *         description: List of nearby drivers
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
 *                     $ref: '#/components/schemas/NearbyDriver'
 */

/**
 * @openapi
 * /api/v1/rides/history:
 *   get:
 *     summary: Get ride history
 *     description: Get user's ride history with pagination
 *     tags:
 *       - Taxi
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, cancelled]
 *     responses:
 *       200:
 *         description: Ride history
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *     security:
 *       - BearerAuth: []
 */

// ===================== CART/E-COMMERCE ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/cart:
 *   get:
 *     summary: Get user's cart
 *     description: Retrieve the current user's shopping cart
 *     tags:
 *       - E-commerce
 *     responses:
 *       200:
 *         description: User's cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/cart/add:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product to the shopping cart
 *     tags:
 *       - E-commerce
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCartRequest'
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
 *                 data:
 *                   $ref: '#/components/schemas/Cart'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/cart/checkout:
 *   post:
 *     summary: Checkout cart
 *     description: Process checkout and create an order
 *     tags:
 *       - E-commerce
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *     security:
 *       - BearerAuth: []
 */

// ===================== USER PROFILE ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/users/profile:
 *   get:
 *     summary: Get user profile
 *     description: Get the current user's profile information
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/users/profile/update:
 *   put:
 *     summary: Update user profile
 *     description: Update the current user's profile information
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/users/profile/picture:
 *   post:
 *     summary: Upload profile picture
 *     description: Upload a new profile picture
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Picture uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaUploadResponse'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/users/address:
 *   post:
 *     summary: Add user address
 *     description: Add a new address to the user's address book
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddAddressRequest'
 *     responses:
 *       201:
 *         description: Address added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Address'
 *     security:
 *       - BearerAuth: []
 */

// ===================== CALL ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/calls/initiate:
 *   post:
 *     summary: Initiate a call
 *     description: Start a voice or video call with another user
 *     tags:
 *       - Social Media
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
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/calls/answer:
 *   post:
 *     summary: Answer a call
 *     description: Answer an incoming call
 *     tags:
 *       - Social Media
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
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/calls/decline:
 *   post:
 *     summary: Decline a call
 *     description: Decline an incoming call
 *     tags:
 *       - Social Media
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
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/calls/end:
 *   post:
 *     summary: End a call
 *     description: End an ongoing call
 *     tags:
 *       - Social Media
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
 *                 data:
 *                   $ref: '#/components/schemas/Call'
 *     security:
 *       - BearerAuth: []
 */

// ===================== ROLE ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/roles/switch:
 *   post:
 *     summary: Switch active role
 *     description: Switch between user roles (e.g., user to driver)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, driver, vendor, courier]
 *                 example: driver
 *     responses:
 *       200:
 *         description: Role switched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/roles/apply:
 *   post:
 *     summary: Apply for a role
 *     description: Submit an application for a new role (driver, vendor, etc.)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplyForRoleRequest'
 *     responses:
 *       201:
 *         description: Application submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RoleApplication'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/roles/review:
 *   post:
 *     summary: Review role application (Admin)
 *     description: Approve or reject a role application
 *     tags:
 *       - Admin Panel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - application_id
 *               - decision
 *             properties:
 *               application_id:
 *                 type: string
 *                 format: uuid
 *               decision:
 *                 type: string
 *                 enum: [approved, rejected]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application reviewed
 *     security:
 *       - BearerAuth: []
 */

// ===================== MEDIA ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload file
 *     description: Upload a file to storage
 *     tags:
 *       - Social Media
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               bucket:
 *                 type: string
 *                 enum: [avatars, posts, documents]
 *                 default: posts
 *     responses:
 *       200:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaUploadResponse'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/media/process-image:
 *   post:
 *     summary: Process image
 *     description: Resize, crop, or optimize an image
 *     tags:
 *       - Social Media
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
 *               height:
 *                 type: integer
 *               quality:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 80
 *     responses:
 *       200:
 *         description: Processed image URL
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
 *                     url:
 *                       type: string
 *                       format: uri
 *     security:
 *       - BearerAuth: []
 */

// ===================== SUPPORT ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/support/tickets:
 *   get:
 *     summary: Get my support tickets
 *     description: Get the current user's support tickets
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: User's support tickets
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
 *                     $ref: '#/components/schemas/SupportTicket'
 *     security:
 *       - BearerAuth: []
 */

// ===================== BOOKING ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/bookings:
 *   post:
 *     summary: Create a booking
 *     description: Create a new hotel booking
 *     tags:
 *       - Hotels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hotel_id
 *               - room_type
 *               - check_in
 *               - check_out
 *             properties:
 *               hotel_id:
 *                 type: string
 *                 format: uuid
 *               room_type:
 *                 type: string
 *               check_in:
 *                 type: string
 *                 format: date
 *               check_out:
 *                 type: string
 *                 format: date
 *               guests:
 *                 type: integer
 *                 default: 1
 *               special_requests:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 enum: [card, wallet, pay_at_hotel]
 *     responses:
 *       201:
 *         description: Booking created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/bookings:
 *   get:
 *     summary: Get user bookings
 *     description: Get all bookings for the authenticated user
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, checked_in, completed, cancelled]
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: User's bookings
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/bookings/{id}:
 *   get:
 *     summary: Get booking details
 *     description: Get detailed information about a specific booking
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel booking
 *     description: Cancel an existing booking
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/bookings/{id}/modify:
 *   put:
 *     summary: Modify booking
 *     description: Modify booking dates or details
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               check_in:
 *                 type: string
 *                 format: date
 *               check_out:
 *                 type: string
 *                 format: date
 *               guests:
 *                 type: integer
 *               special_requests:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking modified
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/bookings/{id}/check-in:
 *   post:
 *     summary: Check in guest
 *     description: Check in a guest for their booking (Hotel staff)
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Guest checked in
 *     security:
 *       - BearerAuth: []
 */

// ===================== PAYMENT ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/payments/initialize:
 *   post:
 *     summary: Initialize payment
 *     description: Initialize a payment transaction with Paystack or Stripe
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - email
 *               - reference_type
 *               - reference_id
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in kobo/cents
 *                 example: 500000
 *               email:
 *                 type: string
 *                 format: email
 *               currency:
 *                 type: string
 *                 enum: [NGN, USD]
 *                 default: NGN
 *               reference_type:
 *                 type: string
 *                 enum: [booking, order, ride, wallet_topup]
 *               reference_id:
 *                 type: string
 *                 format: uuid
 *               callback_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Payment initialized
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
 *                     authorization_url:
 *                       type: string
 *                       format: uri
 *                     access_code:
 *                       type: string
 *                     reference:
 *                       type: string
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/payments/verify:
 *   post:
 *     summary: Verify payment
 *     description: Verify a payment transaction status
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *             properties:
 *               reference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verification result
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
 *                     status:
 *                       type: string
 *                       enum: [success, failed, pending]
 *                     amount:
 *                       type: number
 *                     paid_at:
 *                       type: string
 *                       format: date-time
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/payments/webhook/paystack:
 *   post:
 *     summary: Paystack webhook
 *     description: Handle Paystack payment webhooks
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */

/**
 * @openapi
 * /api/v1/payments/webhook/stripe:
 *   post:
 *     summary: Stripe webhook
 *     description: Handle Stripe payment webhooks
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 */

/**
 * @openapi
 * /api/v1/wallet/topup:
 *   post:
 *     summary: Top up wallet
 *     description: Add funds to user's wallet
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1000
 *                 example: 10000
 *     responses:
 *       200:
 *         description: Wallet top-up initiated
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/wallet/pay:
 *   post:
 *     summary: Pay with wallet
 *     description: Make a payment using wallet balance
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - reference_type
 *               - reference_id
 *             properties:
 *               amount:
 *                 type: number
 *               reference_type:
 *                 type: string
 *                 enum: [booking, order, ride]
 *               reference_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Payment successful
 *       400:
 *         description: Insufficient balance
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/payments/{id}/refund:
 *   post:
 *     summary: Process refund
 *     description: Initiate a refund for a payment
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Partial refund amount (optional)
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund initiated
 *     security:
 *       - BearerAuth: []
 */

// ===================== SOCIAL ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/social/posts:
 *   post:
 *     summary: Create a post
 *     description: Create a new social media post
 *     tags:
 *       - Social Media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 5000
 *               media_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               visibility:
 *                 type: string
 *                 enum: [public, friends, private]
 *                 default: public
 *     responses:
 *       201:
 *         description: Post created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/feed:
 *   get:
 *     summary: Get social feed
 *     description: Get personalized social media feed
 *     tags:
 *       - Social Media
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Social feed posts
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/posts/{id}/like:
 *   post:
 *     summary: Like a post
 *     description: Like or unlike a post
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post liked/unliked
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/posts/{id}/comment:
 *   post:
 *     summary: Comment on post
 *     description: Add a comment to a post
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/stories:
 *   post:
 *     summary: Create a story
 *     description: Create a new story (expires in 24h)
 *     tags:
 *       - Social Media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - media_url
 *             properties:
 *               media_url:
 *                 type: string
 *                 format: uri
 *               caption:
 *                 type: string
 *     responses:
 *       201:
 *         description: Story created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/stories:
 *   get:
 *     summary: Get stories
 *     description: Get stories from friends
 *     tags:
 *       - Social Media
 *     responses:
 *       200:
 *         description: List of stories
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/friends/request:
 *   post:
 *     summary: Send friend request
 *     description: Send a friend request to another user
 *     tags:
 *       - Social Media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Friend request sent
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/friends:
 *   get:
 *     summary: Get friends list
 *     description: Get user's friends
 *     tags:
 *       - Social Media
 *     responses:
 *       200:
 *         description: Friends list
 *     security:
 *       - BearerAuth: []
 */

// ===================== NOTIFICATION ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/notifications/send:
 *   post:
 *     summary: Send notification
 *     description: Send a push notification to a user
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - body
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               data:
 *                 type: object
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [push, email, sms]
 *     responses:
 *       200:
 *         description: Notification sent
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/notifications/history:
 *   get:
 *     summary: Get notification history
 *     description: Get user's notification history
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Notification history
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     description: Update user's notification preferences
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               push_enabled:
 *                 type: boolean
 *               email_enabled:
 *                 type: boolean
 *               sms_enabled:
 *                 type: boolean
 *               marketing:
 *                 type: boolean
 *               ride_updates:
 *                 type: boolean
 *               order_updates:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated
 *     security:
 *       - BearerAuth: []
 */

// ===================== VENDOR ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/vendor/apply:
 *   post:
 *     summary: Apply as vendor
 *     description: Submit application to become a vendor
 *     tags:
 *       - E-commerce
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - business_name
 *               - business_type
 *               - phone
 *             properties:
 *               business_name:
 *                 type: string
 *               business_type:
 *                 type: string
 *                 enum: [individual, company]
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Application submitted
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/vendor/balance:
 *   get:
 *     summary: Get vendor balance
 *     description: Get vendor's earnings balance and payout info
 *     tags:
 *       - E-commerce
 *     responses:
 *       200:
 *         description: Vendor balance
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
 *                     available_balance:
 *                       type: number
 *                     pending_balance:
 *                       type: number
 *                     total_earnings:
 *                       type: number
 *                     currency:
 *                       type: string
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/vendor/payout/request:
 *   post:
 *     summary: Request payout
 *     description: Request a payout of vendor earnings
 *     tags:
 *       - E-commerce
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               bank_code:
 *                 type: string
 *               account_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout requested
 *     security:
 *       - BearerAuth: []
 */

// ===================== HOTEL MANAGEMENT ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/hotels:
 *   post:
 *     summary: Create hotel (Manager)
 *     description: Register a new hotel
 *     tags:
 *       - Hotels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - city
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               star_rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Hotel created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/{id}:
 *   put:
 *     summary: Update hotel (Manager)
 *     description: Update hotel details
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Hotel updated
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/rooms:
 *   post:
 *     summary: Create room type (Manager)
 *     description: Add a new room type to hotel
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - name
 *               - price_per_night
 *               - max_guests
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price_per_night:
 *                 type: number
 *               max_guests:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Room type created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/analytics:
 *   get:
 *     summary: Get hotel analytics (Manager)
 *     description: Get booking and revenue analytics for hotel
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *           default: 30d
 *     responses:
 *       200:
 *         description: Hotel analytics
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/reviews/{reviewId}/respond:
 *   post:
 *     summary: Respond to review (Manager)
 *     description: Post a response to a guest review
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: reviewId
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
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response posted
 *     security:
 *       - BearerAuth: []
 */

// ===================== DRIVER ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/driver/verify:
 *   post:
 *     summary: Verify driver (Admin)
 *     description: Verify a driver's documents and approve them
 *     tags:
 *       - Admin Panel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driver_id
 *               - status
 *             properties:
 *               driver_id:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver verification updated
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/driver/availability:
 *   put:
 *     summary: Update driver availability
 *     description: Toggle driver online/offline status
 *     tags:
 *       - Taxi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - available
 *             properties:
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/driver/location:
 *   put:
 *     summary: Update driver location
 *     description: Update driver's current location
 *     tags:
 *       - Taxi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               heading:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/driver/earnings:
 *   get:
 *     summary: Get driver earnings
 *     description: Get driver's earnings summary and history
 *     tags:
 *       - Taxi
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: today
 *     responses:
 *       200:
 *         description: Earnings summary
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/{id}/rate:
 *   post:
 *     summary: Rate driver
 *     description: Rate a driver after ride completion
 *     tags:
 *       - Taxi
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               tip:
 *                 type: number
 *     responses:
 *       200:
 *         description: Rating submitted
 *     security:
 *       - BearerAuth: []
 */

// ===================== ADVERTISEMENT ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/ads/campaigns:
 *   post:
 *     summary: Create ad campaign
 *     description: Create a new advertising campaign
 *     tags:
 *       - Advertisement Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - budget
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [banner, interstitial, native, video]
 *               budget:
 *                 type: number
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               targeting:
 *                 type: object
 *     responses:
 *       201:
 *         description: Campaign created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/ads/campaigns:
 *   get:
 *     summary: Get my campaigns
 *     description: Get advertiser's campaigns
 *     tags:
 *       - Advertisement Management
 *     responses:
 *       200:
 *         description: List of campaigns
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/ads/fetch:
 *   get:
 *     summary: Fetch ads
 *     description: Fetch relevant ads for display
 *     tags:
 *       - Advertisement Management
 *     parameters:
 *       - in: query
 *         name: placement
 *         schema:
 *           type: string
 *           enum: [home, search, ride, checkout]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [banner, native]
 *     responses:
 *       200:
 *         description: Ads to display
 */

/**
 * @openapi
 * /api/v1/ads/analytics:
 *   get:
 *     summary: Get ad analytics
 *     description: Get analytics for advertising campaigns
 *     tags:
 *       - Advertisement Management
 *     parameters:
 *       - in: query
 *         name: campaign_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *     responses:
 *       200:
 *         description: Campaign analytics
 *     security:
 *       - BearerAuth: []
 */

// ===================== COURIER/DELIVERY ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/courier/onboard:
 *   post:
 *     summary: Onboard courier
 *     description: Register as a courier/delivery partner
 *     tags:
 *       - Delivery
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vehicle_type
 *               - documents
 *             properties:
 *               vehicle_type:
 *                 type: string
 *                 enum: [bicycle, motorcycle, car, van]
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               coverage_area:
 *                 type: string
 *     responses:
 *       201:
 *         description: Courier registered
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/courier/assignments:
 *   get:
 *     summary: Get courier assignments
 *     description: Get list of delivery assignments for courier
 *     tags:
 *       - Delivery
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed]
 *     responses:
 *       200:
 *         description: List of assignments
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/courier/availability:
 *   put:
 *     summary: Update courier availability
 *     description: Toggle courier online/offline status
 *     tags:
 *       - Delivery
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - available
 *             properties:
 *               available:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/courier/earnings:
 *   get:
 *     summary: Get courier earnings
 *     description: Get courier's earnings summary
 *     tags:
 *       - Delivery
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *     responses:
 *       200:
 *         description: Earnings summary
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/courier/performance:
 *   get:
 *     summary: Get courier performance
 *     description: Get courier performance metrics
 *     tags:
 *       - Delivery
 *     responses:
 *       200:
 *         description: Performance metrics
 *     security:
 *       - BearerAuth: []
 */

// ===================== MESSAGING ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/messages/conversations:
 *   get:
 *     summary: Get conversations
 *     description: Get user's message conversations
 *     tags:
 *       - Social Media
 *     responses:
 *       200:
 *         description: List of conversations
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/messages/conversations:
 *   post:
 *     summary: Create conversation
 *     description: Start a new conversation with a user
 *     tags:
 *       - Social Media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient_id
 *             properties:
 *               recipient_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Conversation created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/messages/{conversationId}:
 *   get:
 *     summary: Get messages
 *     description: Get messages in a conversation
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Messages
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/messages/{conversationId}:
 *   post:
 *     summary: Send message
 *     description: Send a message in a conversation
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: conversationId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               media_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Message sent
 *     security:
 *       - BearerAuth: []
 */

// ===================== HOTEL FAVORITES ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/hotels/{id}/favorite:
 *   post:
 *     summary: Add hotel to favorites
 *     description: Add a hotel to user's favorites list
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Added to favorites
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/favorite:
 *   delete:
 *     summary: Remove hotel from favorites
 *     description: Remove a hotel from user's favorites list
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Removed from favorites
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/favorites:
 *   get:
 *     summary: Get favorite hotels
 *     description: Get user's favorite hotels
 *     tags:
 *       - Hotels
 *     responses:
 *       200:
 *         description: Favorite hotels
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/recommended:
 *   get:
 *     summary: Get recommended hotels
 *     description: Get personalized hotel recommendations
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recommended hotels
 *     security:
 *       - BearerAuth: []
 */

// ===================== PROMO CODE ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/hotels/{id}/promo-codes:
 *   post:
 *     summary: Create promo code (Manager)
 *     description: Create a promotional code for hotel
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - code
 *               - discount_percent
 *             properties:
 *               code:
 *                 type: string
 *                 example: SUMMER20
 *               discount_percent:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *               valid_from:
 *                 type: string
 *                 format: date
 *               valid_until:
 *                 type: string
 *                 format: date
 *               max_uses:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Promo code created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/promo-codes/validate:
 *   post:
 *     summary: Validate promo code
 *     description: Check if a promo code is valid
 *     tags:
 *       - Hotels
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - hotel_id
 *             properties:
 *               code:
 *                 type: string
 *               hotel_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Promo code validation result
 *     security:
 *       - BearerAuth: []
 */

// ===================== EXTENDED SOCIAL ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/social/posts/{id}:
 *   get:
 *     summary: Get post details
 *     description: Get detailed information about a specific post
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post details
 */

/**
 * @openapi
 * /api/v1/social/posts/{id}:
 *   put:
 *     summary: Update post
 *     description: Update an existing post
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post updated
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/posts/{id}:
 *   delete:
 *     summary: Delete post
 *     description: Delete a post
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post deleted
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/posts/{id}/share:
 *   post:
 *     summary: Share post
 *     description: Share a post to your timeline
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post shared
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/users/{id}/posts:
 *   get:
 *     summary: Get user posts
 *     description: Get posts by a specific user
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: User's posts
 */

/**
 * @openapi
 * /api/v1/social/stories/{id}/view:
 *   post:
 *     summary: View story
 *     description: Mark a story as viewed
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Story viewed
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/stories/{id}/viewers:
 *   get:
 *     summary: Get story viewers
 *     description: Get list of users who viewed a story
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Story viewers
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/friends/requests:
 *   get:
 *     summary: Get friend requests
 *     description: Get pending friend requests
 *     tags:
 *       - Social Media
 *     responses:
 *       200:
 *         description: Friend requests
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/friends/requests/{id}/respond:
 *   post:
 *     summary: Respond to friend request
 *     description: Accept or decline a friend request
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, decline]
 *     responses:
 *       200:
 *         description: Request responded
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/friends/{id}:
 *   delete:
 *     summary: Unfriend
 *     description: Remove a friend connection
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Friend removed
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/users/{id}/block:
 *   post:
 *     summary: Block user
 *     description: Block a user
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User blocked
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/users/{id}/unblock:
 *   post:
 *     summary: Unblock user
 *     description: Unblock a previously blocked user
 *     tags:
 *       - Social Media
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User unblocked
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/social/report:
 *   post:
 *     summary: Report content
 *     description: Report a post, comment, or user for policy violation
 *     tags:
 *       - Social Media
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - target_id
 *               - reason
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [post, comment, user]
 *               target_id:
 *                 type: string
 *                 format: uuid
 *               reason:
 *                 type: string
 *                 enum: [spam, harassment, inappropriate, violence, other]
 *               details:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report submitted
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/users/search:
 *   get:
 *     summary: Search users
 *     description: Search for users by name or username
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Search results
 */

// ===================== RIDE MANAGEMENT ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/rides/active:
 *   get:
 *     summary: Get active ride
 *     description: Get user's currently active ride
 *     tags:
 *       - Taxi
 *     responses:
 *       200:
 *         description: Active ride or null
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/requests:
 *   get:
 *     summary: Get ride requests (Driver)
 *     description: Get available ride requests for driver
 *     tags:
 *       - Taxi
 *     responses:
 *       200:
 *         description: Available ride requests
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/{id}/reject:
 *   post:
 *     summary: Reject ride (Driver)
 *     description: Driver rejects a ride request
 *     tags:
 *       - Taxi
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ride rejected
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/rides/analytics:
 *   get:
 *     summary: Get ride analytics (Driver)
 *     description: Get driver's ride analytics and stats
 *     tags:
 *       - Taxi
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *     responses:
 *       200:
 *         description: Ride analytics
 *     security:
 *       - BearerAuth: []
 */

// ===================== BOOKING MANAGEMENT ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/bookings/calendar:
 *   get:
 *     summary: Get booking calendar (Manager)
 *     description: Get hotel bookings calendar view
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: query
 *         name: hotel_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Booking calendar
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/bookings/{id}/status:
 *   put:
 *     summary: Update booking status (Manager)
 *     description: Update booking status
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, checked_in, checked_out, cancelled, no_show]
 *     responses:
 *       200:
 *         description: Status updated
 *     security:
 *       - BearerAuth: []
 */

// ===================== ESCROW & PAYOUT ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/payments/escrow/{id}/release:
 *   post:
 *     summary: Release escrow
 *     description: Release funds from escrow to vendor
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Escrow released
 *     security:
 *       - BearerAuth: []
 */

// ===================== DYNAMIC PRICING ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/pricing/calculate:
 *   post:
 *     summary: Calculate dynamic price
 *     description: Calculate dynamic pricing based on demand
 *     tags:
 *       - Taxi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pickup_lat
 *               - pickup_lng
 *             properties:
 *               pickup_lat:
 *                 type: number
 *               pickup_lng:
 *                 type: number
 *               vehicle_type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dynamic pricing info
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/pricing/bulk-update:
 *   put:
 *     summary: Bulk update room pricing (Manager)
 *     description: Update pricing for multiple dates
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - room_type
 *               - prices
 *             properties:
 *               room_type:
 *                 type: string
 *               prices:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     price:
 *                       type: number
 *     responses:
 *       200:
 *         description: Pricing updated
 *     security:
 *       - BearerAuth: []
 */

// ===================== SUPPORT TICKET ENDPOINTS =====================

/**
 * @openapi
 * /api/v1/support/tickets:
 *   post:
 *     summary: Create support ticket
 *     description: Create a new support ticket
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - description
 *               - category
 *             properties:
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [ride, order, payment, account, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Ticket created
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/support/tickets/{id}/reply:
 *   post:
 *     summary: Reply to ticket
 *     description: Add a reply to a support ticket
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reply added
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/{id}/reviews:
 *   post:
 *     summary: Create hotel review
 *     description: Submit a review for a hotel stay
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - booking_id
 *               - rating
 *             properties:
 *               booking_id:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted
 *     security:
 *       - BearerAuth: []
 */

/**
 * @openapi
 * /api/v1/hotels/{hotelId}/reviews/{id}/helpful:
 *   post:
 *     summary: Mark review helpful
 *     description: Mark a review as helpful
 *     tags:
 *       - Hotels
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Marked as helpful
 *     security:
 *       - BearerAuth: []
 */

export {};
