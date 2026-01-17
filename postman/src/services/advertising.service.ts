/**
 * Advertising Service Documentation
 * Covers: Ad campaigns, advertiser profiles, and analytics
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const advertisingService: ServiceDocumentation = {
  name: '10. Advertising',
  description: 'Ad campaign management for promoting hotels, products, or services',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    {
      name: 'Create Advertiser Profile',
      description: 'Register as an advertiser to start running campaigns.',
      method: 'POST',
      path: '/create-advertiser-profile',
      requiresAuth: true,
      requestBody: {
        description: 'Profile details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['businessName', 'category'],
          properties: {
            businessName: { type: 'string' },
            category: { type: 'string' },
            website: { type: 'string' },
          },
        },
        example: {
          businessName: 'Giga Hotels',
          category: 'travel',
          website: 'https://gigahotels.com',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Profile created',
          body: { success: true, data: { id: 'advertiser-uuid' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Create Ad Campaign',
      description: 'Create and launch a new ad campaign.',
      method: 'POST',
      path: '/create-ad-campaign',
      requiresAuth: true,
      requestBody: {
        description: 'Campaign details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['title', 'budget', 'startDate'],
          properties: {
            title: { type: 'string' },
            budget: { type: 'number' },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
            targetAudience: { type: 'object' },
            creative: { type: 'object', description: 'Ad content/image' },
          },
        },
        example: {
          title: 'Summer Sale',
          budget: 50000,
          startDate: '2024-06-01',
          targetAudience: { country: 'NG', interests: ['travel'] },
          creative: { title: '50% Off', image_url: 'url...', link: 'url...' },
        },
      },
      responses: [
        {
          status: 201,
          description: 'Campaign created',
          body: { success: true, data: { id: 'camp-uuid', status: 'pending_approval' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Ad Analytics',
      description: 'Get performance metrics for campaigns.',
      method: 'GET',
      path: '/get-ad-analytics',
      requiresAuth: true,
      queryParams: [
        {
          name: 'campaignId',
          required: true,
          example: 'camp-uuid',
          type: 'string',
          description: 'Campaign ID',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Analytics retrieved',
          body: {
            success: true,
            data: {
              impressions: 15000,
              clicks: 450,
              ctr: 3.0,
              spend: 12500,
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default advertisingService;
