import { Response, Router } from 'express';
import winston from 'winston';

import { createAudit } from '../middleware/audit';
import {
  AuthRequest,
  authenticate,
  requireAnyAccess,
  requireNationalAccess,
} from '../middleware/auth';
import { supabase } from '../utils/database';
import { applyRegionScope, getAllowedRegionIds } from '../utils/regionScope';

const router = Router();
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const REGION_TYPES = ['continent', 'country', 'state', 'city', 'district'];

/**
 * GET /api/admin/regions
 * List regions (geolocation tags). National admins see all; a region-tagged
 * admin only sees regions within their own subtree.
 * Optional filters: ?type=city &parent_id=<uuid>
 */
router.get('/', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { type, parent_id } = req.query;
    const allowedRegionIds = await getAllowedRegionIds(req.user!);

    let query = supabase
      .from('nipost_regions')
      .select(
        'id, region_name, region_code, region_type, parent_region_id, country_code, phone_code, currency, timezone, is_active'
      )
      .order('region_type', { ascending: true })
      .order('region_name', { ascending: true });

    // A region admin only sees their own region subtree.
    query = applyRegionScope(query, allowedRegionIds, 'id');

    if (type) query = query.eq('region_type', type);
    if (parent_id) query = query.eq('parent_region_id', parent_id);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to list regions', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to list regions' });
  }
});

/**
 * GET /api/admin/regions/:id
 * Region detail plus its immediate children.
 */
router.get('/:id', authenticate, requireAnyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const allowedRegionIds = await getAllowedRegionIds(req.user!);

    // Enforce scope: a tagged admin can only read regions in its subtree.
    if (allowedRegionIds !== null && !allowedRegionIds.includes(id)) {
      return res.status(404).json({ success: false, error: 'Region not found' });
    }

    const { data: region, error } = await supabase
      .from('nipost_regions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!region) return res.status(404).json({ success: false, error: 'Region not found' });

    const { data: children } = await supabase
      .from('nipost_regions')
      .select('id, region_name, region_code, region_type')
      .eq('parent_region_id', id)
      .order('region_name', { ascending: true });

    res.json({ success: true, data: { ...region, children: children || [] } });
  } catch (error: any) {
    logger.error('Failed to get region', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get region' });
  }
});

/**
 * POST /api/admin/regions
 * Create a region. National (global) access only.
 */
router.post('/', authenticate, requireNationalAccess, async (req: AuthRequest, res: Response) => {
  try {
    const {
      region_name,
      region_code,
      region_type,
      parent_region_id,
      country_code,
      phone_code,
      currency,
      timezone,
    } = req.body;

    if (!region_name || !region_code || !region_type) {
      return res.status(400).json({
        success: false,
        error: 'region_name, region_code and region_type are required',
        code: 'MISSING_FIELDS',
      });
    }
    if (!REGION_TYPES.includes(region_type)) {
      return res.status(400).json({
        success: false,
        error: `region_type must be one of: ${REGION_TYPES.join(', ')}`,
        code: 'INVALID_REGION_TYPE',
      });
    }

    const { data, error } = await supabase
      .from('nipost_regions')
      .insert({
        region_name,
        region_code,
        region_type,
        parent_region_id: parent_region_id || null,
        country_code: country_code || null,
        phone_code: phone_code || null,
        currency: currency || null,
        timezone: timezone || null,
      })
      .select()
      .single();

    if (error) {
      // Unique violation on region_code
      if (error.code === '23505') {
        return res
          .status(409)
          .json({ success: false, error: 'region_code already exists', code: 'DUPLICATE_CODE' });
      }
      throw error;
    }

    await createAudit(req, 'create_region', 'nipost_region', data.id, { region_code });
    res.status(201).json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to create region', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create region' });
  }
});

/**
 * PATCH /api/admin/regions/:id
 * Update a region. National (global) access only.
 */
router.patch('/:id', authenticate, requireNationalAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const allowed: Record<string, any> = {};
    for (const key of [
      'region_name',
      'region_type',
      'parent_region_id',
      'country_code',
      'phone_code',
      'currency',
      'timezone',
      'is_active',
    ]) {
      if (req.body[key] !== undefined) allowed[key] = req.body[key];
    }
    if (allowed.region_type && !REGION_TYPES.includes(allowed.region_type)) {
      return res.status(400).json({
        success: false,
        error: `region_type must be one of: ${REGION_TYPES.join(', ')}`,
        code: 'INVALID_REGION_TYPE',
      });
    }
    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ success: false, error: 'No updatable fields provided' });
    }
    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('nipost_regions')
      .update(allowed)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Region not found' });

    await createAudit(req, 'update_region', 'nipost_region', id, allowed);
    res.json({ success: true, data });
  } catch (error: any) {
    logger.error('Failed to update region', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update region' });
  }
});

/**
 * GET /api/admin/regions/:id/admins
 * List admins tagged to this region. National (global) access only.
 */
router.get(
  '/:id/admins',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('nipost_user_permissions')
        .select(
          'user_id, access_level, role, region_id, state_name, is_active, user_profiles!inner(email, first_name, last_name)'
        )
        .eq('region_id', id)
        .eq('is_active', true);

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Failed to list region admins', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to list region admins' });
    }
  }
);

/**
 * POST /api/admin/regions/:id/assign-admin
 * Assign (or re-scope) an admin to this region. National (global) access only.
 * Body: { user_id, access_level?='state', role?='REGIONAL_MANAGER' }
 */
router.post(
  '/:id/assign-admin',
  authenticate,
  requireNationalAccess,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: regionId } = req.params;
      const { user_id, access_level = 'state', role = 'REGIONAL_MANAGER', branch_id } = req.body;

      if (!user_id) {
        return res
          .status(400)
          .json({ success: false, error: 'user_id is required', code: 'MISSING_USER_ID' });
      }
      if (!['state', 'branch'].includes(access_level)) {
        return res.status(400).json({
          success: false,
          error: 'access_level for a region assignment must be "state" or "branch"',
          code: 'INVALID_ACCESS_LEVEL',
        });
      }
      // The valid_branch_level DB constraint requires a branch_id for branch level.
      if (access_level === 'branch' && !branch_id) {
        return res.status(400).json({
          success: false,
          error: 'branch_id is required when access_level is "branch"',
          code: 'MISSING_BRANCH_ID',
        });
      }

      // Region must exist.
      const { data: region } = await supabase
        .from('nipost_regions')
        .select('id')
        .eq('id', regionId)
        .maybeSingle();
      if (!region) return res.status(404).json({ success: false, error: 'Region not found' });

      // state_id mirrors region_id to satisfy the valid_branch_level constraint.
      const payload = {
        access_level,
        role,
        region_id: regionId,
        state_id: regionId,
        branch_id: access_level === 'branch' ? branch_id : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      // Update an existing active permission row, else insert one.
      const { data: existing } = await supabase
        .from('nipost_user_permissions')
        .select('id')
        .eq('user_id', user_id)
        .eq('is_active', true)
        .maybeSingle();

      let result;
      if (existing) {
        result = await supabase
          .from('nipost_user_permissions')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('nipost_user_permissions')
          .insert({ user_id, ...payload })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      await createAudit(req, 'assign_region_admin', 'nipost_user_permissions', user_id, {
        region_id: regionId,
        access_level,
        role,
      });
      res.json({ success: true, data: result.data });
    } catch (error: any) {
      logger.error('Failed to assign region admin', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to assign region admin' });
    }
  }
);

export default router;
