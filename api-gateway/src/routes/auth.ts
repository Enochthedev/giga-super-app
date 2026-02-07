/**
 * Authentication Routes
 *
 * Proxies auth requests to Supabase Auth API with convenience wrappers
 * for better developer experience.
 *
 * Available endpoints:
 * - POST /auth/signup - Register new user
 * - POST /auth/login - Login with email/password
 * - POST /auth/logout - Logout current session
 * - GET /auth/me - Get current user
 * - POST /auth/refresh - Refresh access token
 * - POST /auth/forgot-password - Request password reset
 * - POST /auth/reset-password - Reset password with token
 */

import { NextFunction, Request, Response, Router } from 'express';
import { Options, createProxyMiddleware } from 'http-proxy-middleware';

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validate configuration
if (!config.supabaseUrl || !config.supabaseAnonKey) {
  logger.error('⚠️  SUPABASE_URL and SUPABASE_ANON_KEY must be set for auth routes');
}

// Extract project ref and build auth API URL
// e.g., https://nkrqcigvcakqicutkpfd.supabase.co -> nkrqcigvcakqicutkpfd
const projectRef = config.supabaseUrl.replace('https://', '').split('.')[0];
const authApiUrl = `https://${projectRef}.supabase.co/auth/v1`;

logger.info('Auth proxy configured', { authApiUrl, projectRef });

// =====================================================
// SWAGGER DOCUMENTATION
// =====================================================

/**
 * @openapi
 * tags:
 *   - name: Authentication
 *     description: User authentication endpoints (proxied to Supabase Auth)
 */

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       Creates a new user account. The user will receive a confirmation email
 *       if email confirmation is enabled in Supabase settings.
 *
 *       This endpoint proxies to Supabase Auth and automatically creates:
 *       - User record in auth.users
 *       - Customer profile via database trigger
 *       - Default CUSTOMER role
 *       - User wallet (if trigger is configured)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: securePassword123
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               phone:
 *                 type: string
 *                 example: "+2341234567890"
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *       422:
 *         description: Validation error
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     description: |
 *       Authenticates a user and returns access and refresh tokens.
 *
 *       The access_token should be used in the Authorization header for
 *       subsequent API requests: `Authorization: Bearer <access_token>`
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: securePassword123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: JWT access token (use in Authorization header)
 *                 token_type:
 *                   type: string
 *                   example: bearer
 *                 expires_in:
 *                   type: integer
 *                   example: 3600
 *                 expires_at:
 *                   type: integer
 *                   description: Unix timestamp when token expires
 *                 refresh_token:
 *                   type: string
 *                   description: Token to refresh the access token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     app_metadata:
 *                       type: object
 *                     user_metadata:
 *                       type: object
 *       400:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout current session
 *     description: Invalidates the current session and refresh token
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Logout successful
 *       401:
 *         description: Not authenticated
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Returns the currently authenticated user's information
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 app_metadata:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                     role:
 *                       type: string
 *                 user_metadata:
 *                   type: object
 *                   properties:
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: |
 *       Exchanges a refresh token for a new access token.
 *       Use this when the access token expires.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: The refresh token received from login
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 token_type:
 *                   type: string
 *                 expires_in:
 *                   type: integer
 *                 refresh_token:
 *                   type: string
 *       400:
 *         description: Invalid refresh token
 */

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: |
 *       Sends a password reset email to the user.
 *       The email contains a link with a reset token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Reset email sent (if user exists)
 *       400:
 *         description: Invalid email format
 */

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: |
 *       Resets the user's password using the token from the reset email.
 *       The token is typically passed as a URL parameter from the reset link.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email link (or access_token)
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     AuthError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: invalid_grant
 *         error_description:
 *           type: string
 *           example: Invalid login credentials
 *         message:
 *           type: string
 *           example: Invalid login credentials
 */

// =====================================================
// CONVENIENCE ROUTE HANDLERS
// =====================================================

/**
 * POST /auth/signup
 * Transform to Supabase signup format
 */
router.post('/signup', (req: Request, res: Response, next: NextFunction) => {
  const { email, password, first_name, last_name, phone } = req.body;

  // Transform to Supabase's expected format
  req.body = {
    email,
    password,
    data: {
      first_name: first_name || '',
      last_name: last_name || '',
      phone: phone || '',
    },
  };

  req.url = '/signup';
  next();
});

/**
 * POST /auth/login
 * Transform to Supabase token endpoint format
 */
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Transform to Supabase's expected format
  req.body = {
    email,
    password,
    grant_type: 'password',
  };

  req.url = '/token?grant_type=password';
  next();
});

/**
 * GET /auth/me
 * Maps to Supabase's user endpoint
 */
router.get('/me', (req: Request, res: Response, next: NextFunction) => {
  req.url = '/user';
  next();
});

/**
 * POST /auth/refresh
 * Transform to Supabase refresh token format
 */
router.post('/refresh', (req: Request, res: Response, next: NextFunction) => {
  const { refresh_token } = req.body;

  req.body = {
    refresh_token,
    grant_type: 'refresh_token',
  };

  req.url = '/token?grant_type=refresh_token';
  next();
});

/**
 * POST /auth/forgot-password
 * Maps to Supabase's recover endpoint
 */
router.post('/forgot-password', (req: Request, res: Response, next: NextFunction) => {
  req.url = '/recover';
  next();
});

/**
 * POST /auth/reset-password
 * Transform to Supabase verify format for password reset
 */
router.post('/reset-password', (req: Request, res: Response, next: NextFunction) => {
  const { token, access_token, password, new_password } = req.body;

  req.body = {
    type: 'recovery',
    token: token || access_token,
    password: new_password || password,
  };

  req.url = '/verify';
  next();
});

// =====================================================
// PROXY MIDDLEWARE
// =====================================================

const proxyOptions: Options = {
  target: authApiUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/auth': '', // Remove /auth prefix when forwarding to Supabase
  },
  onProxyReq: (proxyReq, req) => {
    // Add Supabase API key to all proxied requests
    proxyReq.setHeader('apikey', config.supabaseAnonKey);

    // Forward the original Authorization header if present
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }

    // Re-serialize the body if it was modified by convenience routes
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData).toString());
      proxyReq.write(bodyData);
    }

    logger.debug('[Auth Proxy] Request', {
      method: req.method,
      originalPath: req.path,
      targetUrl: `${authApiUrl}${req.url}`,
    });
  },
  onProxyRes: (proxyRes, req) => {
    logger.debug('[Auth Proxy] Response', {
      status: proxyRes.statusCode,
      method: req.method,
      path: req.path,
    });
  },
  onError: (err, req, res) => {
    logger.error('[Auth Proxy] Error', {
      error: err.message,
      method: req.method,
      path: req.path,
    });

    (res as Response).status(500).json({
      success: false,
      error: {
        code: 'AUTH_PROXY_ERROR',
        message: 'Failed to connect to authentication service',
      },
    });
  },
};

// Apply proxy to all remaining auth routes
router.use('/', createProxyMiddleware(proxyOptions));

export const authRouter = router;
export default router;
