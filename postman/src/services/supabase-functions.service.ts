/**
 * Core Utilities & Support Service
 * Covers: File uploads, image processing, and support tickets
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const coreService: ServiceDocumentation = {
  name: '00. Core Utilities',
  description: 'System utilities including file storage and support',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    // ========================================
    // File Upload Functions
    // ========================================
    {
      name: 'Upload File',
      description: 'Upload a file to Supabase Storage.',
      method: 'POST',
      path: '/upload-file',
      requiresAuth: true,
      requestBody: {
        description: 'File data',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['file', 'bucket'],
          properties: {
            file: { type: 'string', description: 'Base64' },
            filename: { type: 'string' },
            bucket: { type: 'string' },
            contentType: { type: 'string' },
          },
        },
        example: {
          file: 'data:image...',
          filename: 'photo.jpg',
          bucket: 'avatars',
        },
      },
      responses: [
        {
          status: 200,
          description: 'Uploaded',
          body: {
            success: true,
            data: { url: 'https://storage...' },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Process Image',
      description: 'Resize and optimize images.',
      method: 'POST',
      path: '/process-image',
      requiresAuth: true,
      requestBody: {
        description: 'Options',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['imageUrl'],
          properties: {
            imageUrl: { type: 'string' },
            operations: { type: 'object' },
          },
        },
        example: {
          imageUrl: 'https://...',
          operations: { resize: { width: 100 } },
        },
      },
      responses: [
        {
          status: 200,
          description: 'Processed',
          body: {
            success: true,
            data: { processed_url: 'https://...' },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },

    // ========================================
    // Support Tickets
    // ========================================
    {
      name: 'Create Ticket',
      description: 'Open a support ticket.',
      method: 'POST',
      path: '/create-support-ticket',
      requiresAuth: true,
      requestBody: {
        description: 'Ticket details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['subject', 'description'],
          properties: {
            subject: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
          },
        },
        example: {
          subject: 'Help needed',
          description: 'Issue with booking',
          category: 'booking',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Created',
          body: { success: true, data: { id: 'ticket-uuid' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get My Tickets',
      description: 'List user tickets.',
      method: 'GET',
      path: '/get-my-tickets',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Tickets retrieved',
          body: {
            success: true,
            data: { tickets: [] },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default coreService;
