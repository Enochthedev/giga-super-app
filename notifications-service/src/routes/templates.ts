import { createClient } from '@supabase/supabase-js';
import { Request, Response, Router } from 'express';
import winston from 'winston';
import { TemplateEngine } from '../utils/templates.js';

const router = Router();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  db: { schema: 'public' },
  auth: { autoRefreshToken: false, persistSession: false },
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
  requestId?: string;
}

// Middleware to check admin permissions
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin privileges required',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }

  next();
};

// GET /api/v1/templates - List all templates
router.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, active, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('notification_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    // Apply filters
    if (type && ['email', 'sms', 'push'].includes(type as string)) {
      query = query.eq('type', type);
    }
    if (active !== undefined) {
      query = query.eq('is_active', active === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch templates', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch templates',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        total_pages: Math.ceil((count || 0) / Number(limit)),
        has_previous: Number(page) > 1,
        has_next: Number(page) < Math.ceil((count || 0) / Number(limit)),
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching templates', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// GET /api/v1/templates/:id - Get specific template
router.get('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    res.json({
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error fetching template', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/templates - Create new template
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, type, subject, body, is_active = true } = req.body;

    // Validate required fields
    if (!name || !type || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, type, body',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Validate type
    if (!['email', 'sms', 'push'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be email, sms, or push',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Validate template syntax
    const syntaxValidation = TemplateEngine.validateSyntax(body);
    if (!syntaxValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template syntax',
        details: { errors: syntaxValidation.errors },
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Extract variables from template
    const variables = TemplateEngine.extractVariables(body);
    if (subject) {
      variables.push(...TemplateEngine.extractVariables(subject));
    }
    const uniqueVariables = [...new Set(variables)];

    // Check if template name already exists
    const { data: existing } = await supabase
      .from('notification_templates')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Template name already exists',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Create template
    const { data, error } = await supabase
      .from('notification_templates')
      .insert({
        name,
        type,
        subject: type === 'email' ? subject : null,
        body,
        variables: uniqueVariables,
        is_active,
        created_by: req.user!.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create template', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to create template',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    logger.info('Template created', {
      templateId: data.id,
      name,
      type,
      createdBy: req.user!.id,
      requestId: req.requestId,
    });

    res.status(201).json({
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error creating template', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// PUT /api/v1/templates/:id - Update template
router.put('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, subject, body, is_active } = req.body;

    // Check if template exists
    const { data: existing, error: fetchError } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Validate template syntax if body is being updated
    if (body) {
      const syntaxValidation = TemplateEngine.validateSyntax(body);
      if (!syntaxValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid template syntax',
          details: { errors: syntaxValidation.errors },
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) {
      if (!['email', 'sms', 'push'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid type. Must be email, sms, or push',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
      updateData.type = type;
    }
    if (subject !== undefined) updateData.subject = subject;
    if (body !== undefined) {
      updateData.body = body;
      // Update variables array
      const variables = TemplateEngine.extractVariables(body);
      if (subject || existing.subject) {
        variables.push(...TemplateEngine.extractVariables(subject || existing.subject));
      }
      updateData.variables = [...new Set(variables)];
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    // Check for name conflicts if name is being changed
    if (name && name !== existing.name) {
      const { data: nameConflict } = await supabase
        .from('notification_templates')
        .select('id')
        .eq('name', name)
        .neq('id', id)
        .single();

      if (nameConflict) {
        return res.status(409).json({
          success: false,
          error: 'Template name already exists',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }
    }

    // Update template
    const { data, error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update template', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to update template',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    logger.info('Template updated', {
      templateId: id,
      updatedBy: req.user!.id,
      changes: Object.keys(updateData),
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error updating template', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// DELETE /api/v1/templates/:id - Delete template
router.delete('/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if template exists
    const { data: existing, error: fetchError } = await supabase
      .from('notification_templates')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Check if template is in use (has recent notifications)
    const { data: recentUsage } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('template_id', id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .limit(1);

    if (recentUsage && recentUsage.length > 0) {
      // Soft delete instead of hard delete
      const { error } = await supabase
        .from('notification_templates')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        logger.error('Failed to deactivate template', { error, requestId: req.requestId });
        return res.status(500).json({
          success: false,
          error: 'Failed to deactivate template',
          metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
        });
      }

      logger.info('Template deactivated (in use)', {
        templateId: id,
        name: existing.name,
        deactivatedBy: req.user!.id,
        requestId: req.requestId,
      });

      return res.json({
        success: true,
        message: 'Template deactivated (was in use)',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Hard delete if not in recent use
    const { error } = await supabase.from('notification_templates').delete().eq('id', id);

    if (error) {
      logger.error('Failed to delete template', { error, requestId: req.requestId });
      return res.status(500).json({
        success: false,
        error: 'Failed to delete template',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    logger.info('Template deleted', {
      templateId: id,
      name: existing.name,
      deletedBy: req.user!.id,
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: 'Template deleted successfully',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error deleting template', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/templates/:id/preview - Preview template with variables
router.post('/:id/preview', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { variables = {} } = req.body;

    // Get template
    const { data: template, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Render template
    const renderedBody = TemplateEngine.renderTemplate(template.body, variables);
    const renderedSubject = template.subject
      ? TemplateEngine.renderTemplate(template.subject, variables)
      : null;

    // Generate preview with sample data if no variables provided
    const previewBody =
      Object.keys(variables).length > 0
        ? renderedBody
        : TemplateEngine.generatePreview(template.body);
    const previewSubject = template.subject
      ? Object.keys(variables).length > 0
        ? renderedSubject
        : TemplateEngine.generatePreview(template.subject)
      : null;

    res.json({
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          type: template.type,
          variables: template.variables,
        },
        preview: {
          subject: previewSubject,
          body: previewBody,
        },
        rendered: {
          subject: renderedSubject,
          body: renderedBody,
        },
        provided_variables: variables,
        missing_variables: template.variables.filter(
          (variable: string) => !(variable in variables)
        ),
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error previewing template', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

// POST /api/v1/templates/validate - Validate template syntax
router.post('/validate', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subject, body, required_variables = [] } = req.body;

    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'Body is required for validation',
        metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    }

    // Validate syntax
    const bodySyntax = TemplateEngine.validateSyntax(body);
    const subjectSyntax = subject
      ? TemplateEngine.validateSyntax(subject)
      : { valid: true, errors: [] };

    // Extract variables
    const bodyVariables = TemplateEngine.extractVariables(body);
    const subjectVariables = subject ? TemplateEngine.extractVariables(subject) : [];
    const allVariables = [...new Set([...bodyVariables, ...subjectVariables])];

    // Check required variables
    const missingVariables = required_variables.filter(
      (variable: string) => !allVariables.includes(variable)
    );

    const isValid = bodySyntax.valid && subjectSyntax.valid && missingVariables.length === 0;

    res.json({
      success: true,
      data: {
        valid: isValid,
        syntax: {
          body: bodySyntax,
          subject: subjectSyntax,
        },
        variables: {
          found: allVariables,
          required: required_variables,
          missing: missingVariables,
        },
        preview: {
          body: TemplateEngine.generatePreview(body),
          subject: subject ? TemplateEngine.generatePreview(subject) : null,
        },
      },
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  } catch (error: any) {
    logger.error('Error validating template', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      metadata: { timestamp: new Date().toISOString(), requestId: req.requestId },
    });
  }
});

export default router;
