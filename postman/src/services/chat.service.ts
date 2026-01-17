/**
 * Chat & Communication Service Documentation
 * Covers: Real-time messaging, video/voice calls usage (Agora), and conversations
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const chatService: ServiceDocumentation = {
  name: '08. Chat & Communication',
  description: 'Messaging, video calls, and voice calls',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    // ========================================
    // Messaging
    // ========================================
    {
      name: 'Get Conversations',
      description: 'Get list of active conversations/chats.',
      method: 'GET',
      path: '/get-conversations',
      requiresAuth: true,
      responses: [
        {
          status: 200,
          description: 'Conversations retrieved',
          body: {
            success: true,
            data: {
              conversations: [
                {
                  id: 'conv-uuid',
                  type: 'private',
                  participants: [{ id: 'user-2', name: 'Jane' }],
                  last_message: { content: 'Hi there', sent_at: '2024-01-20T10:00:00Z' },
                  unread_count: 2,
                },
              ],
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Create Conversation',
      description: 'Start a new conversation with one or more users.',
      method: 'POST',
      path: '/create-conversation',
      requiresAuth: true,
      requestBody: {
        description: 'Conversation details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['participantIds'],
          properties: {
            participantIds: { type: 'array', items: { type: 'string' } },
            type: { type: 'string', enum: ['private', 'group'] },
            title: { type: 'string' },
          },
        },
        example: {
          participantIds: ['user-uuid-2'],
          type: 'private',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Conversation created',
          body: { success: true, data: { id: 'conv-uuid' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Send Message',
      description: 'Send a text or media message to a conversation.',
      method: 'POST',
      path: '/send-message',
      requiresAuth: true,
      requestBody: {
        description: 'Message content',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['conversationId', 'content'],
          properties: {
            conversationId: { type: 'string' },
            content: { type: 'string' },
            mediaUrl: { type: 'string' },
            type: { type: 'string', enum: ['text', 'image', 'file'] },
          },
        },
        example: {
          conversationId: 'conv-uuid',
          content: 'Hello!',
          type: 'text',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Message sent',
          body: {
            success: true,
            data: { id: 'msg-uuid', sent_at: '2024-01-20T12:00:00Z' },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Messages',
      description: 'Get message history for a conversation.',
      method: 'GET',
      path: '/get-messages',
      requiresAuth: true,
      queryParams: [
        {
          name: 'conversationId',
          required: true,
          example: 'conv-uuid',
          type: 'string',
          description: 'Conversation ID',
        },
        {
          name: 'limit',
          required: false,
          example: '50',
          type: 'number',
          description: 'Messages per page',
        },
        {
          name: 'before',
          required: false,
          example: 'msg-uuid',
          type: 'string',
          description: 'Cursor for pagination',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Messages retrieved',
          body: {
            success: true,
            data: {
              messages: [{ id: 'msg-1', content: 'Hi', sender_id: 'user-1' }],
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },

    // ========================================
    // Voice & Video Calls (Agora)
    // ========================================
    {
      name: 'Initiate Call',
      description: 'Start a voice or video call. Returns Agora credentials.',
      method: 'POST',
      path: '/initiate-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call details',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['conversationId', 'callType'],
          properties: {
            conversationId: { type: 'string' },
            callType: { type: 'string', enum: ['voice', 'video'] },
          },
        },
        example: {
          conversationId: 'conv-uuid',
          callType: 'video',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Call initiated',
          body: {
            success: true,
            data: {
              call: {
                id: 'call-uuid',
                agora_token: 'token...',
                agora_channel: 'channel...',
              },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Answer Call',
      description: 'Join an incoming call.',
      method: 'POST',
      path: '/answer-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call ID',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['callId'],
          properties: { callId: { type: 'string' } },
        },
        example: { callId: 'call-uuid' },
      },
      responses: [
        {
          status: 200,
          description: 'Joined',
          body: { success: true, data: { agora_token: 'token...' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'End Call',
      description: 'Terminate a call.',
      method: 'POST',
      path: '/end-call',
      requiresAuth: true,
      requestBody: {
        description: 'Call ID',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['callId'],
          properties: { callId: { type: 'string' } },
        },
        example: { callId: 'call-uuid' },
      },
      responses: [
        {
          status: 200,
          description: 'Ended',
          body: { success: true, data: { status: 'ended', duration: 120 } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default chatService;
