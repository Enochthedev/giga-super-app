import { body, param, query, validationResult } from 'express-validator';

import { ValidationError } from './errorHandler.js';

/**
 * Middleware to handle validation results
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    throw new ValidationError('Request validation failed', {
      fields: validationErrors,
    });
  }

  next();
};

/**
 * Validation rules for social posts
 */
export const validateCreatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters'),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Visibility must be public, friends, or private'),

  body('media_urls')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Media URLs must be an array with maximum 10 items'),

  body('media_urls.*').optional().isURL().withMessage('Each media URL must be a valid URL'),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),

  body('tags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),

  validateRequest,
];

export const validateUpdatePost = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),

  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters'),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Visibility must be public, friends, or private'),

  body('media_urls')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Media URLs must be an array with maximum 10 items'),

  body('tags')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Tags must be an array with maximum 20 items'),

  validateRequest,
];

/**
 * Validation rules for comments
 */
export const validateCreateComment = [
  body('post_id').isUUID().withMessage('Post ID must be a valid UUID'),

  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters'),

  body('parent_comment_id')
    .optional()
    .isUUID()
    .withMessage('Parent comment ID must be a valid UUID'),

  validateRequest,
];

export const validateUpdateComment = [
  param('commentId').isUUID().withMessage('Comment ID must be a valid UUID'),

  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters'),

  validateRequest,
];

/**
 * Validation rules for likes
 */
export const validateLikePost = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),

  validateRequest,
];

export const validateLikeComment = [
  param('commentId').isUUID().withMessage('Comment ID must be a valid UUID'),

  validateRequest,
];

/**
 * Validation rules for feed
 */
export const validateGetFeed = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('type')
    .optional()
    .isIn(['all', 'friends', 'following'])
    .withMessage('Feed type must be all, friends, or following'),

  query('since').optional().isISO8601().withMessage('Since must be a valid ISO 8601 date'),

  validateRequest,
];

/**
 * Validation rules for user posts
 */
export const validateGetUserPosts = [
  param('userId').isUUID().withMessage('User ID must be a valid UUID'),

  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  validateRequest,
];

/**
 * Validation rules for post details
 */
export const validateGetPostDetails = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),

  query('include_comments')
    .optional()
    .isBoolean()
    .withMessage('Include comments must be a boolean'),

  query('comments_limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Comments limit must be between 1 and 50'),

  validateRequest,
];

/**
 * Validation rules for reporting content
 */
export const validateReportContent = [
  body('content_type')
    .isIn(['post', 'comment'])
    .withMessage('Content type must be post or comment'),

  body('content_id').isUUID().withMessage('Content ID must be a valid UUID'),

  body('reason')
    .isIn(['spam', 'harassment', 'inappropriate', 'copyright', 'other'])
    .withMessage('Reason must be one of: spam, harassment, inappropriate, copyright, other'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),

  validateRequest,
];

/**
 * Validation rules for stories
 */
export const validateCreateStory = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Story content must be between 1 and 500 characters'),

  body('media_url').optional().isURL().withMessage('Media URL must be a valid URL'),

  body('media_type')
    .optional()
    .isIn(['image', 'video'])
    .withMessage('Media type must be image or video'),

  body('duration')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Duration must be between 1 and 168 hours'),

  validateRequest,
];

export const validateViewStory = [
  param('storyId').isUUID().withMessage('Story ID must be a valid UUID'),

  validateRequest,
];

/**
 * Validation rules for shares
 */
export const validateSharePost = [
  param('postId').isUUID().withMessage('Post ID must be a valid UUID'),

  body('content')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Share content must be less than 1000 characters'),

  body('visibility')
    .optional()
    .isIn(['public', 'friends', 'private'])
    .withMessage('Visibility must be public, friends, or private'),

  validateRequest,
];
