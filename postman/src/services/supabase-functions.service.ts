/**
 * Supabase Edge Functions Documentation
 * Covers: All edge functions that are deployed via Supabase
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const supabaseFunctionsService: ServiceDocumentation = {
  name: '10. Supabase Edge Functions',
  description: 'Direct Supabase Edge Functions - core serverless functions deployed via Supabase',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    // ========================================
    // File Upload Functions
    // ========================================
    {
      name: 'Upload File',
      description:
        'Upload a file to Supabase Storage. Supports images, documents, and other file types. Returns the public URL of the uploaded file.',
      method: 'POST',
      path: '/upload-file',
      requiresAuth: true,
      requestBody: {
        description: 'File data and metadata',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['file', 'bucket'],
          properties: {
            file: { type: 'string', description: 'Base64 encoded file data' },
            filename: { type: 'string' },
            bucket: { type: 'string', enum: ['avatars', 'hotels', 'documents', 'posts'] },
            folder: { type: 'string' },
            contentType: { type: 'string' },
          },
        },
        example: {
          file: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
          filename: 'hotel-lobby.jpg',
          bucket: 'hotels',
          folder: 'hotel-uuid/images',
          contentType: 'image/jpeg',
        },
      },
      responses: [
        {
          status: 200,
          description: 'File uploaded successfully',
          body: {
            success: true,
            data: {
              url: 'https://storage.supabase.co/v1/object/public/hotels/hotel-uuid/images/hotel-lobby.jpg',
              path: 'hotel-uuid/images/hotel-lobby.jpg',
              size: 245000,
              contentType: 'image/jpeg',
            },
          },
        },
        {
          status: 400,
          description: 'Invalid file',
          body: {
            success: false,
            error: {
              code: 'INVALID_FILE',
              message: 'File type not supported',
            },
          },
        },
        {
          status: 413,
          description: 'File too large',
          body: {
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File exceeds maximum size of 10MB',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Upload Hotel Image',
          description: 'Upload an image for a hotel listing',
          request: {
            file: 'base64data...',
            filename: 'room-photo.jpg',
            bucket: 'hotels',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                url: 'https://storage.supabase.co/hotels/room-photo.jpg',
              },
            },
          },
        },
        {
          name: 'Upload Avatar',
          description: 'Upload user profile picture',
          request: {
            file: 'base64data...',
            bucket: 'avatars',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                url: 'https://storage.supabase.co/avatars/user-uuid.jpg',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Unsupported File Type',
          description: 'When uploaded file type is not allowed',
          scenario: 'Upload executable .exe file',
          expectedBehavior: 'Returns 400 with unsupported type error',
        },
        {
          name: 'Corrupted File',
          description: 'When file data is corrupted',
          scenario: 'Malformed base64 data',
          expectedBehavior: 'Returns 400 with file parsing error',
        },
        {
          name: 'Invalid Bucket',
          description: 'When specified bucket does not exist',
          scenario: 'Upload to "nonexistent" bucket',
          expectedBehavior: 'Returns 400 with invalid bucket error',
        },
      ],
      notes: [
        'Supported image formats: JPEG, PNG, WebP, GIF',
        'Maximum file size: 10MB',
        'Files are automatically given unique names to prevent collisions',
      ],
    },
    {
      name: 'Process Image',
      description:
        'Process and optimize an uploaded image. Can resize, compress, and create thumbnails.',
      method: 'POST',
      path: '/process-image',
      requiresAuth: true,
      requestBody: {
        description: 'Image processing options',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['imageUrl'],
          properties: {
            imageUrl: { type: 'string', format: 'url' },
            operations: {
              type: 'object',
              properties: {
                resize: {
                  type: 'object',
                  properties: {
                    width: { type: 'number' },
                    height: { type: 'number' },
                  },
                },
                compress: { type: 'boolean' },
                quality: { type: 'number', minimum: 1, maximum: 100 },
                format: { type: 'string', enum: ['jpeg', 'png', 'webp'] },
                createThumbnail: { type: 'boolean' },
              },
            },
          },
        },
        example: {
          imageUrl: 'https://storage.supabase.co/hotels/original.jpg',
          operations: {
            resize: { width: 800, height: 600 },
            compress: true,
            quality: 80,
            format: 'webp',
            createThumbnail: true,
          },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Image processed successfully',
          body: {
            success: true,
            data: {
              processed_url: 'https://storage.supabase.co/hotels/processed.webp',
              thumbnail_url: 'https://storage.supabase.co/hotels/thumb.webp',
              original_size: 2500000,
              processed_size: 450000,
              savings_percentage: 82,
            },
          },
        },
      ],
      examples: [
        {
          name: 'Create Thumbnail',
          description: 'Generate thumbnail from large image',
          request: {
            imageUrl: 'https://storage.example.com/large.jpg',
            operations: {
              resize: { width: 150, height: 150 },
              format: 'webp',
            },
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                processed_url: 'https://storage.example.com/thumb.webp',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Invalid Image URL',
          description: 'When image URL is not accessible',
          scenario: 'URL returns 404',
          expectedBehavior: 'Returns 400 with image fetch error',
        },
        {
          name: 'Upscaling Attempt',
          description: 'When resize dimensions are larger than original',
          scenario: '500px image resized to 2000px',
          expectedBehavior: 'Processes but may warn about quality loss',
        },
      ],
    },

    // ========================================
    // Social Media Functions
    // ========================================
    {
      name: 'Create Social Post',
      description: 'Create a new social media post with optional media attachments.',
      method: 'POST',
      path: '/create-social-post',
      requiresAuth: true,
      requestBody: {
        description: 'Post content and settings',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', maxLength: 5000 },
            media_urls: { type: 'array', items: { type: 'string' } },
            visibility: { type: 'string', enum: ['public', 'friends', 'private'] },
            location: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        example: {
          content: 'Had an amazing stay at Paradise Hotel! The pool was incredible 🏊‍♂️',
          media_urls: [
            'https://storage.supabase.co/posts/img1.jpg',
            'https://storage.supabase.co/posts/img2.jpg',
          ],
          visibility: 'public',
          location: 'Lagos, Nigeria',
          tags: ['travel', 'hotels', 'vacation'],
        },
      },
      responses: [
        {
          status: 201,
          description: 'Post created successfully',
          body: {
            success: true,
            data: {
              id: 'post-uuid',
              content: 'Had an amazing stay...',
              media_urls: ['url1', 'url2'],
              visibility: 'public',
              author: {
                id: 'user-uuid',
                name: 'John Doe',
                avatar: 'https://example.com/avatar.jpg',
              },
              likes_count: 0,
              comments_count: 0,
              created_at: '2024-01-20T16:00:00Z',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Text Only Post',
          description: 'Simple text post without media',
          request: {
            content: 'Hello world!',
            visibility: 'public',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                id: 'post-uuid',
                content: 'Hello world!',
              },
            },
          },
        },
        {
          name: 'Private Post',
          description: 'Post visible only to the author',
          request: {
            content: 'Personal note',
            visibility: 'private',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                visibility: 'private',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Empty Content',
          description: 'When content is empty or whitespace only',
          scenario: 'Post with content: "   "',
          expectedBehavior: 'Returns 400 if no media attached, may allow if media exists',
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Post must have content or media',
              },
            },
          },
        },
        {
          name: 'Too Many Media Files',
          description: 'When exceeding media limit',
          scenario: 'Post with 15 images',
          expectedBehavior: 'Returns 400 with media limit error (max 10)',
        },
        {
          name: 'Spam Detection',
          description: 'When posting too frequently',
          scenario: '10 posts in 1 minute',
          expectedBehavior: 'Returns 429 with rate limit message',
        },
      ],
    },
    {
      name: 'Get Social Feed',
      description: 'Get personalized social feed with posts from friends and followed users.',
      method: 'GET',
      path: '/get-social-feed',
      requiresAuth: true,
      queryParams: [
        {
          name: 'page',
          description: 'Page number for pagination',
          required: false,
          example: '1',
          type: 'number',
        },
        {
          name: 'limit',
          description: 'Number of posts per page',
          required: false,
          example: '20',
          type: 'number',
        },
        {
          name: 'type',
          description: 'Filter by content type',
          required: false,
          example: 'all',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Feed retrieved successfully',
          body: {
            success: true,
            data: {
              posts: [
                {
                  id: 'post-uuid',
                  content: 'Great hotel experience!',
                  media_urls: ['https://example.com/photo.jpg'],
                  author: {
                    id: 'user-uuid',
                    name: 'Jane Doe',
                    avatar: 'https://example.com/avatar.jpg',
                  },
                  likes_count: 24,
                  comments_count: 5,
                  liked_by_me: false,
                  created_at: '2024-01-20T15:00:00Z',
                },
              ],
              pagination: {
                page: 1,
                limit: 20,
                has_more: true,
              },
            },
          },
        },
      ],
      examples: [
        {
          name: 'Initial Load',
          description: 'First page of feed',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                posts: [],
                pagination: { page: 1, has_more: false },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'New User No Friends',
          description: 'User with no friends/following',
          scenario: 'Brand new user requests feed',
          expectedBehavior: 'Returns trending/suggested posts',
        },
      ],
    },

    // ========================================
    // Call Functions (Agora Integration)
    // ========================================
    {
      name: 'Initiate Call',
      description:
        'Start a voice or video call. Returns Agora channel credentials for real-time communication.',
      method: 'POST',
      path: '/initiate-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call initiation parameters',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['conversationId', 'callType'],
          properties: {
            conversationId: { type: 'string', format: 'uuid' },
            callType: { type: 'string', enum: ['voice', 'video'] },
            participantIds: { type: 'array', items: { type: 'string' } },
          },
        },
        example: {
          conversationId: 'conversation-uuid-123',
          callType: 'video',
          participantIds: ['user-uuid-1', 'user-uuid-2'],
        },
      },
      responses: [
        {
          status: 201,
          description: 'Call initiated successfully',
          body: {
            success: true,
            data: {
              call: {
                id: 'call-uuid',
                agora_channel: 'giga-call-abc123',
                agora_token: 'eyJhbGciOiJIUzI1NiIs...',
                status: 'initiated',
                call_type: 'video',
                initiator_id: 'user-uuid',
                participants: [
                  { user_id: 'user-uuid-1', status: 'pending' },
                  { user_id: 'user-uuid-2', status: 'pending' },
                ],
                created_at: '2024-01-20T16:00:00Z',
              },
            },
          },
        },
      ],
      examples: [
        {
          name: 'Video Call',
          description: 'Start a video call',
          request: {
            conversationId: 'conv-uuid',
            callType: 'video',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                call: {
                  call_type: 'video',
                  agora_channel: 'channel-xyz',
                },
              },
            },
          },
        },
        {
          name: 'Voice Call',
          description: 'Start an audio-only call',
          request: {
            conversationId: 'conv-uuid',
            callType: 'voice',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                call: {
                  call_type: 'voice',
                },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'User Busy',
          description: 'When target user is in another call',
          scenario: 'Calling user who is currently on another call',
          expectedBehavior: 'Call is created but participant status shows "busy"',
        },
        {
          name: 'Blocked User',
          description: 'When calling a user who blocked you',
          scenario: 'Initiate call with blocked user',
          expectedBehavior: 'Returns 403 or pretends to ring but never connects',
        },
        {
          name: 'Invalid Conversation',
          description: 'When conversation ID doesnt exist or user not member',
          scenario: 'Fake conversation ID',
          expectedBehavior: 'Returns 404 or 403',
        },
      ],
      notes: [
        'Agora tokens expire after 24 hours',
        'Participants receive push notifications for incoming calls',
        'Use Supabase Realtime to listen for call status changes',
      ],
    },
    {
      name: 'Answer Call',
      description: 'Accept an incoming call. Joins the Agora channel and updates call status.',
      method: 'POST',
      path: '/answer-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call to answer',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['callId'],
          properties: {
            callId: { type: 'string', format: 'uuid' },
          },
        },
        example: {
          callId: 'call-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Call answered successfully',
          body: {
            success: true,
            data: {
              call: {
                id: 'call-uuid',
                status: 'active',
                agora_channel: 'channel-xyz',
                agora_token: 'fresh-token...',
                joined_at: '2024-01-20T16:00:30Z',
              },
            },
          },
        },
        {
          status: 400,
          description: 'Call already ended',
          body: {
            success: false,
            error: {
              code: 'CALL_ENDED',
              message: 'This call has already ended',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Answer Video Call',
          description: 'Join an incoming video call',
          request: { callId: 'call-uuid' },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                call: { status: 'active' },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Call Expired',
          description: 'When call has been ringing too long',
          scenario: 'Answer after 60 seconds timeout',
          expectedBehavior: 'Returns 400 with call expired message',
        },
        {
          name: 'Not Participant',
          description: 'When user was not invited to call',
          scenario: 'Random user tries to answer call',
          expectedBehavior: 'Returns 403',
        },
      ],
    },
    {
      name: 'Decline Call',
      description: 'Reject an incoming call.',
      method: 'POST',
      path: '/decline-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call to decline',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['callId'],
          properties: {
            callId: { type: 'string', format: 'uuid' },
          },
        },
        example: {
          callId: 'call-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Call declined',
          body: {
            success: true,
            data: {
              message: 'Call declined',
              call_id: 'call-uuid',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'End Call',
      description: 'End an active call for all participants.',
      method: 'POST',
      path: '/end-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call to end',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['callId'],
          properties: {
            callId: { type: 'string', format: 'uuid' },
          },
        },
        example: {
          callId: 'call-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Call ended',
          body: {
            success: true,
            data: {
              call_id: 'call-uuid',
              status: 'ended',
              duration: 145,
              ended_at: '2024-01-20T16:05:00Z',
            },
          },
        },
      ],
      examples: [
        {
          name: 'End Active Call',
          description: 'Terminate ongoing call',
          request: { callId: 'call-uuid' },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                duration: 300,
                status: 'ended',
              },
            },
          },
        },
      ],
      edgeCases: [],
    },
    {
      name: 'Leave Call',
      description: 'Leave a group call without ending it for others.',
      method: 'POST',
      path: '/leave-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call to leave',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['callId'],
          properties: {
            callId: { type: 'string', format: 'uuid' },
          },
        },
        example: {
          callId: 'call-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Left call successfully',
          body: {
            success: true,
            data: {
              message: 'You have left the call',
              call_status: 'active',
              remaining_participants: 2,
            },
          },
        },
      ],
      examples: [],
      edgeCases: [
        {
          name: 'Last Participant Leaves',
          description: 'When only remaining participant leaves',
          scenario: 'Leave when you are the last person',
          expectedBehavior: 'Call automatically ends',
        },
      ],
    },

    // ========================================
    // Taxi/Ride Functions
    // ========================================
    {
      name: 'Request Ride',
      description: 'Request a taxi ride from pickup to destination.',
      method: 'POST',
      path: '/request-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride request details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['pickup', 'destination'],
          properties: {
            pickup: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                address: { type: 'string' },
              },
            },
            destination: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                address: { type: 'string' },
              },
            },
            rideType: { type: 'string', enum: ['economy', 'comfort', 'premium'] },
            paymentMethod: { type: 'string', enum: ['cash', 'wallet', 'card'] },
            scheduledTime: { type: 'string', format: 'date-time' },
          },
        },
        example: {
          pickup: {
            lat: 6.4541,
            lng: 3.3947,
            address: 'Victoria Island, Lagos',
          },
          destination: {
            lat: 6.5244,
            lng: 3.3792,
            address: 'Ikeja, Lagos',
          },
          rideType: 'comfort',
          paymentMethod: 'wallet',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Ride requested successfully',
          body: {
            success: true,
            data: {
              ride: {
                id: 'ride-uuid',
                status: 'searching',
                pickup: { address: 'Victoria Island' },
                destination: { address: 'Ikeja' },
                ride_type: 'comfort',
                estimated_fare: { min: 2500, max: 3500, currency: 'NGN' },
                estimated_duration: '35 mins',
                estimated_distance: '18 km',
              },
            },
          },
        },
      ],
      examples: [
        {
          name: 'Economy Ride',
          description: 'Request cheapest ride option',
          request: {
            pickup: { lat: 6.45, lng: 3.39, address: 'VI' },
            destination: { lat: 6.52, lng: 3.37, address: 'Ikeja' },
            rideType: 'economy',
            paymentMethod: 'cash',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                ride: { ride_type: 'economy' },
              },
            },
          },
        },
        {
          name: 'Scheduled Ride',
          description: 'Book ride for later',
          request: {
            pickup: { lat: 6.45, lng: 3.39, address: 'VI' },
            destination: { lat: 6.44, lng: 7.5, address: 'Airport' },
            rideType: 'premium',
            scheduledTime: '2024-12-01T08:00:00Z',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                ride: {
                  status: 'scheduled',
                  scheduled_time: '2024-12-01T08:00:00Z',
                },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'No Drivers Available',
          description: 'When no drivers are nearby',
          scenario: 'Request in area with no active drivers',
          expectedBehavior: 'Returns success but with searching status, may timeout after 5 mins',
        },
        {
          name: 'Outside Service Area',
          description: 'When pickup/destination is outside coverage',
          scenario: 'Request from unsupported city',
          expectedBehavior: 'Returns 400 with unsupported area message',
        },
        {
          name: 'Insufficient Wallet Balance',
          description: 'When wallet payment but not enough funds',
          scenario: 'Ride costs ₦3000 but wallet has ₦500',
          expectedBehavior: 'Returns 402 with insufficient balance error',
        },
      ],
      notes: [
        'Use Supabase Realtime to track ride status changes',
        'Fare estimate is based on current traffic and demand',
        'Scheduled rides are matched 10 minutes before pickup time',
      ],
    },
    {
      name: 'Get Ride Estimate',
      description: 'Get fare estimate and ETA for a potential ride without booking.',
      method: 'POST',
      path: '/get-ride-estimate',
      requiresAuth: true,
      requestBody: {
        description: 'Route for estimation',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['pickup', 'destination'],
          properties: {
            pickup: { type: 'object' },
            destination: { type: 'object' },
          },
        },
        example: {
          pickup: { lat: 6.4541, lng: 3.3947 },
          destination: { lat: 6.5244, lng: 3.3792 },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Estimate calculated',
          body: {
            success: true,
            data: {
              estimates: [
                {
                  type: 'economy',
                  fare: { min: 1500, max: 2000, currency: 'NGN' },
                  eta: '3 mins',
                  duration: '35 mins',
                  distance: '18 km',
                },
                {
                  type: 'comfort',
                  fare: { min: 2500, max: 3500, currency: 'NGN' },
                  eta: '5 mins',
                },
                {
                  type: 'premium',
                  fare: { min: 5000, max: 7000, currency: 'NGN' },
                  eta: '8 mins',
                },
              ],
            },
          },
        },
      ],
      examples: [
        {
          name: 'Short Trip',
          description: 'Estimate for short distance',
          request: {
            pickup: { lat: 6.45, lng: 3.39 },
            destination: { lat: 6.46, lng: 3.4 },
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                estimates: [{ type: 'economy', fare: { min: 500 } }],
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Same Location',
          description: 'When pickup equals destination',
          scenario: 'Both coordinates are identical',
          expectedBehavior: 'Returns 400 with same location error',
        },
      ],
    },
    {
      name: 'Accept Ride (Driver)',
      description: 'Driver accepts a ride request.',
      method: 'POST',
      path: '/accept-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride to accept',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: {
            rideId: { type: 'string' },
          },
        },
        example: {
          rideId: 'ride-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Ride accepted',
          body: {
            success: true,
            data: {
              ride: {
                id: 'ride-uuid',
                status: 'accepted',
                rider: {
                  name: 'John Doe',
                  phone: '+234XXXXXXXXXX',
                },
                pickup: { address: 'Victoria Island' },
                destination: { address: 'Ikeja' },
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [
        {
          name: 'Already Accepted',
          description: 'When ride was accepted by another driver',
          scenario: 'Two drivers try to accept same ride',
          expectedBehavior: 'Second driver gets 409 Conflict',
        },
        {
          name: 'Ride Cancelled',
          description: 'When rider cancelled before acceptance',
          scenario: 'Accept after rider cancellation',
          expectedBehavior: 'Returns 400 with ride cancelled message',
        },
      ],
    },
    {
      name: 'Start Ride (Driver)',
      description: 'Driver marks that the ride has started (rider picked up).',
      method: 'POST',
      path: '/start-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride to start',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: {
            rideId: { type: 'string' },
          },
        },
        example: {
          rideId: 'ride-uuid-123',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Ride started',
          body: {
            success: true,
            data: {
              ride: {
                id: 'ride-uuid',
                status: 'in_progress',
                started_at: '2024-01-20T16:10:00Z',
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Complete Ride (Driver)',
      description: 'Driver marks the ride as completed at destination.',
      method: 'POST',
      path: '/complete-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride to complete',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: {
            rideId: { type: 'string' },
            finalLocation: { type: 'object' },
          },
        },
        example: {
          rideId: 'ride-uuid-123',
          finalLocation: { lat: 6.5244, lng: 3.3792 },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Ride completed',
          body: {
            success: true,
            data: {
              ride: {
                id: 'ride-uuid',
                status: 'completed',
                final_fare: 2750,
                currency: 'NGN',
                duration: '32 mins',
                distance: '17.5 km',
                driver_earnings: 2200,
                platform_fee: 550,
                completed_at: '2024-01-20T16:45:00Z',
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [
        {
          name: 'Unusual Route',
          description: 'When driver took a longer route',
          scenario: 'Actual distance is 2x estimated',
          expectedBehavior: 'Fare may be capped at estimate, flagged for review',
        },
      ],
    },
    {
      name: 'Cancel Ride',
      description:
        'Cancel an active ride request. May incur cancellation fee after driver acceptance.',
      method: 'POST',
      path: '/cancel-ride',
      requiresAuth: true,
      requestBody: {
        description: 'Ride to cancel',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId'],
          properties: {
            rideId: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        example: {
          rideId: 'ride-uuid-123',
          reason: 'Changed my mind',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Ride cancelled',
          body: {
            success: true,
            data: {
              message: 'Ride cancelled successfully',
              cancellation_fee: 200,
              currency: 'NGN',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Free Cancellation',
          description: 'Cancel before driver acceptance',
          request: {
            rideId: 'ride-uuid',
            reason: 'Found another ride',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                cancellation_fee: 0,
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Cancel During Ride',
          description: 'When rider tries to cancel in-progress ride',
          scenario: 'Ride status is "in_progress"',
          expectedBehavior: 'May allow with full fare charged, or reject',
        },
      ],
    },
    {
      name: 'Rate Driver',
      description: 'Rate a driver after completing a ride.',
      method: 'POST',
      path: '/rate-driver',
      requiresAuth: true,
      requestBody: {
        description: 'Driver rating',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['rideId', 'rating'],
          properties: {
            rideId: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
            tip: { type: 'number' },
          },
        },
        example: {
          rideId: 'ride-uuid-123',
          rating: 5,
          comment: 'Great driver, very professional!',
          tip: 500,
        },
      },
      responses: [
        {
          status: 200,
          description: 'Rating submitted',
          body: {
            success: true,
            data: {
              message: 'Thank you for your feedback!',
              tip_sent: 500,
            },
          },
        },
      ],
      examples: [],
      edgeCases: [
        {
          name: 'Already Rated',
          description: 'When ride was already rated',
          scenario: 'Submit rating twice for same ride',
          expectedBehavior: 'Returns 409 or updates existing rating',
        },
        {
          name: 'Rating Expired',
          description: 'When rating window has passed',
          scenario: 'Rate 7 days after ride',
          expectedBehavior: 'Returns 400 with expired message',
        },
      ],
    },

    // ========================================
    // Support & Tickets
    // ========================================
    {
      name: 'Create Support Ticket',
      description: 'Create a new support ticket for help with issues.',
      method: 'POST',
      path: '/create-support-ticket',
      requiresAuth: true,
      requestBody: {
        description: 'Ticket details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['subject', 'category'],
          properties: {
            subject: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['booking', 'payment', 'account', 'ride', 'other'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            relatedId: { type: 'string', description: 'Related booking/ride ID' },
          },
        },
        example: {
          subject: 'Refund not received',
          description: 'I cancelled my booking 5 days ago but havent received my refund',
          category: 'payment',
          priority: 'high',
          relatedId: 'booking-uuid-123',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Ticket created',
          body: {
            success: true,
            data: {
              ticket: {
                id: 'ticket-uuid',
                ticket_number: 'SUP-2024-001234',
                subject: 'Refund not received',
                status: 'open',
                priority: 'high',
                created_at: '2024-01-20T16:00:00Z',
                expected_response: '24 hours',
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get My Tickets',
      description: 'Get all support tickets created by the authenticated user.',
      method: 'GET',
      path: '/get-my-tickets',
      requiresAuth: true,
      queryParams: [
        {
          name: 'status',
          description: 'Filter by ticket status',
          required: false,
          example: 'open',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Tickets retrieved',
          body: {
            success: true,
            data: {
              tickets: [
                {
                  id: 'ticket-uuid',
                  ticket_number: 'SUP-2024-001234',
                  subject: 'Refund not received',
                  status: 'in_progress',
                  priority: 'high',
                  last_update: '2024-01-21T10:00:00Z',
                  replies_count: 2,
                },
              ],
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default supabaseFunctionsService;
