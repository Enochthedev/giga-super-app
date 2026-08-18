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

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { Request, Response, Router } from 'express';
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
 *     summary: Get current authenticated user with profile and addresses
 *     description: Returns the currently authenticated user's information including profile, roles, and addresses
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
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     profile:
 *                       type: object
 *                       properties:
 *                         first_name:
 *                           type: string
 *                         last_name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         avatar_url:
 *                           type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                     active_role:
 *                       type: string
 *                     permissions:
 *                       type: object
 *                       description: Boolean flags for each role the user holds
 *                       properties:
 *                         isCustomer:
 *                           type: boolean
 *                         isDriver:
 *                           type: boolean
 *                         isVendor:
 *                           type: boolean
 *                         isHost:
 *                           type: boolean
 *                         isAdvertiser:
 *                           type: boolean
 *                         isCourier:
 *                           type: boolean
 *                         isDop:
 *                           type: boolean
 *                         isPmg:
 *                           type: boolean
 *                         isRegionalManager:
 *                           type: boolean
 *                         isModuleAdmin:
 *                           type: boolean
 *                         isAdmin:
 *                           type: boolean
 *                           description: Legacy — replaced by DOP
 *                     addresses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           label:
 *                             type: string
 *                           address_line_1:
 *                             type: string
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           is_default:
 *                             type: boolean
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
// CUSTOM HANDLERS (before proxy middleware)
// =====================================================

// GET /me - Custom handler to include profile, roles, and addresses
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      logger.error('Auth error in /me:', authError);
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Fetch roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id);

    // Fetch active role
    const { data: activeRoleData } = await supabase
      .from('user_active_roles')
      .select('active_role')
      .eq('user_id', user.id)
      .maybeSingle();

    // Fetch addresses
    const { data: addresses } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false });

    // Fetch wallet balance
    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .maybeSingle();

    const roles = rolesData?.map((r: { role_name: string }) => r.role_name) || [];

    const response = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone || '',
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        profile: profile || null,
        roles,
        active_role: activeRoleData?.active_role || null,
        permissions: {
          isCustomer: roles.includes('CUSTOMER'),
          isDriver: roles.includes('DRIVER'),
          isVendor: roles.includes('VENDOR'),
          isHost: roles.includes('HOST'),
          isAdvertiser: roles.includes('ADVERTISER'),
          isCourier: roles.includes('COURIER'),
          isDop: roles.includes('DOP'),
          isPmg: roles.includes('PMG'),
          isRegionalManager: roles.includes('REGIONAL_MANAGER'),
          isModuleAdmin: roles.includes('MODULE_ADMIN'),
          isAdmin: roles.includes('ADMIN'),
        },
        addresses: addresses || [],
        wallet: wallet || null,
      },
    };

    return res.json(response);
  } catch (error: any) {
    logger.error('Error in /auth/me:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal server error' },
    });
  }
});

// =====================================================
// PASSWORD MANAGEMENT
// =====================================================
// These must be explicit handlers (registered before the proxy) because
// GoTrue has no single endpoint that both verifies a recovery token AND
// sets a new password. POST /verify only verifies the token and returns a
// session; the password must then be set via PUT /user with that session.

/**
 * POST /auth/reset-password
 * Body: { token | token_hash | access_token, email?, password | new_password }
 * Two-step flow against Supabase Auth:
 *   1. POST /verify (type=recovery) -> session
 *   2. PUT /user with the session's access token -> set new password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, token_hash, access_token, email, password, new_password } = req.body || {};
    const newPassword = new_password || password;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'password (or new_password) is required' },
      });
    }

    const authHeaders = {
      apikey: config.supabaseAnonKey,
      'Content-Type': 'application/json',
    };

    // Step 1: verify the recovery token to obtain a session.
    // Email links carry a token_hash; OTP codes require token + email.
    let sessionToken: string | null = null;

    if (token_hash || token || email) {
      const verifyBody: Record<string, string> = { type: 'recovery' };
      if (token_hash) {
        verifyBody.token_hash = token_hash;
      } else {
        if (!token || !email) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Provide token_hash, or token together with email',
            },
          });
        }
        verifyBody.token = token;
        verifyBody.email = email;
      }

      const verifyResp = await axios.post(`${authApiUrl}/verify`, verifyBody, {
        headers: authHeaders,
        validateStatus: () => true,
      });

      if (verifyResp.status >= 400 || !verifyResp.data?.access_token) {
        logger.warn('Password reset token verification failed', {
          status: verifyResp.status,
          error: verifyResp.data?.msg || verifyResp.data?.error_description,
        });
        return res.status(verifyResp.status >= 400 ? verifyResp.status : 401).json({
          success: false,
          error: {
            code: 'INVALID_RESET_TOKEN',
            message:
              verifyResp.data?.msg ||
              verifyResp.data?.error_description ||
              'Invalid or expired reset token',
          },
        });
      }

      sessionToken = verifyResp.data.access_token;
    } else if (access_token) {
      // Client already verified the token (e.g. via the email redirect) and
      // holds a recovery session access token.
      sessionToken = access_token;
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Provide token_hash, token + email, or access_token',
        },
      });
    }

    // Step 2: set the new password using the recovery session.
    const updateResp = await axios.put(
      `${authApiUrl}/user`,
      { password: newPassword },
      {
        headers: { ...authHeaders, Authorization: `Bearer ${sessionToken}` },
        validateStatus: () => true,
      }
    );

    if (updateResp.status >= 400) {
      logger.warn('Password reset update failed', {
        status: updateResp.status,
        error: updateResp.data?.msg,
      });
      return res.status(updateResp.status).json({
        success: false,
        error: {
          code: updateResp.data?.error_code || 'PASSWORD_UPDATE_FAILED',
          message: updateResp.data?.msg || 'Failed to update password',
        },
      });
    }

    return res.json({
      success: true,
      message: 'Password reset successful',
      data: { user: updateResp.data },
    });
  } catch (error: any) {
    logger.error('Password reset error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Password reset failed' },
    });
  }
});

/**
 * POST /auth/change-password
 * Authenticated password change for logged-in users.
 * Body: { current_password?, password | new_password }
 * If current_password is provided it is verified first via a login attempt.
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authorization header required' },
      });
    }

    const { current_password, password, new_password } = req.body || {};
    const newPassword = new_password || password;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'new_password is required' },
      });
    }

    const authHeaders = {
      apikey: config.supabaseAnonKey,
      'Content-Type': 'application/json',
    };

    // Optionally verify the current password before allowing the change
    if (current_password) {
      const meResp = await axios.get(`${authApiUrl}/user`, {
        headers: { ...authHeaders, Authorization: authHeader },
        validateStatus: () => true,
      });

      if (meResp.status >= 400 || !meResp.data?.email) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session' },
        });
      }

      const loginResp = await axios.post(
        `${authApiUrl}/token?grant_type=password`,
        { email: meResp.data.email, password: current_password },
        { headers: authHeaders, validateStatus: () => true }
      );

      if (loginResp.status >= 400) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' },
        });
      }
    }

    const updateResp = await axios.put(
      `${authApiUrl}/user`,
      { password: newPassword },
      {
        headers: { ...authHeaders, Authorization: authHeader },
        validateStatus: () => true,
      }
    );

    if (updateResp.status >= 400) {
      return res.status(updateResp.status).json({
        success: false,
        error: {
          code: updateResp.data?.error_code || 'PASSWORD_UPDATE_FAILED',
          message: updateResp.data?.msg || 'Failed to update password',
        },
      });
    }

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    logger.error('Password change error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Password change failed' },
    });
  }
});

// =====================================================
// PROXY MIDDLEWARE
// =====================================================
// Note: All route transformations are handled directly in the proxy middleware
// because modifying req.url in Express route handlers does NOT affect
// http-proxy-middleware's target path.

const proxyOptions: Options = {
  target: authApiUrl,
  changeOrigin: true,
  pathRewrite: (path: string, _req) => {
    // Transform convenience routes to Supabase Auth API endpoints
    // Note: req.url modifications in route handlers don't affect http-proxy-middleware
    // so we must handle all path transformations here

    // Remove /auth prefix first (router is mounted at /auth)
    const newPath = path.replace(/^\/auth/, '');

    // Transform convenience endpoints to actual Supabase endpoints
    if (newPath === '/login') {
      return '/token?grant_type=password';
    }
    if (newPath === '/me') {
      return '/user';
    }
    if (newPath === '/refresh') {
      return '/token?grant_type=refresh_token';
    }
    if (newPath === '/forgot-password') {
      return '/recover';
    }
    // NOTE: /reset-password and /change-password are handled by explicit
    // routes above and never reach this proxy.

    // Default: return the path with /auth prefix removed
    return newPath || '/';
  },
  onProxyReq: (proxyReq, req) => {
    // Add Supabase API key to all proxied requests
    proxyReq.setHeader('apikey', config.supabaseAnonKey);

    // Forward the original Authorization header if present
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }

    // Transform request body for specific endpoints
    const originalPath = req.originalUrl?.replace(/^\/auth/, '') || req.path;

    if (originalPath === '/signup' && req.body) {
      // Transform signup body to include user metadata
      const { email, password, first_name, last_name, phone } = req.body;
      req.body = {
        email,
        password,
        data: {
          first_name: first_name || '',
          last_name: last_name || '',
          phone: phone || '',
        },
      };
    } else if (originalPath === '/login' && req.body) {
      // Transform login body to include grant_type
      const { email, password } = req.body;
      req.body = { email, password, grant_type: 'password' };
    } else if (originalPath === '/refresh' && req.body) {
      // Transform refresh body to include grant_type
      const { refresh_token } = req.body;
      req.body = { refresh_token, grant_type: 'refresh_token' };
    }

    // Re-serialize the body that express.json() already consumed.
    // Must not test for a non-empty body: a `{}` payload parses to an empty object,
    // and skipping the write left the upstream waiting for the bytes the forwarded
    // Content-Length still promised, hanging the request forever (e.g. POST /auth/logout
    // with `{}`). Only skip when express.json() never parsed anything, in which case
    // the original stream is intact and pipes through untouched.
    const contentType = String(req.headers['content-type'] ?? '');
    if (contentType.includes('json') && req.body !== undefined && req.body !== null) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData).toString());
      proxyReq.write(bodyData);
    }

    logger.debug('[Auth Proxy] Request', {
      method: req.method,
      originalPath: req.path,
      targetUrl: `${authApiUrl}${proxyReq.path}`,
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
