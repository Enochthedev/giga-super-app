/**
 * Social Media Service Documentation
 * Covers: Posts, feed, stories, friendships, and interactions
 */

import type { ServiceDocumentation } from '../types/postman.types.js';

export const socialService: ServiceDocumentation = {
  name: '07. Social Media',
  description: 'Social networking features including feeds, posts, stories, and friends',
  baseUrl: '{{base_url}}',
  version: '1.0.0',
  endpoints: [
    // ... (social endpoints from previous supabase-functions.ts + new ones)
    {
      name: 'Create Post',
      description: 'Create a new text or media post.',
      method: 'POST',
      path: '/create-social-post',
      requiresAuth: true,
      requestBody: {
        description: 'Post content',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string' },
            media_urls: { type: 'array', items: { type: 'string' } },
            visibility: { type: 'string', enum: ['public', 'friends', 'private'] },
          },
        },
        example: {
          content: 'Hello world!',
          visibility: 'public',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Post created',
          body: { success: true, data: { id: 'post-uuid' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Get Feed',
      description: "Get user's personalized social feed.",
      method: 'GET',
      path: '/get-social-feed',
      requiresAuth: true,
      queryParams: [
        {
          name: 'page',
          required: false,
          example: '1',
          type: 'number',
          description: 'Pagination page',
        },
      ],
      responses: [
        {
          status: 200,
          description: 'Feed retrieved',
          body: {
            success: true,
            data: {
              posts: [],
              pagination: { page: 1, has_more: false },
            },
          },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Like Post',
      description: 'Like or unlike a post.',
      method: 'POST',
      path: '/like-post',
      requiresAuth: true,
      requestBody: {
        description: 'Post to like',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['postId'],
          properties: { postId: { type: 'string' } },
        },
        example: { postId: 'post-uuid' },
      },
      responses: [
        {
          status: 200,
          description: 'Toggled like',
          body: { success: true, data: { liked: true, likes_count: 42 } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Comment on Post',
      description: 'Add a comment to a post.',
      method: 'POST',
      path: '/comment-on-post',
      requiresAuth: true,
      requestBody: {
        description: 'Comment content',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['postId', 'content'],
          properties: {
            postId: { type: 'string' },
            content: { type: 'string' },
          },
        },
        example: { postId: 'post-uuid', content: 'Great post!' },
      },
      responses: [
        {
          status: 201,
          description: 'Comment added',
          body: { success: true, data: { id: 'comment-uuid' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Send Friend Request',
      description: 'Send a friend request to another user.',
      method: 'POST',
      path: '/send-friend-request',
      requiresAuth: true,
      requestBody: {
        description: 'Target user',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'string' } },
        },
        example: { userId: 'target-user-uuid' },
      },
      responses: [
        {
          status: 200,
          description: 'Request sent',
          body: { success: true, data: { status: 'pending' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Respond to Friend Request',
      description: 'Accept or reject a friend request.',
      method: 'POST',
      path: '/respond-to-friend-request',
      requiresAuth: true,
      requestBody: {
        description: 'Response',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['requestId', 'action'],
          properties: {
            requestId: { type: 'string' },
            action: { type: 'string', enum: ['accept', 'reject'] },
          },
        },
        example: { requestId: 'req-uuid', action: 'accept' },
      },
      responses: [
        {
          status: 200,
          description: 'Processed',
          body: { success: true, data: { status: 'accepted' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
    {
      name: 'Create Story',
      description: 'Post a temporary story (image/video).',
      method: 'POST',
      path: '/create-story',
      requiresAuth: true,
      requestBody: {
        description: 'Story content',
        contentType: 'application/json',
        schema: {
          type: 'object',
          required: ['mediaUrl', 'type'],
          properties: {
            mediaUrl: { type: 'string' },
            type: { type: 'string', enum: ['image', 'video'] },
            caption: { type: 'string' },
          },
        },
        example: {
          mediaUrl: 'https://storage.co/story.jpg',
          type: 'image',
          caption: 'My day',
        },
      },
      responses: [
        {
          status: 201,
          description: 'Story created',
          body: { success: true, data: { id: 'story-uuid', expires_at: '2024-01-21T00:00:00Z' } },
        },
      ],
      examples: [],
      edgeCases: [],
    },
  ],
};

export default socialService;
