/**
 * Validation Middleware
 * Input validation using express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/errors';
import config from '../config';

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error: any) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    return next(
      new ValidationError('Request validation failed', {
        fields: validationErrors,
      })
    );
  }

  next();
};

// ============================================================================
// Post Validations
// ============================================================================

export const validateCreatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: config.social.maxContentLength })
    .withMessage(
      `Content must be between 1 and ${config.social.maxContentLength} characters`
    ),

  body('post_type')
    .optional()
    .isIn(['post', 'story', 'reel', 'status'])
    .withMessage('Post type must be: post, story, reel, or status'),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private', 'custom'])
    .withMessage('Visibility must be: public, friends, private, or custom'),

  body('media_urls')
    .optional()
    .isArray({ max: config.social.maxMediaUploads })
    .withMessage(`Media URLs must be an array with max ${config.social.maxMediaUploads} items`),

  body('media_urls.*')
    .optional()
    .isURL()
    .withMessage('Each media URL must be a valid URL'),

  body('allowed_viewers')
    .optional()
    .isArray()
    .withMessage('Allowed viewers must be an array of user IDs'),

  body('allowed_viewers.*')
    .optional()
    .isUUID()
    .withMessage('Each viewer ID must be a valid UUID'),

  body('tagged_users')
    .optional()
    .isArray()
    .withMessage('Tagged users must be an array of user IDs'),

  body('tagged_users.*')
    .optional()
    .isUUID()
    .withMessage('Each tagged user ID must be a valid UUID'),

  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),

  body('location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('feeling_activity')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Feeling/activity must be less than 100 characters'),

  handleValidationErrors,
];

export const validateUpdatePost = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),

  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: config.social.maxContentLength })
    .withMessage(
      `Content must be between 1 and ${config.social.maxContentLength} characters`
    ),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private', 'custom'])
    .withMessage('Visibility must be: public, friends, private, or custom'),

  body('media_urls')
    .optional()
    .isArray({ max: config.social.maxMediaUploads })
    .withMessage(`Media URLs must be an array with max ${config.social.maxMediaUploads} items`),

  handleValidationErrors,
];

export const validateGetPost = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateDeletePost = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateGetUserPosts = [
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  handleValidationErrors,
];

// ============================================================================
// Comment Validations
// ============================================================================

export const validateCreateComment = [
  body('post_id').isUUID().withMessage('Post ID must be a valid UUID'),

  body('content')
    .trim()
    .isLength({ min: 1, max: config.social.maxCommentLength })
    .withMessage(
      `Comment content must be between 1 and ${config.social.maxCommentLength} characters`
    ),

  body('parent_comment_id')
    .optional()
    .isUUID()
    .withMessage('Parent comment ID must be a valid UUID'),

  handleValidationErrors,
];

export const validateUpdateComment = [
  param('commentId').isUUID().withMessage('Comment ID must be a valid UUID'),

  body('content')
    .trim()
    .isLength({ min: 1, max: config.social.maxCommentLength })
    .withMessage(
      `Comment content must be between 1 and ${config.social.maxCommentLength} characters`
    ),

  handleValidationErrors,
];

export const validateDeleteComment = [
  param('commentId').isUUID().withMessage('Comment ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateGetPostComments = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  handleValidationErrors,
];

export const validateGetCommentReplies = [
  param('commentId').isUUID().withMessage('Comment ID must be a valid UUID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  handleValidationErrors,
];

// ============================================================================
// Like Validations
// ============================================================================

export const validateLikePost = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),
  body('reaction_type')
    .optional()
    .isIn(['like', 'love', 'haha', 'wow', 'sad', 'angry'])
    .withMessage('Reaction type must be: like, love, haha, wow, sad, or angry'),
  handleValidationErrors,
];

export const validateLikeComment = [
  param('commentId').isUUID().withMessage('Comment ID must be a valid UUID'),
  body('reaction_type')
    .optional()
    .isIn(['like', 'love', 'haha', 'wow', 'sad', 'angry'])
    .withMessage('Reaction type must be: like, love, haha, wow, sad, or angry'),
  handleValidationErrors,
];

export const validateGetPostLikers = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  handleValidationErrors,
];

// ============================================================================
// Feed Validations
// ============================================================================

export const validateGetFeed = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  query('filter')
    .optional()
    .isIn(['all', 'friends', 'following'])
    .withMessage('Filter must be: all, friends, or following'),
  handleValidationErrors,
];

export const validateGetTrending = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  query('timeframe')
    .optional()
    .isIn(['24h', '7d', '30d'])
    .withMessage('Timeframe must be: 24h, 7d, or 30d'),
  handleValidationErrors,
];

// ============================================================================
// Story Validations
// ============================================================================

export const validateCreateStory = [
  body('media_url')
    .isURL()
    .withMessage('Media URL is required and must be a valid URL'),

  body('media_type')
    .isIn(['image', 'video'])
    .withMessage('Media type must be: image or video'),

  body('duration')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Duration must be between 1 and 30 seconds'),

  body('text_overlay')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Text overlay must be less than 500 characters'),

  body('background_color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Background color must be a valid hex color'),

  body('viewers_list')
    .optional()
    .isArray()
    .withMessage('Viewers list must be an array of user IDs'),

  body('viewers_list.*')
    .optional()
    .isUUID()
    .withMessage('Each viewer ID must be a valid UUID'),

  handleValidationErrors,
];

export const validateGetStory = [
  param('storyId').isUUID().withMessage('Story ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateRecordStoryView = [
  param('storyId').isUUID().withMessage('Story ID must be a valid UUID'),
  handleValidationErrors,
];

// ============================================================================
// Share Validations
// ============================================================================

export const validateSharePost = [
  body('post_id').isUUID().withMessage('Post ID must be a valid UUID'),

  body('share_type')
    .isIn(['repost', 'quote', 'send'])
    .withMessage('Share type must be: repost, quote, or send'),

  body('content')
    .optional()
    .trim()
    .isLength({ max: config.social.maxContentLength })
    .withMessage(
      `Content must be less than ${config.social.maxContentLength} characters`
    ),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private', 'custom'])
    .withMessage('Visibility must be: public, friends, private, or custom'),

  body('recipient_ids')
    .optional()
    .isArray()
    .withMessage('Recipient IDs must be an array'),

  body('recipient_ids.*')
    .optional()
    .isUUID()
    .withMessage('Each recipient ID must be a valid UUID'),

  handleValidationErrors,
];

// ============================================================================
// Connection Validations
// ============================================================================

export const validateFollowUser = [
  body('user_id').isUUID().withMessage('User ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateUnfollowUser = [
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateBlockUser = [
  body('blocked_user_id')
    .isUUID()
    .withMessage('Blocked user ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateUnblockUser = [
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateGetFollowers = [
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  handleValidationErrors,
];

// ============================================================================
// Report Validations
// ============================================================================

export const validateCreateReport = [
  body('content_id').isUUID().withMessage('Content ID must be a valid UUID'),

  body('content_type')
    .isIn(['post', 'comment', 'user', 'story'])
    .withMessage('Content type must be: post, comment, user, or story'),

  body('reason')
    .isIn([
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'nudity',
      'false_information',
      'scam',
      'other',
    ])
    .withMessage(
      'Reason must be: spam, harassment, hate_speech, violence, nudity, false_information, scam, or other'
    ),

  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Details must be less than 1000 characters'),

  handleValidationErrors,
];

export const validateUpdateReportStatus = [
  param('reportId').isUUID().withMessage('Report ID must be a valid UUID'),
  body('status')
    .isIn(['reviewed', 'resolved', 'dismissed'])
    .withMessage('Status must be: reviewed, resolved, or dismissed'),
  handleValidationErrors,
];

// ============================================================================
// Pagination Validations
// ============================================================================

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: config.pagination.maxLimit })
    .withMessage(`Limit must be between 1 and ${config.pagination.maxLimit}`),
  handleValidationErrors,
];
