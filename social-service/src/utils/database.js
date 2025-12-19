import logger from './logger.js';

/**
 * Database utility functions for social service
 */

/**
 * Execute a database query with error handling and logging
 * @param {Object} supabase - Supabase client instance
 * @param {Function} queryFn - Function that returns a Supabase query
 * @param {string} operation - Description of the operation for logging
 * @param {string} requestId - Request ID for tracing
 * @returns {Promise<Object>} Query result
 */
export const executeQuery = async (supabase, queryFn, operation, requestId) => {
  const startTime = Date.now();

  try {
    logger.debug(`Executing database query: ${operation}`, {
      requestId,
      operation,
    });

    const result = await queryFn();
    const duration = Date.now() - startTime;

    if (result.error) {
      logger.error(`Database query failed: ${operation}`, {
        requestId,
        operation,
        error: result.error.message,
        code: result.error.code,
        duration,
      });
      throw result.error;
    }

    logger.debug(`Database query completed: ${operation}`, {
      requestId,
      operation,
      duration,
      rowCount: Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`Database query error: ${operation}`, {
      requestId,
      operation,
      error: error.message,
      stack: error.stack,
      duration,
    });

    throw error;
  }
};

/**
 * Execute a database transaction
 * @param {Object} supabase - Supabase client instance
 * @param {Function} transactionFn - Function containing transaction operations
 * @param {string} operation - Description of the transaction
 * @param {string} requestId - Request ID for tracing
 * @returns {Promise<Object>} Transaction result
 */
export const executeTransaction = async (supabase, transactionFn, operation, requestId) => {
  const startTime = Date.now();

  try {
    logger.debug(`Starting database transaction: ${operation}`, {
      requestId,
      operation,
    });

    // Note: Supabase doesn't have explicit transaction support in the client
    // We'll use RPC functions for complex transactions when needed
    const result = await transactionFn();
    const duration = Date.now() - startTime;

    logger.debug(`Database transaction completed: ${operation}`, {
      requestId,
      operation,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`Database transaction failed: ${operation}`, {
      requestId,
      operation,
      error: error.message,
      stack: error.stack,
      duration,
    });

    throw error;
  }
};

/**
 * Build pagination parameters
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Object} Pagination parameters
 */
export const buildPagination = (page = 1, limit = 20) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (validPage - 1) * validLimit;

  return {
    page: validPage,
    limit: validLimit,
    offset,
    range: [offset, offset + validLimit - 1],
  };
};

/**
 * Build response with pagination metadata
 * @param {Array} data - Query result data
 * @param {Object} pagination - Pagination parameters
 * @param {number} totalCount - Total number of records
 * @returns {Object} Response with pagination metadata
 */
export const buildPaginatedResponse = (data, pagination, totalCount) => {
  const totalPages = Math.ceil(totalCount / pagination.limit);
  const hasMore = pagination.page < totalPages;

  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: totalCount,
      total_pages: totalPages,
      has_more: hasMore,
      has_previous: pagination.page > 1,
      ...(pagination.page > 1 && { previous_page: pagination.page - 1 }),
      ...(hasMore && { next_page: pagination.page + 1 }),
    },
  };
};

/**
 * Sanitize user input to prevent SQL injection
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
export const sanitizeInput = input => {
  if (typeof input !== 'string') return input;

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;--]/g, '') // Remove SQL injection patterns
    .trim();
};

/**
 * Build search query with full-text search
 * @param {string} searchTerm - Search term
 * @param {string[]} columns - Columns to search in
 * @returns {string} Search query
 */
export const buildSearchQuery = (searchTerm, columns = ['content']) => {
  if (!searchTerm || typeof searchTerm !== 'string') return null;

  const sanitizedTerm = sanitizeInput(searchTerm);
  if (!sanitizedTerm) return null;

  // Use PostgreSQL full-text search
  return columns.map(column => `${column}.fts(english).${sanitizedTerm}`).join(',');
};

/**
 * Check if user can access resource (basic ownership check)
 * @param {Object} supabase - Supabase client instance
 * @param {string} table - Table name
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<boolean>} Whether user can access the resource
 */
export const checkResourceAccess = async (supabase, table, resourceId, userId, requestId) => {
  try {
    const { data, error } = await executeQuery(
      supabase,
      () => supabase.from(table).select('id, user_id').eq('id', resourceId).single(),
      `Check access to ${table}:${resourceId}`,
      requestId
    );

    if (error || !data) return false;

    return data.user_id === userId;
  } catch (error) {
    logger.error('Error checking resource access', {
      requestId,
      table,
      resourceId,
      userId,
      error: error.message,
    });
    return false;
  }
};
