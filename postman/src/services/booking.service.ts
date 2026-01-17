/**
 * Booking Management Endpoints Documentation
 * Covers: Creating, managing, and cancelling bookings
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const bookingService: ServiceDocumentation = {
  name: '03. Booking Management',
  description: 'Hotel booking lifecycle - create, view, modify, and cancel bookings',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Calculate Booking Price',
      description:
        'Calculate the total price for a booking before confirming. Includes taxes, fees, and any applicable discounts.',
      method: 'POST',
      path: '/Calculate-booking-price',
      requiresAuth: true,
      requestBody: {
        description: 'Booking details for price calculation',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['hotelId', 'roomTypeId', 'checkIn', 'checkOut'],
          properties: {
            hotelId: { type: 'string', format: 'uuid' },
            roomTypeId: { type: 'string', format: 'uuid' },
            checkIn: { type: 'string', format: 'date' },
            checkOut: { type: 'string', format: 'date' },
            rooms: { type: 'number', default: 1 },
            guests: { type: 'number' },
            promoCode: { type: 'string' },
          },
        },
        example: {
          hotelId: 'hotel-uuid-123',
          roomTypeId: 'room-type-uuid-456',
          checkIn: '2024-12-01',
          checkOut: '2024-12-05',
          rooms: 1,
          guests: 2,
          promoCode: 'SAVE10',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Price calculated successfully',
          body: {
            success: true,
            data: {
              pricing: {
                base_rate: 150,
                nights: 4,
                rooms: 1,
                subtotal: 600,
                taxes: {
                  vat: 45,
                  tourism_levy: 15,
                },
                fees: {
                  service_fee: 30,
                },
                discount: {
                  code: 'SAVE10',
                  type: 'percentage',
                  value: 10,
                  amount: 60,
                },
                total: 630,
                currency: 'USD',
              },
              availability: {
                available: true,
                rooms_left: 3,
              },
              cancellation_policy: 'Free cancellation until Dec 1, 2024',
              payment_due: 'Full payment required at booking',
            },
          },
        },
        {
          status: 400,
          description: 'Invalid promo code',
          body: {
            success: false,
            error: {
              code: 'INVALID_PROMO_CODE',
              message: 'Promo code SAVE10 is expired or invalid',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Basic Price Check',
          description: 'Calculate price without promo code',
          request: {
            hotelId: 'hotel-uuid',
            roomTypeId: 'room-uuid',
            checkIn: '2024-12-01',
            checkOut: '2024-12-03',
            rooms: 1,
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                pricing: {
                  nights: 2,
                  total: 350,
                },
              },
            },
          },
        },
        {
          name: 'Multiple Rooms',
          description: 'Calculate for 3 rooms',
          request: {
            hotelId: 'hotel-uuid',
            roomTypeId: 'room-uuid',
            checkIn: '2024-12-01',
            checkOut: '2024-12-05',
            rooms: 3,
            guests: 6,
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                pricing: {
                  nights: 4,
                  rooms: 3,
                  total: 1890,
                },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'No Availability',
          description: 'When room type is fully booked',
          scenario: 'All rooms of this type are booked for the dates',
          expectedBehavior: 'Returns price but with availability: false',
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                pricing: { total: 600 },
                availability: {
                  available: false,
                  rooms_left: 0,
                  message: 'This room type is not available for selected dates',
                },
              },
            },
          },
        },
        {
          name: 'Expired Promo Code',
          description: 'When promo code has expired',
          scenario: 'Valid code but past expiry date',
          expectedBehavior: 'Returns 400 with promo error',
        },
        {
          name: 'Minimum Stay Not Met',
          description: 'When hotel has minimum nights requirement',
          scenario: '1 night booking when minimum is 2',
          expectedBehavior: 'Returns 400 with minimum stay error',
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'MINIMUM_STAY_NOT_MET',
                message: 'This property requires a minimum stay of 2 nights',
              },
            },
          },
        },
      ],
      notes: [
        'Prices may change between calculation and booking confirmation',
        'Promo codes are validated but not locked at this stage',
        'Currency is determined by hotel location',
      ],
    },
    {
      name: 'Create Booking',
      description: 'Create a new hotel booking. Requires successful payment initialization first.',
      method: 'POST',
      path: '/Create-booking',
      requiresAuth: true,
      requestBody: {
        description: 'Booking details and guest information',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: [
            'hotelId',
            'roomTypeId',
            'checkIn',
            'checkOut',
            'guestName',
            'guestEmail',
            'guestPhone',
          ],
          properties: {
            hotelId: { type: 'string' },
            roomTypeId: { type: 'string' },
            checkIn: { type: 'string', format: 'date' },
            checkOut: { type: 'string', format: 'date' },
            rooms: { type: 'number', default: 1 },
            guests: { type: 'number' },
            guestName: { type: 'string' },
            guestEmail: { type: 'string', format: 'email' },
            guestPhone: { type: 'string' },
            specialRequests: { type: 'string' },
            promoCode: { type: 'string' },
            paymentReference: { type: 'string' },
          },
        },
        example: {
          hotelId: 'hotel-uuid-123',
          roomTypeId: 'room-type-uuid-456',
          checkIn: '2024-12-01',
          checkOut: '2024-12-05',
          rooms: 1,
          guests: 2,
          guestName: 'John Doe',
          guestEmail: 'john@example.com',
          guestPhone: '+2348012345678',
          specialRequests: 'High floor room please',
          promoCode: 'SAVE10',
          paymentReference: 'pay_ref_123',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Booking created successfully',
          body: {
            success: true,
            data: {
              booking: {
                id: 'booking-uuid-789',
                confirmation_code: 'GHB-2024-ABC123',
                status: 'confirmed',
                hotel: {
                  id: 'hotel-uuid-123',
                  name: 'Paradise Hotel Lagos',
                  address: '123 Victoria Island, Lagos',
                },
                room: {
                  id: 'room-type-uuid-456',
                  name: 'Deluxe Room',
                },
                dates: {
                  check_in: '2024-12-01',
                  check_out: '2024-12-05',
                  nights: 4,
                },
                guest: {
                  name: 'John Doe',
                  email: 'john@example.com',
                  phone: '+2348012345678',
                },
                pricing: {
                  subtotal: 600,
                  discount: 60,
                  taxes: 60,
                  fees: 30,
                  total: 630,
                  currency: 'USD',
                },
                payment: {
                  status: 'paid',
                  method: 'card',
                  reference: 'pay_ref_123',
                },
                created_at: '2024-01-20T16:00:00Z',
              },
              actions: {
                view_booking: '/Get-booking-details?bookingId=booking-uuid-789',
                cancel_booking: '/cancel-booking',
                modify_booking: '/modify-booking',
              },
            },
          },
        },
        {
          status: 400,
          description: 'Room not available',
          body: {
            success: false,
            error: {
              code: 'ROOM_NOT_AVAILABLE',
              message: 'Selected room is no longer available for these dates',
              suggestion: 'Please search for alternative dates or room types',
            },
          },
        },
        {
          status: 402,
          description: 'Payment failed',
          body: {
            success: false,
            error: {
              code: 'PAYMENT_FAILED',
              message: 'Payment could not be processed',
              payment_error: 'Card declined',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Simple Booking',
          description: 'Create booking with minimal information',
          request: {
            hotelId: 'hotel-uuid',
            roomTypeId: 'room-uuid',
            checkIn: '2024-12-01',
            checkOut: '2024-12-03',
            guestName: 'John Doe',
            guestEmail: 'john@example.com',
            guestPhone: '+234XXXXXXXXXX',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                booking: {
                  id: 'booking-uuid',
                  confirmation_code: 'GHB-2024-XYZ',
                  status: 'confirmed',
                },
              },
            },
          },
        },
        {
          name: 'Booking with Promo Code',
          description: 'Apply discount during booking',
          request: {
            hotelId: 'hotel-uuid',
            roomTypeId: 'room-uuid',
            checkIn: '2024-12-01',
            checkOut: '2024-12-05',
            guestName: 'Jane Smith',
            guestEmail: 'jane@example.com',
            guestPhone: '+234XXXXXXXXXX',
            promoCode: 'WELCOME20',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                booking: {
                  pricing: {
                    discount: 120,
                    promo_applied: 'WELCOME20',
                  },
                },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Race Condition - Same Room',
          description: 'When two users book last room simultaneously',
          scenario: 'Two concurrent booking requests for last available room',
          expectedBehavior: 'One succeeds, other gets ROOM_NOT_AVAILABLE',
        },
        {
          name: 'Invalid Payment Reference',
          description: 'When payment reference is invalid or expired',
          scenario: 'User provides tampered or old payment reference',
          expectedBehavior: 'Returns 400 or 402 with payment verification error',
        },
        {
          name: 'Guest Count Exceeds Capacity',
          description: 'When guests exceed room capacity',
          scenario: '5 guests for room with 2-person capacity',
          expectedBehavior: 'Returns 400 with capacity error',
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'EXCEEDS_CAPACITY',
                message: 'Selected room accommodates maximum 2 guests',
              },
            },
          },
        },
        {
          name: 'Check-in Same Day',
          description: 'When booking starts today',
          scenario: 'User books room for same-day check-in',
          expectedBehavior: 'Allowed if within hotel check-in hours, otherwise warning',
        },
      ],
      notes: [
        'A confirmation email is sent automatically to guest email',
        'Booking confirmation code is unique and used for check-in',
        'Payment must be completed/authorized before booking creation',
      ],
    },
    {
      name: 'Get User Bookings',
      description: 'Get all bookings for the authenticated user with optional filters.',
      method: 'GET',
      path: '/Get-user-bookings',
      requiresAuth: true,
      queryParams: [
        {
          name: 'status',
          description: 'Filter by booking status',
          required: false,
          example: 'confirmed',
          type: 'string',
        },
        {
          name: 'page',
          description: 'Page number',
          required: false,
          example: '1',
          type: 'number',
        },
        {
          name: 'limit',
          description: 'Items per page',
          required: false,
          example: '10',
          type: 'number',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Bookings retrieved',
          body: {
            success: true,
            data: {
              bookings: [
                {
                  id: 'booking-uuid-1',
                  confirmation_code: 'GHB-2024-ABC123',
                  status: 'confirmed',
                  hotel: {
                    id: 'hotel-uuid',
                    name: 'Paradise Hotel',
                    thumbnail: 'https://example.com/hotel.jpg',
                  },
                  dates: {
                    check_in: '2024-12-01',
                    check_out: '2024-12-05',
                  },
                  total: 630,
                  currency: 'USD',
                },
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 5,
              },
            },
          },
        },
      ],
      examples: [
        {
          name: 'All Bookings',
          description: 'Get all user bookings',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                bookings: [],
                pagination: { total: 0 },
              },
            },
          },
        },
        {
          name: 'Upcoming Only',
          description: 'Filter for confirmed upcoming bookings',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                bookings: [{ status: 'confirmed' }],
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'No Bookings',
          description: 'User with no booking history',
          scenario: 'New user requests their bookings',
          expectedBehavior: 'Returns empty array, not 404',
        },
      ],
    },
    {
      name: 'Get Booking Details',
      description: 'Get detailed information about a specific booking.',
      method: 'GET',
      path: '/get-booking-details',
      requiresAuth: true,
      queryParams: [
        {
          name: 'bookingId',
          description: 'UUID of the booking',
          required: true,
          example: 'booking-uuid-123',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Booking details retrieved',
          body: {
            success: true,
            data: {
              id: 'booking-uuid-123',
              confirmation_code: 'GHB-2024-ABC123',
              status: 'confirmed',
              hotel: {
                id: 'hotel-uuid',
                name: 'Paradise Hotel Lagos',
                address: '123 Victoria Island',
                phone: '+234XXXXXXXXXX',
                email: 'bookings@paradise.com',
              },
              room: {
                id: 'room-uuid',
                name: 'Deluxe King Room',
                amenities: ['WiFi', 'AC', 'Minibar'],
              },
              dates: {
                check_in: '2024-12-01',
                check_out: '2024-12-05',
                nights: 4,
                check_in_time: '14:00',
                check_out_time: '12:00',
              },
              guest: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+2348012345678',
              },
              pricing: {
                breakdown: [
                  { item: 'Room rate x 4 nights', amount: 600 },
                  { item: 'Promo discount (SAVE10)', amount: -60 },
                  { item: 'VAT (7.5%)', amount: 40.5 },
                  { item: 'Service fee', amount: 30 },
                ],
                total: 610.5,
                currency: 'USD',
                paid_amount: 610.5,
                payment_status: 'paid',
              },
              special_requests: 'High floor room please',
              cancellation_policy: 'Free cancellation until 24 hours before check-in',
              can_cancel: true,
              can_modify: true,
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-15T10:00:00Z',
            },
          },
        },
        {
          status: 404,
          description: 'Booking not found',
          body: {
            success: false,
            error: {
              code: 'BOOKING_NOT_FOUND',
              message: 'Booking not found or you do not have access',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Active Booking',
          description: 'View confirmed booking details',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                status: 'confirmed',
                can_cancel: true,
              },
            },
          },
        },
        {
          name: 'Completed Booking',
          description: 'View past booking',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                status: 'completed',
                can_cancel: false,
                can_modify: false,
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Other User Booking',
          description: 'Accessing booking that belongs to another user',
          scenario: 'Provide booking ID of different user',
          expectedBehavior: 'Returns 404 to prevent information leakage',
        },
      ],
    },
    {
      name: 'Cancel Booking',
      description: 'Cancel an existing booking. Refund is processed based on cancellation policy.',
      method: 'POST',
      path: '/cancel-booking',
      requiresAuth: true,
      requestBody: {
        description: 'Booking to cancel',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        example: {
          bookingId: 'booking-uuid-123',
          reason: 'Change of travel plans',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Booking cancelled',
          body: {
            success: true,
            data: {
              booking_id: 'booking-uuid-123',
              status: 'cancelled',
              refund: {
                eligible: true,
                amount: 610.5,
                method: 'original_payment_method',
                estimated_time: '5-7 business days',
              },
              cancelled_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 400,
          description: 'Cancellation not allowed',
          body: {
            success: false,
            error: {
              code: 'CANCELLATION_NOT_ALLOWED',
              message: 'This booking cannot be cancelled. Check-in has already passed.',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Full Refund Cancellation',
          description: 'Cancel within free cancellation period',
          request: {
            bookingId: 'booking-uuid',
            reason: 'Plans changed',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                refund: {
                  amount: 630,
                  percentage: 100,
                },
              },
            },
          },
        },
        {
          name: 'Partial Refund',
          description: 'Cancel after free cancellation period',
          request: {
            bookingId: 'booking-uuid',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                refund: {
                  amount: 315,
                  percentage: 50,
                  fee_retained: 315,
                },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Already Cancelled',
          description: 'When booking is already cancelled',
          scenario: 'Double cancellation request',
          expectedBehavior: 'Returns 400 with already cancelled message',
        },
        {
          name: 'Checked In',
          description: 'When guest has already checked in',
          scenario: 'Cancel after check-in process',
          expectedBehavior: 'Returns 400, suggest contact hotel',
        },
        {
          name: 'Completed Stay',
          description: 'When stay is already completed',
          scenario: 'Cancel booking after check-out date',
          expectedBehavior: 'Returns 400, cannot cancel completed booking',
        },
      ],
      notes: [
        'Refund processing time varies by payment provider',
        'Vendors are notified immediately of cancellations',
        'Booking history is retained even after cancellation',
      ],
    },
    {
      name: 'Modify Booking',
      description:
        'Modify dates or room details of an existing booking. Subject to availability and price changes.',
      method: 'POST',
      path: '/modify-booking',
      requiresAuth: true,
      requestBody: {
        description: 'Booking modifications',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: { type: 'string' },
            newCheckIn: { type: 'string', format: 'date' },
            newCheckOut: { type: 'string', format: 'date' },
            newRoomTypeId: { type: 'string' },
            newRooms: { type: 'number' },
          },
        },
        example: {
          bookingId: 'booking-uuid-123',
          newCheckIn: '2024-12-02',
          newCheckOut: '2024-12-06',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Booking modified',
          body: {
            success: true,
            data: {
              booking_id: 'booking-uuid-123',
              modifications: {
                dates: {
                  from: { checkIn: '2024-12-01', checkOut: '2024-12-05' },
                  to: { checkIn: '2024-12-02', checkOut: '2024-12-06' },
                },
              },
              price_difference: {
                original: 630,
                new: 650,
                difference: 20,
                action: 'additional_payment_required',
              },
              modified_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 400,
          description: 'Modification not possible',
          body: {
            success: false,
            error: {
              code: 'MODIFICATION_NOT_ALLOWED',
              message: 'Booking cannot be modified within 24 hours of check-in',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Change Dates',
          description: 'Move booking dates by one day',
          request: {
            bookingId: 'booking-uuid',
            newCheckIn: '2024-12-02',
            newCheckOut: '2024-12-06',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                price_difference: { difference: 0 },
              },
            },
          },
        },
        {
          name: 'Upgrade Room',
          description: 'Upgrade to better room type',
          request: {
            bookingId: 'booking-uuid',
            newRoomTypeId: 'suite-room-uuid',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                price_difference: { difference: 200 },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'New Dates Not Available',
          description: 'When requested new dates have no availability',
          scenario: 'Room is booked for new dates',
          expectedBehavior: 'Returns 400 with availability error',
        },
        {
          name: 'Price Decreased',
          description: 'When modification results in lower price',
          scenario: 'Shorter stay or cheaper room',
          expectedBehavior: 'Returns success with refund information',
        },
      ],
    },
    {
      name: 'Check-in Guest (Vendor)',
      description: 'Mark a booking as checked-in. Available only to hotel vendors.',
      method: 'POST',
      path: '/check-in-guest',
      requiresAuth: true,
      requestBody: {
        description: 'Check-in details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: { type: 'string' },
            roomNumber: { type: 'string' },
            notes: { type: 'string' },
          },
        },
        example: {
          bookingId: 'booking-uuid-123',
          roomNumber: '405',
          notes: 'Guest requested extra pillows',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Guest checked in',
          body: {
            success: true,
            data: {
              booking_id: 'booking-uuid-123',
              status: 'checked_in',
              room_number: '405',
              checked_in_at: '2024-12-01T14:30:00Z',
              expected_checkout: '2024-12-05T12:00:00Z',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Standard Check-in',
          description: 'Regular guest check-in',
          request: {
            bookingId: 'booking-uuid',
            roomNumber: '302',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                status: 'checked_in',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Already Checked In',
          description: 'When guest is already checked in',
          scenario: 'Double check-in attempt',
          expectedBehavior: 'Returns 400 with already checked in message',
        },
        {
          name: 'Wrong Date',
          description: 'When check-in attempted before booking date',
          scenario: 'Check-in 2 days before booking',
          expectedBehavior: 'May be allowed with early check-in fee or rejected',
        },
      ],
    },
    {
      name: 'Checkout Guest (Vendor)',
      description: 'Mark a booking as checked-out and complete the stay. Triggers escrow release.',
      method: 'POST',
      path: '/Checkout-guest',
      requiresAuth: true,
      requestBody: {
        description: 'Checkout details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['bookingId'],
          properties: {
            bookingId: { type: 'string' },
            additionalCharges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  amount: { type: 'number' },
                },
              },
            },
            notes: { type: 'string' },
          },
        },
        example: {
          bookingId: 'booking-uuid-123',
          additionalCharges: [
            { description: 'Minibar', amount: 25 },
            { description: 'Room service', amount: 45 },
          ],
          notes: 'Great guest, no issues',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Guest checked out',
          body: {
            success: true,
            data: {
              booking_id: 'booking-uuid-123',
              status: 'completed',
              checked_out_at: '2024-12-05T11:30:00Z',
              final_bill: {
                room_charges: 630,
                additional_charges: 70,
                total: 700,
              },
              escrow_status: 'released',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Simple Checkout',
          description: 'Checkout with no additional charges',
          request: {
            bookingId: 'booking-uuid',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                status: 'completed',
                escrow_status: 'released',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Not Checked In',
          description: 'When guest was never checked in',
          scenario: 'Checkout without prior check-in',
          expectedBehavior: 'May auto-check-in then checkout, or require check-in first',
        },
        {
          name: 'Late Checkout',
          description: 'When checkout is after official time',
          scenario: 'Checkout at 3pm when checkout time is 12pm',
          expectedBehavior: 'May include late checkout fee in additional charges',
        },
      ],
      notes: [
        'Escrow funds are released to vendor after successful checkout',
        'Guest receives checkout confirmation email',
        'Review prompt is sent to guest after checkout',
      ],
    },
  ],
};

export default bookingService;
