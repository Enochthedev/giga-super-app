import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Post schemas
export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, 'Content is required')
    .max(5000, 'Content must be less than 5000 characters'),
  media_urls: z
    .array(z.string().url('Invalid media URL'))
    .max(10, 'Maximum 10 media items allowed')
    .optional()
    .default([]),
  visibility: z.enum(['public', 'friends', 'private']).default('public'),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      name: z.string().max(200).optional(),
    })
    .optional(),
  feeling_activity: z.string().max(100).optional(),
  tagged_users: z.array(z.string().uuid()).max(50).optional(),
});

export const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  visibility: z.enum(['public', 'friends', 'private']).optional(),
});

export const getPostsQuerySchema = paginationSchema.extend({
  visibility: z.enum(['public', 'friends', 'private']).optional(),
  user_id: z.string().uuid().optional(),
});

// Comment schemas
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must be less than 2000 characters'),
  parent_comment_id: z.string().uuid().optional().nullable(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

// Like schemas
export const likeSchema = z.object({
  reaction_type: z.enum(['like', 'love', 'haha', 'wow', 'sad', 'angry']).default('like'),
});

// Story schemas
export const createStorySchema = z.object({
  media_url: z.string().url('Invalid media URL'),
  media_type: z.enum(['image', 'video']),
  caption: z.string().max(500).optional(),
  duration_seconds: z.number().int().min(1).max(60).default(5),
});

// Connection schemas
export const createConnectionSchema = z.object({
  connected_user_id: z.string().uuid('Invalid user ID'),
  connection_type: z.enum(['friend', 'follower', 'family', 'colleague']).default('friend'),
});

export const updateConnectionSchema = z.object({
  status: z.enum(['accepted', 'blocked', 'declined']),
});

// Report schemas
export const reportPostSchema = z.object({
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'nudity',
    'false_information',
    'other',
  ]),
  description: z.string().max(1000).optional(),
});

// Type exports
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type GetPostsQuery = z.infer<typeof getPostsQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type LikeInput = z.infer<typeof likeSchema>;
export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type UpdateConnectionInput = z.infer<typeof updateConnectionSchema>;
export type ReportPostInput = z.infer<typeof reportPostSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
