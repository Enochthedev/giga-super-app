/**
 * Hotel Discovery & Management Endpoints Documentation
 * Covers: Hotel search, details, favorites, reviews
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const hotelService: ServiceDocumentation = {
  name: '02. Hotel Discovery & Management',
  description: 'Hotel search, browsing, favorites, and management for vendors',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Search Hotels',
      description:
        'Search for hotels based on location, dates, guests, and various filters. Returns paginated list of matching hotels with availability.',
      method: 'POST',
      path: '/Search-hotels',
      requiresAuth: false,
      requestBody: {
        description: 'Search criteria and filters',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['location'],
          properties: {
            location: { type: 'string', description: 'City, area, or address' },
            checkIn: { type: 'string', format: 'date' },
            checkOut: { type: 'string', format: 'date' },
            guests: { type: 'number', minimum: 1 },
            rooms: { type: 'number', minimum: 1 },
            minPrice: { type: 'number' },
            maxPrice: { type: 'number' },
            amenities: { type: 'array', items: { type: 'string' } },
            starRating: { type: 'number', minimum: 1, maximum: 5 },
            sortBy: { type: 'string', enum: ['price', 'rating', 'distance', 'popularity'] },
            page: { type: 'number' },
            limit: { type: 'number' },
          },
        },
        example: {
          location: 'Lagos',
          checkIn: '2024-12-01',
          checkOut: '2024-12-05',
          guests: 2,
          rooms: 1,
          minPrice: 50,
          maxPrice: 300,
          amenities: ['wifi', 'pool', 'gym'],
          starRating: 4,
          sortBy: 'price',
          page: 1,
          limit: 20,
        },
      },
      responses: [
        {
          status: 200,
          description: 'Search results returned',
          body: {
            success: true,
            data: {
              hotels: [
                {
                  id: 'hotel-uuid-1',
                  name: 'Paradise Hotel Lagos',
                  address: '123 Victoria Island, Lagos',
                  city: 'Lagos',
                  star_rating: 4,
                  rating_average: 4.5,
                  review_count: 128,
                  thumbnail_url: 'https://example.com/hotel1.jpg',
                  amenities: ['wifi', 'pool', 'gym', 'restaurant'],
                  price_range: { min: 150, max: 350, currency: 'USD' },
                  available_rooms: 5,
                  distance_km: 2.5,
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 45,
                totalPages: 3,
              },
              searchMetadata: {
                location: 'Lagos',
                checkIn: '2024-12-01',
                checkOut: '2024-12-05',
                nights: 4,
              },
            },
          },
        },
      ],
      examples: [
        {
          name: 'Basic Location Search',
          description: 'Simple search by location only',
          request: {
            location: 'Lagos',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                hotels: [],
                pagination: { page: 1, total: 0 },
              },
            },
          },
        },
        {
          name: 'Full Search with Dates',
          description: 'Search with dates and guest count',
          request: {
            location: 'Abuja',
            checkIn: '2024-12-15',
            checkOut: '2024-12-18',
            guests: 2,
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                hotels: [{ id: 'hotel-1', name: 'Transcorp Hilton' }],
              },
            },
          },
        },
        {
          name: 'Search with Amenity Filters',
          description: 'Filter by specific amenities',
          request: {
            location: 'Lagos',
            amenities: ['wifi', 'pool', 'parking'],
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: { hotels: [] },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Empty Location',
          description: 'When location is not provided',
          scenario: 'Request without location field',
          expectedBehavior: 'Returns 400 with validation error',
          request: { guests: 2 },
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Location is required',
              },
            },
          },
        },
        {
          name: 'Invalid Date Range',
          description: 'When checkout is before checkin',
          scenario: 'checkOut date is earlier than checkIn',
          expectedBehavior: 'Returns 400 with date validation error',
          request: {
            location: 'Lagos',
            checkIn: '2024-12-10',
            checkOut: '2024-12-05',
          },
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'INVALID_DATE_RANGE',
                message: 'Check-out date must be after check-in date',
              },
            },
          },
        },
        {
          name: 'Past Dates',
          description: 'When searching for past dates',
          scenario: 'Check-in date is in the past',
          expectedBehavior: 'Returns 400 or adjusts to today',
        },
        {
          name: 'No Results Found',
          description: 'When no hotels match criteria',
          scenario: 'Very specific filters with no matches',
          expectedBehavior: 'Returns 200 with empty hotels array',
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                hotels: [],
                pagination: { page: 1, total: 0 },
                message: 'No hotels found matching your criteria',
              },
            },
          },
        },
        {
          name: 'Price Range Mismatch',
          description: 'When minPrice > maxPrice',
          scenario: 'minPrice is 500, maxPrice is 100',
          expectedBehavior: 'Returns 400 with validation error',
        },
      ],
      notes: [
        'Results are cached for 5 minutes for identical queries',
        'Prices shown are for the specified date range',
        'Availability is real-time when dates are provided',
      ],
    },
    {
      name: 'Get Hotel Details',
      description:
        'Get comprehensive details for a specific hotel including rooms, amenities, policies, and reviews.',
      method: 'GET',
      path: '/Get-hotel-details',
      requiresAuth: false,
      queryParams: [
        {
          name: 'hotelId',
          description: 'UUID of the hotel',
          required: true,
          example: 'hotel-uuid-123',
          type: 'string',
        },
        {
          name: 'checkIn',
          description: 'Check-in date for availability',
          required: false,
          example: '2024-12-01',
          type: 'string',
        },
        {
          name: 'checkOut',
          description: 'Check-out date for availability',
          required: false,
          example: '2024-12-05',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Hotel details retrieved',
          body: {
            success: true,
            data: {
              id: 'hotel-uuid-123',
              name: 'Paradise Hotel Lagos',
              description: 'Luxury 5-star hotel in the heart of Victoria Island...',
              address: '123 Adeola Odeku Street, Victoria Island',
              city: 'Lagos',
              state: 'Lagos',
              country: 'Nigeria',
              coordinates: { lat: 6.4281, lng: 3.4219 },
              star_rating: 5,
              rating_average: 4.7,
              review_count: 324,
              images: [
                { url: 'https://example.com/hotel1.jpg', caption: 'Lobby' },
                { url: 'https://example.com/hotel2.jpg', caption: 'Pool' },
              ],
              amenities: [
                { id: 'wifi', name: 'Free WiFi', icon: 'wifi' },
                { id: 'pool', name: 'Swimming Pool', icon: 'pool' },
                { id: 'gym', name: 'Fitness Center', icon: 'fitness' },
                { id: 'restaurant', name: 'On-site Restaurant', icon: 'restaurant' },
                { id: 'parking', name: 'Free Parking', icon: 'parking' },
              ],
              room_types: [
                {
                  id: 'room-type-1',
                  name: 'Deluxe Room',
                  description: 'Spacious room with city view',
                  max_guests: 2,
                  bed_type: 'King',
                  size_sqm: 35,
                  price_per_night: 150,
                  available_rooms: 5,
                  images: ['https://example.com/room1.jpg'],
                  amenities: ['wifi', 'ac', 'minibar'],
                },
              ],
              policies: {
                check_in_time: '14:00',
                check_out_time: '12:00',
                cancellation: 'Free cancellation up to 24 hours before check-in',
                pets_allowed: false,
                smoking_allowed: false,
              },
              contact: {
                phone: '+234XXXXXXXXXX',
                email: 'reservations@paradisehotel.com',
              },
              vendor: {
                id: 'vendor-uuid',
                name: 'Paradise Hotels Group',
                verified: true,
              },
            },
          },
        },
        {
          status: 404,
          description: 'Hotel not found',
          body: {
            success: false,
            error: {
              code: 'HOTEL_NOT_FOUND',
              message: 'Hotel with the specified ID does not exist',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Basic Hotel Details',
          description: 'Get hotel without availability check',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                id: 'hotel-uuid',
                name: 'Paradise Hotel',
              },
            },
          },
        },
        {
          name: 'With Availability',
          description: 'Get hotel with room availability for dates',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                id: 'hotel-uuid',
                room_types: [{ id: 'room-1', available_rooms: 3 }],
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Inactive Hotel',
          description: 'When hotel is no longer active',
          scenario: 'Hotel was deactivated by vendor or admin',
          expectedBehavior: 'Returns 404 or 410 Gone',
        },
        {
          name: 'No Rooms Available',
          description: 'When all rooms are booked',
          scenario: 'Searching for popular dates with no availability',
          expectedBehavior: 'Returns hotel with available_rooms: 0 for all room types',
        },
      ],
    },
    {
      name: 'Get Recommended Hotels',
      description: 'Get personalized hotel recommendations based on user preferences and history.',
      method: 'GET',
      path: '/get-recommended-hotels',
      requiresAuth: true,
      queryParams: [
        {
          name: 'limit',
          description: 'Number of recommendations to return',
          required: false,
          example: '10',
          type: 'number',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Recommendations retrieved',
          body: {
            success: true,
            data: {
              recommendations: [
                {
                  hotel: {
                    id: 'hotel-uuid',
                    name: 'Paradise Hotel',
                    thumbnail_url: 'https://example.com/hotel.jpg',
                    star_rating: 4,
                    rating_average: 4.5,
                  },
                  reason: 'Based on your recent searches in Lagos',
                  score: 0.95,
                },
              ],
            },
          },
        },
      ],
      examples: [
        {
          name: 'First Time User',
          description: 'Recommendations for new user with no history',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                recommendations: [],
                message: 'Search for hotels to get personalized recommendations',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'New User No History',
          description: 'User with no search or booking history',
          scenario: 'Brand new user requests recommendations',
          expectedBehavior: 'Returns popular hotels or empty with suggestion to search',
        },
      ],
    },
    {
      name: 'Add Hotel to Favorites',
      description: "Add a hotel to the user's favorites list for quick access later.",
      method: 'POST',
      path: '/add-hotel-to-favorites',
      requiresAuth: true,
      requestBody: {
        description: 'Hotel to add to favorites',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['hotelId'],
          properties: {
            hotelId: { type: 'string', format: 'uuid' },
          },
        },
        example: {
          hotelId: 'hotel-uuid-123',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Added to favorites',
          body: {
            success: true,
            data: {
              favoriteId: 'favorite-uuid',
              hotelId: 'hotel-uuid-123',
              addedAt: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 409,
          description: 'Already in favorites',
          body: {
            success: false,
            error: {
              code: 'ALREADY_FAVORITED',
              message: 'This hotel is already in your favorites',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Add New Favorite',
          description: 'Successfully add hotel to favorites',
          request: { hotelId: 'hotel-uuid' },
          response: {
            status: 201,
            body: {
              success: true,
              data: { favoriteId: 'fav-uuid' },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Non-existent Hotel',
          description: 'When hotel does not exist',
          scenario: 'HotelId points to deleted or non-existent hotel',
          expectedBehavior: 'Returns 404',
          response: {
            status: 404,
            body: {
              success: false,
              error: {
                code: 'HOTEL_NOT_FOUND',
                message: 'Hotel not found',
              },
            },
          },
        },
        {
          name: 'Maximum Favorites Reached',
          description: 'When user has too many favorites',
          scenario: 'User has 100 favorites already',
          expectedBehavior: 'May return 400 or silently replace oldest',
        },
      ],
    },
    {
      name: 'Remove Hotel from Favorites',
      description: "Remove a hotel from the user's favorites list.",
      method: 'POST',
      path: '/remove-hotel-from-favorites',
      requiresAuth: true,
      requestBody: {
        description: 'Hotel to remove from favorites',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['hotelId'],
          properties: {
            hotelId: { type: 'string', format: 'uuid' },
          },
        },
        example: {
          hotelId: 'hotel-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Removed from favorites',
          body: {
            success: true,
            data: {
              message: 'Hotel removed from favorites',
              hotelId: 'hotel-uuid-123',
            },
          },
        },
        {
          status: 404,
          description: 'Not in favorites',
          body: {
            success: false,
            error: {
              code: 'FAVORITE_NOT_FOUND',
              message: 'This hotel is not in your favorites',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Remove Favorite',
          description: 'Successfully remove hotel from favorites',
          request: { hotelId: 'hotel-uuid' },
          response: {
            status: 200,
            body: {
              success: true,
              data: { message: 'Removed' },
            },
          },
        },
      ],
      edgeCases: [],
    },
    {
      name: 'Get User Favorites',
      description: 'Get list of hotels the user has added to favorites.',
      method: 'GET',
      path: '/get-user-favorites',
      requiresAuth: true,
      queryParams: [
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
          example: '20',
          type: 'number',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Favorites retrieved',
          body: {
            success: true,
            data: {
              favorites: [
                {
                  id: 'favorite-uuid',
                  hotel: {
                    id: 'hotel-uuid',
                    name: 'Paradise Hotel',
                    thumbnail_url: 'https://example.com/hotel.jpg',
                    star_rating: 4,
                    city: 'Lagos',
                  },
                  addedAt: '2024-01-15T10:00:00Z',
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                total: 5,
              },
            },
          },
        },
      ],
      examples: [
        {
          name: 'Empty Favorites',
          description: 'User with no favorites',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                favorites: [],
                pagination: { total: 0 },
              },
            },
          },
        },
      ],
      edgeCases: [],
    },
    {
      name: 'Create Hotel (Vendor)',
      description: 'Create a new hotel listing. Only available for users with vendor role.',
      method: 'POST',
      path: '/create-hotel',
      requiresAuth: true,
      requestBody: {
        description: 'Hotel details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['name', 'address', 'city', 'country'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            country: { type: 'string' },
            star_rating: { type: 'number', minimum: 1, maximum: 5 },
            amenities: { type: 'array', items: { type: 'string' } },
            images: { type: 'array', items: { type: 'string' } },
            policies: { type: 'object' },
            contact: { type: 'object' },
          },
        },
        example: {
          name: 'Paradise Hotel Lagos',
          description: 'Luxury hotel in the heart of Victoria Island',
          address: '123 Adeola Odeku Street, Victoria Island',
          city: 'Lagos',
          state: 'Lagos',
          country: 'Nigeria',
          star_rating: 4,
          amenities: ['wifi', 'pool', 'gym', 'restaurant', 'parking'],
          images: [
            'https://storage.supabase.co/hotels/hotel1.jpg',
            'https://storage.supabase.co/hotels/hotel2.jpg',
          ],
          policies: {
            check_in_time: '14:00',
            check_out_time: '12:00',
            cancellation: 'Free cancellation up to 24 hours',
            pets_allowed: false,
          },
          contact: {
            phone: '+234XXXXXXXXXX',
            email: 'info@paradisehotel.com',
          },
        },
      },
      responses: [
        {
          status: 201,
          description: 'Hotel created successfully',
          body: {
            success: true,
            data: {
              id: 'new-hotel-uuid',
              name: 'Paradise Hotel Lagos',
              status: 'pending_approval',
              created_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 403,
          description: 'Not authorized',
          body: {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Vendor role required to create hotels',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Minimal Hotel',
          description: 'Create hotel with required fields only',
          request: {
            name: 'Simple Hotel',
            address: '123 Main St',
            city: 'Lagos',
            country: 'Nigeria',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: { id: 'hotel-uuid' },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Non-Vendor User',
          description: 'When user is not a vendor',
          scenario: 'Regular user tries to create hotel',
          expectedBehavior: 'Returns 403 Forbidden',
        },
        {
          name: 'Duplicate Hotel Name',
          description: 'When hotel with same name exists in location',
          scenario: 'Vendor creates hotel with existing name+city combo',
          expectedBehavior: 'Returns 409 Conflict or allows with warning',
        },
        {
          name: 'Maximum Hotels Reached',
          description: 'When vendor has reached hotel limit',
          scenario: 'Free tier vendor with 10 hotels tries to add 11th',
          expectedBehavior: 'Returns 402 Payment Required or 400',
        },
      ],
      notes: [
        'Hotel will be in pending_approval status until reviewed',
        'Images should be uploaded via upload-file endpoint first',
        'At least one image is recommended',
      ],
    },
    {
      name: 'Update Hotel (Vendor)',
      description: 'Update an existing hotel. Only the hotel owner can update.',
      method: 'POST',
      path: '/update-hotel',
      requiresAuth: true,
      requestBody: {
        description: 'Hotel fields to update',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['hotelId'],
          properties: {
            hotelId: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            amenities: { type: 'array' },
            images: { type: 'array' },
            policies: { type: 'object' },
          },
        },
        example: {
          hotelId: 'hotel-uuid-123',
          description: 'Updated description with new amenities',
          amenities: ['wifi', 'pool', 'gym', 'spa'],
        },
      },
      responses: [
        {
          status: 200,
          description: 'Hotel updated successfully',
          body: {
            success: true,
            data: {
              id: 'hotel-uuid-123',
              updated_fields: ['description', 'amenities'],
              updated_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 403,
          description: 'Not hotel owner',
          body: {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You are not authorized to update this hotel',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Update Description',
          description: 'Update just the hotel description',
          request: {
            hotelId: 'hotel-uuid',
            description: 'New description',
          },
          response: {
            status: 200,
            body: { success: true },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Update During Active Booking',
          description: 'When there are active bookings',
          scenario: 'Vendor updates room amenities while bookings are active',
          expectedBehavior: 'Updates apply, existing bookings retain original terms',
        },
      ],
    },
    {
      name: 'Delete Hotel (Vendor)',
      description: 'Soft delete a hotel. Hotel will be deactivated, not permanently removed.',
      method: 'POST',
      path: '/delete-hotel',
      requiresAuth: true,
      requestBody: {
        description: 'Hotel to delete',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['hotelId'],
          properties: {
            hotelId: { type: 'string' },
            reason: { type: 'string', description: 'Optional reason for deletion' },
          },
        },
        example: {
          hotelId: 'hotel-uuid-123',
          reason: 'Closing for renovation',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Hotel deactivated',
          body: {
            success: true,
            data: {
              message: 'Hotel has been deactivated',
              hotelId: 'hotel-uuid-123',
              deactivated_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 400,
          description: 'Has active bookings',
          body: {
            success: false,
            error: {
              code: 'HAS_ACTIVE_BOOKINGS',
              message:
                'Cannot delete hotel with active bookings. Complete or cancel existing bookings first.',
              active_bookings_count: 5,
            },
          },
        },
      ],
      examples: [
        {
          name: 'Delete Empty Hotel',
          description: 'Delete hotel with no active bookings',
          request: { hotelId: 'hotel-uuid' },
          response: {
            status: 200,
            body: { success: true },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Hotel with Active Bookings',
          description: 'When hotel has future bookings',
          scenario: 'Delete request when 3 bookings are confirmed',
          expectedBehavior: 'Returns 400 with booking count and action required',
        },
        {
          name: 'Already Deleted',
          description: 'When hotel is already deactivated',
          scenario: 'Double delete request',
          expectedBehavior: 'Returns 404 or 200 with no-op message',
        },
      ],
      notes: [
        'Deletion is soft delete - hotel can be reactivated if needed',
        'All future bookings must be cancelled before deletion',
        'Historical data is retained for reporting',
      ],
    },
  ],
};

export default hotelService;
