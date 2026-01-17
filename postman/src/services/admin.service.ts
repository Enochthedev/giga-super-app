/**
 * Admin Service Documentation
 * Covers: Administrative functions, user management, platform settings, and financial reports
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const adminService: ServiceDocumentation = {
  name: '09. Admin & Platform',
  description:
    'Administrative tools for platform management, user oversight, and financial reporting',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    // ========================================
    // Dashboard & Stats
    // ========================================
    {
      name: 'Get Dashboard Stats',
      description:
        'Get high-level statistics for the admin dashboard (users, revenue, growth, active sessions).',
      method: 'GET',
      path: '/admin-get-dashboard-stats',
      requiresAuth: true,
      queryParams: [
        {
          name: 'period',
          description: 'Time period for stats',
          required: false,
          example: '30d',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Stats retrieved',
          body: {
            success: true,
            data: {
              total_users: 15420,
              total_revenue: 45000000,
              active_bookings: 125,
              new_users_today: 45,
              growth_rate: 12.5,
              period: '30d',
            },
          },
        },
      ],
      examples: [
        {
          name: 'Monthly Stats',
          description: 'Get stats for last 30 days',
          request: {},
          response: {
            status: 200,
            body: {
              success: true,
              data: { period: '30d', total_users: 15420 },
            },
          },
        },
      ],
      edgeCases: [],
      notes: ['Requires ADMIN role'],
    },
    {
      name: 'Financial Reports',
      description: 'Generate detailed financial reports for platform revenue, payouts, and fees.',
      method: 'GET',
      path: '/admin-financial-reports',
      requiresAuth: true,
      queryParams: [
        {
          name: 'startDate',
          description: 'Start date (ISO)',
          required: true,
          example: '2024-01-01',
          type: 'string',
        },
        {
          name: 'endDate',
          description: 'End date (ISO)',
          required: true,
          example: '2024-01-31',
          type: 'string',
        },
        {
          name: 'type',
          description: 'Report type',
          required: false,
          example: 'revenue',
          type: 'string',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Report generated',
          body: {
            success: true,
            data: {
              generated_at: '2024-02-01T10:00:00Z',
              period: { start: '2024-01-01', end: '2024-01-31' },
              total_gross_volume: 5000000,
              platform_fees: 500000,
              vendor_payouts: 4500000,
              refunds: 20000,
              breakdown_by_service: {
                hotels: 3000000,
                taxi: 1500000,
                ads: 500000,
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
      notes: ['Requires ADMIN or FINANCE_MANAGER role'],
    },

    // ========================================
    // User & Vendor Management
    // ========================================
    {
      name: 'Manage Users',
      description: 'Search and manage platform users. View details, status, and history.',
      method: 'POST',
      path: '/admin-manage-users',
      requiresAuth: true,
      requestBody: {
        description: 'Search criteria',
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['search', 'get_details'] },
            query: { type: 'string' },
            userId: { type: 'string' },
            filters: { type: 'object' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
        example: {
          action: 'search',
          query: 'john.doe@example.com',
          filters: { status: 'active' },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Users found',
          body: {
            success: true,
            data: {
              users: [
                {
                  id: 'user-uuid',
                  email: 'john@example.com',
                  name: 'John Doe',
                  status: 'active',
                  joined_at: '2023-01-01',
                },
              ],
              total: 1,
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Block User',
      description: 'Suspend a user account, preventing login and access.',
      method: 'POST',
      path: '/block-user',
      requiresAuth: true,
      requestBody: {
        description: 'Block details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['userId', 'reason'],
          properties: {
            userId: { type: 'string' },
            reason: { type: 'string' },
            duration_days: { type: 'number', description: 'Optional duration, null for permanent' },
          },
        },
        example: {
          userId: 'target-user-uuid',
          reason: 'Violation of terms of service - spamming',
          duration_days: 7,
        },
      },
      responses: [
        {
          status: 200,
          description: 'User blocked',
          body: {
            success: true,
            data: {
              userId: 'target-user-uuid',
              status: 'blocked',
              reason: 'Violation of terms...',
              blocked_until: '2024-01-27T10:00:00Z',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Unblock User',
      description: 'Restore access to a suspended user account.',
      method: 'POST',
      path: '/unblock-user',
      requiresAuth: true,
      requestBody: {
        description: 'Unblock details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
            reason: { type: 'string' },
          },
        },
        example: {
          userId: 'target-user-uuid',
          reason: 'Appeal accepted',
        },
      },
      responses: [
        {
          status: 200,
          description: 'User unblocked',
          body: {
            success: true,
            data: {
              userId: 'target-user-uuid',
              status: 'active',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Review Role Application',
      description:
        'Approve or reject a user request for a specialized role (vendor, driver, etc.).',
      method: 'POST',
      path: '/review-role-application',
      requiresAuth: true,
      requestBody: {
        description: 'Review decision',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['applicationId', 'decision'],
          properties: {
            applicationId: { type: 'string' },
            decision: { type: 'string', enum: ['approved', 'rejected'] },
            notes: { type: 'string' },
          },
        },
        example: {
          applicationId: 'app-uuid-123',
          decision: 'approved',
          notes: 'Documents verified',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Application processed',
          body: {
            success: true,
            data: {
              id: 'app-uuid',
              status: 'approved',
              updated_at: '2024-01-20T10:00:00Z',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },

    // ========================================
    // Platform Configuration
    // ========================================
    {
      name: 'Get Platform Settings',
      description: 'Retrieve global platform configuration settings.',
      method: 'GET',
      path: '/get-platform-settings',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Settings retrieved',
          body: {
            success: true,
            data: {
              settings: {
                platform_fee_percent: 5,
                min_payout_amount: 5000,
                maintenance_mode: false,
                allowed_countries: ['NG', 'GH', 'KE'],
                features: {
                  crypto_payments: true,
                  beta_dashboard: false,
                },
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Update Platform Setting',
      description: 'Modify a global platform setting.',
      method: 'POST',
      path: '/update-platform-setting',
      requiresAuth: true,
      requestBody: {
        description: 'Setting to update',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key: { type: 'string' },
            value: { type: 'any' },
          },
        },
        example: {
          key: 'platform_fee_percent',
          value: 6,
        },
      },
      responses: [
        {
          status: 200,
          description: 'Setting updated',
          body: {
            success: true,
            data: {
              key: 'platform_fee_percent',
              value: 6,
              updated_at: '2024-01-20T10:00:00Z',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
      notes: ['Requires SUPER_ADMIN role'],
    },

    // ========================================
    // Content Management
    // ========================================
    {
      name: 'Manage Content',
      description: 'Moderate user-generated content (posts, comments, reviews).',
      method: 'POST',
      path: '/admin-manage-content',
      requiresAuth: true,
      requestBody: {
        description: 'Content action',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['contentId', 'contentType', 'action'],
          properties: {
            contentId: { type: 'string' },
            contentType: { type: 'string', enum: ['post', 'comment', 'review'] },
            action: { type: 'string', enum: ['delete', 'hide', 'restore'] },
            reason: { type: 'string' },
          },
        },
        example: {
          contentId: 'post-uuid-123',
          contentType: 'post',
          action: 'delete',
          reason: 'Hate speech',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Content action completed',
          body: {
            success: true,
            data: {
              content_id: 'post-uuid-123',
              status: 'deleted',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Process Payout (Admin)',
      description: 'Manually approve/process a vendor payout request.',
      method: 'POST',
      path: '/Admin-process-payout',
      requiresAuth: true,
      requestBody: {
        description: 'Payout processing details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['payoutId', 'action'],
          properties: {
            payoutId: { type: 'string' },
            action: { type: 'string', enum: ['approve', 'reject'] },
            transactionReference: {
              type: 'string',
              description: 'Bank transaction ID if approved',
            },
            rejectionReason: { type: 'string' },
          },
        },
        example: {
          payoutId: 'payout-uuid-123',
          action: 'approve',
          transactionReference: 'bank_txn_789',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Payout processed',
          body: {
            success: true,
            data: {
              payout_id: 'payout-uuid-123',
              status: 'completed',
              processed_at: '2024-01-20T10:00:00Z',
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default adminService;
