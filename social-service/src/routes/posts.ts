import { SupabaseClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import {
  ErrorCodes,
  calculatePagination,
  sendAuthError,
  sendCreated,
  sendForbidden,
  sendInternalError,
  sendNotFound,
  sendSuccess,
  sendValidationError,
} from '../utils/response';
import {
  createPostSchema,
  getPostsQuerySchema,
  reportPostSchema,
  updatePostSchema,
} from '../validation/schemas';

const router = Router();

// Get Supabase client from app locals
const getSupabase = (req: Request): SupabaseClient => req.app.locals.supabase;

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get posts feed
 *     description: Retrieve a paginated list of public posts. Supports filtering by user and visibility.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter posts by user ID
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [public, friends, private]
 *         description: Filter by visibility (requires authentication for non-public)
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 metadata:
 *                   $ref: '#/components/schemas/ResponseMetadata'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = getPostsQuerySchema.parse(req.query);
    const { page, limit, user_id, visibility } = query;
    const offset = (page - 1) * limit;
    const supabase = getSupabase(req);

    // Build query
    let dbQuery = supabase
      .from('social_posts_with_profiles')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Apply filters
    if (user_id) {
      dbQuery = dbQuery.eq('user_id', user_id);
    }

    // Visibility filter - default to public for unauthenticated users
    if (visibility) {
      dbQuery = dbQuery.eq('visibility', visibility);
    } else if (!req.user) {
      dbQuery = dbQuery.eq('visibility', 'public');
    }

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: posts, count, error } = await dbQuery;

    if (error) {
      logger.error('Database error fetching posts', { error: error.message });
      throw error;
    }

    const pagination = calculatePagination(page, limit, count ?? 0);

    sendSuccess(res, {
      data: posts ?? [],
      pagination,
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid query parameters', error.issues, req.requestId);
      return;
    }
    logger.error('Error fetching posts', { error });
    sendInternalError(res, 'Failed to fetch posts', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Get a single post
 *     description: Retrieve a specific post by ID with author information
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 metadata:
 *                   $ref: '#/components/schemas/ResponseMetadata'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const supabase = getSupabase(req);

    const { data: post, error } = await supabase
      .from('social_posts_with_profiles')
      .select('*')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (error || !post) {
      sendNotFound(res, ErrorCodes.POST_NOT_FOUND, 'Post not found', req.requestId);
      return;
    }

    // Check visibility permissions
    if (post.visibility !== 'public' && (!req.user || req.user.id !== post.user_id)) {
      sendForbidden(res, 'You do not have permission to view this post', req.requestId);
      return;
    }

    sendSuccess(res, { data: post, requestId: req.requestId });
  } catch (error) {
    logger.error('Error fetching post', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to fetch post', req.requestId);
  }
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new social post. Requires authentication.
 *     tags: [Posts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostRequest'
 *           example:
 *             content: "Hello world! This is my first post."
 *             visibility: "public"
 *             media_urls: []
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 metadata:
 *                   $ref: '#/components/schemas/ResponseMetadata'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const input = createPostSchema.parse(req.body);
    const supabase = getSupabase(req);

    // Use the database function to create the post
    const { data: posts, error } = await supabase.rpc('create_social_post', {
      p_user_id: req.user.id,
      p_content: input.content,
      p_media_urls: input.media_urls,
      p_visibility: input.visibility,
      p_tenant_id: null,
    });

    if (error) {
      logger.error('Database error creating post', { error: error.message });
      throw error;
    }

    const post = posts?.[0];
    if (!post) {
      throw new Error('Failed to create post');
    }

    logger.info('Post created', { postId: post.id, userId: req.user.id });

    sendCreated(res, { data: post, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid post data', error.issues, req.requestId);
      return;
    }
    logger.error('Error creating post', { error });
    sendInternalError(res, 'Failed to create post', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}:
 *   put:
 *     summary: Update a post
 *     description: Update an existing post. Only the post owner can update.
 *     tags: [Posts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePostRequest'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *                 metadata:
 *                   $ref: '#/components/schemas/ResponseMetadata'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.put('/:postId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { postId } = req.params;
    const input = updatePostSchema.parse(req.body);
    const supabase = getSupabase(req);

    // Check ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingPost) {
      sendNotFound(res, ErrorCodes.POST_NOT_FOUND, 'Post not found', req.requestId);
      return;
    }

    if (existingPost.user_id !== req.user.id && req.user.role !== 'admin') {
      sendForbidden(res, 'You can only update your own posts', req.requestId);
      return;
    }

    // Update the post
    const { data: post, error } = await supabase
      .from('social_posts')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      logger.error('Database error updating post', { error: error.message });
      throw error;
    }

    logger.info('Post updated', { postId, userId: req.user.id });

    sendSuccess(res, { data: post, requestId: req.requestId });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid post data', error.issues, req.requestId);
      return;
    }
    logger.error('Error updating post', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to update post', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     description: Soft delete a post. Only the post owner or admin can delete.
 *     tags: [Posts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: boolean
 *                       example: true
 *                 metadata:
 *                   $ref: '#/components/schemas/ResponseMetadata'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.delete('/:postId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { postId } = req.params;
    const supabase = getSupabase(req);

    // Check ownership
    const { data: existingPost, error: fetchError } = await supabase
      .from('social_posts')
      .select('user_id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingPost) {
      sendNotFound(res, ErrorCodes.POST_NOT_FOUND, 'Post not found', req.requestId);
      return;
    }

    if (existingPost.user_id !== req.user.id && req.user.role !== 'admin') {
      sendForbidden(res, 'You can only delete your own posts', req.requestId);
      return;
    }

    // Soft delete the post
    const { error } = await supabase
      .from('social_posts')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: req.user.id,
        deletion_reason: 'user_request',
      })
      .eq('id', postId);

    if (error) {
      logger.error('Database error deleting post', { error: error.message });
      throw error;
    }

    logger.info('Post deleted', { postId, userId: req.user.id });

    sendSuccess(res, { data: { deleted: true }, requestId: req.requestId });
  } catch (error) {
    logger.error('Error deleting post', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to delete post', req.requestId);
  }
});

/**
 * @swagger
 * /posts/{postId}/report:
 *   post:
 *     summary: Report a post
 *     description: Report a post for violating community guidelines
 *     tags: [Posts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [spam, harassment, hate_speech, violence, nudity, false_information, other]
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Report submitted successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/:postId/report', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      sendAuthError(res, 'Authentication required', req.requestId);
      return;
    }

    const { postId } = req.params;
    const input = reportPostSchema.parse(req.body);
    const supabase = getSupabase(req);

    // Verify post exists
    const { data: post, error: fetchError } = await supabase
      .from('social_posts')
      .select('id')
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !post) {
      sendNotFound(res, ErrorCodes.POST_NOT_FOUND, 'Post not found', req.requestId);
      return;
    }

    // Log the report (in production, this would go to a reports table)
    logger.info('Post reported', {
      postId,
      reportedBy: req.user.id,
      reason: input.reason,
      description: input.description,
    });

    sendSuccess(res, {
      data: { reported: true, message: 'Thank you for your report. We will review it shortly.' },
      requestId: req.requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(res, 'Invalid report data', error.issues, req.requestId);
      return;
    }
    logger.error('Error reporting post', { error, postId: req.params.postId });
    sendInternalError(res, 'Failed to submit report', req.requestId);
  }
});

export default router;
