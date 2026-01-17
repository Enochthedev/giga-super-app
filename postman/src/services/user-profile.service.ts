/**
 * User Profile & Authentication Endpoints Documentation
 * Covers: User profiles, roles, authentication-related functions
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const userProfileService: ServiceDocumentation = {
  name: '01. Authentication & User Management',
  description: 'User profiles, role management, and authentication-related operations',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Get User Profile',
      description:
        'Retrieves the profile of a specific user by their ID. Returns public profile information including name, avatar, bio, and role.',
      method: 'GET',
      path: '/get-user-profile',
      requiresAuth: true,
      queryParams: [
        {
          name: 'userId',
          description: 'The UUID of the user to retrieve',
          required: true,
          example: '123e4567-e89b-12d3-a456-426614174000',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Profile retrieved successfully',
          body: {
            success: true,
            data: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              email: 'user@example.com',
              full_name: 'John Doe',
              avatar_url: 'https://example.com/avatar.jpg',
              bio: 'Travel enthusiast',
              phone: '+234XXXXXXXXXX',
              current_role: 'user',
              available_roles: ['user', 'vendor'],
              created_at: '2024-01-15T10:00:00Z',
              updated_at: '2024-01-20T15:30:00Z',
            },
          },
        },
        {
          status: 404,
          description: 'User not found',
          body: {
            success: false,
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User with the specified ID does not exist',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Get Own Profile',
          description: 'User retrieves their own profile',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'user@example.com',
                full_name: 'John Doe',
                current_role: 'user',
              },
            },
          },
        },
        {
          name: 'Get Other User Profile',
          description: "View another user's public profile",
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                id: '456e7890-e89b-12d3-a456-426614174001',
                full_name: 'Jane Smith',
                avatar_url: 'https://example.com/jane.jpg',
                bio: 'Hotel owner',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Invalid UUID Format',
          description: 'When userId is not a valid UUID',
          scenario: 'User provides malformed UUID like "not-a-uuid"',
          expectedBehavior: 'Returns 400 Bad Request with validation error',
          request: {},
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid userId format',
              },
            },
          },
        },
        {
          name: 'Deleted User',
          description: 'When user account has been soft-deleted',
          scenario: 'User tries to access profile of deleted account',
          expectedBehavior: 'Returns 404 with appropriate message',
        },
      ],
      notes: [
        'Some fields may be hidden based on privacy settings',
        'Email is only visible to the user themselves or admins',
      ],
    },
    {
      name: 'Get Current Profile',
      description:
        "Retrieves the authenticated user's own profile. Shortcut that doesn't require passing userId.",
      method: 'GET',
      path: '/get-current-profile',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Profile retrieved successfully',
          body: {
            success: true,
            data: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              email: 'user@example.com',
              full_name: 'John Doe',
              avatar_url: 'https://example.com/avatar.jpg',
              bio: 'Travel enthusiast',
              phone: '+234XXXXXXXXXX',
              current_role: 'user',
              available_roles: ['user', 'vendor'],
              preferences: {
                notifications_email: true,
                notifications_push: true,
                language: 'en',
              },
            },
          },
        },
        {
          status: 401,
          description: 'Not authenticated',
          body: {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Standard Response',
          description: 'Full profile with all fields',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'user@example.com',
                full_name: 'John Doe',
                current_role: 'user',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Expired Token',
          description: 'When JWT token has expired',
          scenario: 'User sends request with expired auth token',
          expectedBehavior: 'Returns 401 with token expired message',
          response: {
            status: 401,
            body: {
              success: false,
              error: {
                code: 'TOKEN_EXPIRED',
                message: 'Authentication token has expired',
              },
            },
          },
        },
      ],
    },
    {
      name: 'Update User Profile',
      description:
        "Updates the authenticated user's profile. Allows updating name, bio, avatar, phone, and preferences.",
      method: 'POST',
      path: '/update-user-profile',
      requiresAuth: true,
      requestBody: {
        description: 'Profile fields to update. Only include fields you want to change.',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            full_name: { type: 'string', maxLength: 100 },
            bio: { type: 'string', maxLength: 500 },
            avatar_url: { type: 'string', format: 'url' },
            phone: { type: 'string', pattern: '^\\+[0-9]{10,15}$' },
            preferences: {
              type: 'object',
              properties: {
                notifications_email: { type: 'boolean' },
                notifications_push: { type: 'boolean' },
                language: { type: 'string', enum: ['en', 'fr', 'yo', 'ha', 'ig'] },
              },
            },
          },
        },
        example: {
          full_name: 'John Doe Updated',
          bio: 'Love exploring new hotels',
          phone: '+2348012345678',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Profile updated successfully',
          body: {
            success: true,
            data: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              full_name: 'John Doe Updated',
              bio: 'Love exploring new hotels',
              phone: '+2348012345678',
              updated_at: '2024-01-20T16:00:00Z',
            },
          },
        },
        {
          status: 400,
          description: 'Validation error',
          body: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid phone number format',
              details: {
                field: 'phone',
                constraint: 'Must be in international format (+XXXXXXXXXXXX)',
              },
            },
          },
        },
      ],
      examples: [
        {
          name: 'Update Name Only',
          description: 'Partial update of just the name',
          request: {
            full_name: 'New Name',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                full_name: 'New Name',
              },
            },
          },
        },
        {
          name: 'Update Preferences',
          description: 'Update notification preferences',
          request: {
            preferences: {
              notifications_push: false,
              language: 'fr',
            },
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                preferences: {
                  notifications_push: false,
                  language: 'fr',
                },
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Empty Update',
          description: 'When no fields are provided',
          scenario: 'Request body is empty {}',
          expectedBehavior: 'Returns 400 with message that at least one field is required',
          request: {},
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'At least one field must be provided for update',
              },
            },
          },
        },
        {
          name: 'Bio Too Long',
          description: 'When bio exceeds maximum length',
          scenario: 'Bio is over 500 characters',
          expectedBehavior: 'Returns 400 with max length error',
        },
        {
          name: 'Profanity in Bio',
          description: 'When bio contains inappropriate content',
          scenario: 'Bio contains profanity or offensive content',
          expectedBehavior: 'May be flagged for moderation or rejected',
        },
      ],
      notes: [
        'Avatar URL should point to an image hosted via upload-file endpoint',
        'Phone number verification may be required for some features',
      ],
    },
    {
      name: 'Switch Role',
      description:
        "Switch the user's active role between available roles (user, vendor, driver, admin). User must have the target role in their available_roles.",
      method: 'POST',
      path: '/switch-role',
      requiresAuth: true,
      requestBody: {
        description: 'The role to switch to',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['role'],
          properties: {
            role: {
              type: 'string',
              enum: ['user', 'vendor', 'driver', 'admin'],
            },
          },
        },
        example: {
          role: 'vendor',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Role switched successfully',
          body: {
            success: true,
            data: {
              previous_role: 'user',
              current_role: 'vendor',
              available_roles: ['user', 'vendor'],
              message: 'Successfully switched to vendor role',
            },
          },
        },
        {
          status: 403,
          description: 'Role not available',
          body: {
            success: false,
            error: {
              code: 'ROLE_NOT_AVAILABLE',
              message: 'You do not have access to the vendor role. Please apply first.',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Switch to Vendor',
          description: 'User switches to vendor role to manage hotels',
          request: { role: 'vendor' },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                previous_role: 'user',
                current_role: 'vendor',
              },
            },
          },
        },
        {
          name: 'Switch Back to User',
          description: 'Vendor switches back to user role',
          request: { role: 'user' },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                previous_role: 'vendor',
                current_role: 'user',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Same Role',
          description: 'When switching to already active role',
          scenario: 'User is already in user role and tries to switch to user',
          expectedBehavior: 'Returns 200 with no change message',
          request: { role: 'user' },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                message: 'Already in user role',
                current_role: 'user',
              },
            },
          },
        },
        {
          name: 'Admin Role Without Permission',
          description: 'When non-admin tries to switch to admin',
          scenario: 'Regular user tries to access admin role',
          expectedBehavior: 'Returns 403 Forbidden',
        },
      ],
    },
    {
      name: 'Apply for Role',
      description:
        'Submit an application for a new role (vendor or driver). Application goes through approval process.',
      method: 'POST',
      path: '/apply-for-role',
      requiresAuth: true,
      requestBody: {
        description: 'Role application details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['role', 'documents'],
          properties: {
            role: { type: 'string', enum: ['vendor', 'driver'] },
            business_name: { type: 'string' },
            business_type: { type: 'string' },
            documents: {
              type: 'object',
              properties: {
                id_card: { type: 'string', format: 'url' },
                license: { type: 'string', format: 'url' },
                cac_certificate: { type: 'string', format: 'url' },
              },
            },
            additional_info: { type: 'string' },
          },
        },
        example: {
          role: 'vendor',
          business_name: 'Paradise Hotels Ltd',
          business_type: 'hotel',
          documents: {
            id_card: 'https://storage.example.com/docs/id-123.jpg',
            cac_certificate: 'https://storage.example.com/docs/cac-123.pdf',
          },
          additional_info: 'We operate 3 hotels in Lagos',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Application submitted successfully',
          body: {
            success: true,
            data: {
              application_id: '789e0123-e89b-12d3-a456-426614174002',
              status: 'pending',
              role_applied: 'vendor',
              submitted_at: '2024-01-20T16:00:00Z',
              estimated_review_time: '2-3 business days',
            },
          },
        },
        {
          status: 409,
          description: 'Duplicate application',
          body: {
            success: false,
            error: {
              code: 'APPLICATION_EXISTS',
              message: 'You already have a pending application for vendor role',
              existing_application_id: '789e0123-e89b-12d3-a456-426614174002',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Vendor Application',
          description: 'Hotel owner applies to become a vendor',
          request: {
            role: 'vendor',
            business_name: 'Paradise Hotels Ltd',
            business_type: 'hotel',
            documents: {
              id_card: 'https://storage.example.com/docs/id.jpg',
            },
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                application_id: 'uuid-here',
                status: 'pending',
              },
            },
          },
        },
        {
          name: 'Driver Application',
          description: 'User applies to become a taxi driver',
          request: {
            role: 'driver',
            documents: {
              id_card: 'https://storage.example.com/docs/id.jpg',
              license: 'https://storage.example.com/docs/license.jpg',
            },
            additional_info: '5 years driving experience',
          },
          response: {
            status: 201,
            body: {
              success: true,
              data: {
                application_id: 'uuid-here',
                status: 'pending',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'Missing Documents',
          description: 'Required documents not provided',
          scenario: 'Application without ID card',
          expectedBehavior: 'Returns 400 with list of required documents',
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'MISSING_DOCUMENTS',
                message: 'id_card is required for vendor applications',
              },
            },
          },
        },
        {
          name: 'Already Has Role',
          description: 'When user already has the role',
          scenario: 'Vendor applies for vendor role again',
          expectedBehavior: 'Returns 409 with message that role already granted',
        },
      ],
    },
    {
      name: 'Upload Profile Picture',
      description: 'Upload a new profile picture. Returns the URL of the uploaded image.',
      method: 'POST',
      path: '/upload-profile-picture',
      requiresAuth: true,
      requestBody: {
        description: 'Image file in base64 or multipart form data',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['image'],
          properties: {
            image: { type: 'string', description: 'Base64 encoded image data' },
            filename: { type: 'string' },
          },
        },
        example: {
          image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
          filename: 'profile.jpg',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Image uploaded successfully',
          body: {
            success: true,
            data: {
              url: 'https://storage.supabase.co/profiles/user-123/avatar.jpg',
              thumbnail_url: 'https://storage.supabase.co/profiles/user-123/avatar-thumb.jpg',
            },
          },
        },
        {
          status: 400,
          description: 'Invalid image',
          body: {
            success: false,
            error: {
              code: 'INVALID_IMAGE',
              message: 'Uploaded file is not a valid image',
            },
          },
        },
      ],
      examples: [
        {
          name: 'JPEG Upload',
          description: 'Upload a JPEG profile picture',
          request: {
            image: 'data:image/jpeg;base64,/9j/4AAQ...',
            filename: 'my-photo.jpg',
          },
          response: {
            status: 200,
            body: {
              success: true,
              data: {
                url: 'https://storage.supabase.co/profiles/avatar.jpg',
              },
            },
          },
        },
      ],
      edgeCases: [
        {
          name: 'File Too Large',
          description: 'When image exceeds 5MB limit',
          scenario: 'User uploads 10MB image',
          expectedBehavior: 'Returns 400 with file size error',
          response: {
            status: 400,
            body: {
              success: false,
              error: {
                code: 'FILE_TOO_LARGE',
                message: 'Image must be less than 5MB',
              },
            },
          },
        },
        {
          name: 'Invalid Format',
          description: 'When file is not an image',
          scenario: 'User uploads PDF instead of image',
          expectedBehavior: 'Returns 400 with format error',
        },
        {
          name: 'Corrupted Image',
          description: 'When image data is corrupted',
          scenario: 'Base64 data is malformed',
          expectedBehavior: 'Returns 400 with processing error',
        },
      ],
      notes: [
        'Supported formats: JPEG, PNG, WebP',
        'Maximum file size: 5MB',
        'Images are automatically resized and optimized',
        'Previous avatar is replaced, not versioned',
      ],
    },
  ],
};

export default userProfileService;
