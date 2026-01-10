/**
 * Report Service
 * Business logic for content reporting and moderation
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateReportRequest,
  Report,
  PaginationParams,
  PaginationMetadata,
} from '../types';
import {
  NotFoundError,
  ValidationError,
  ERROR_CODES,
} from '../utils/errors';
import { buildPagination } from '../utils/database';
import logger from '../utils/logger';

export class ReportService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a content report
   */
  async createReport(
    reporterId: string,
    reportData: CreateReportRequest,
    requestId: string
  ): Promise<Report> {
    // Validate content exists
    await this.validateContent(
      reportData.content_type,
      reportData.content_id,
      requestId
    );

    // Check if user has already reported this content
    const { data: existing } = await this.supabase
      .from('content_reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('content_id', reportData.content_id)
      .eq('content_type', reportData.content_type)
      .single();

    if (existing) {
      throw new ValidationError('You have already reported this content');
    }

    // Create report
    const { data, error } = await this.supabase
      .from('content_reports')
      .insert({
        reporter_id: reporterId,
        content_id: reportData.content_id,
        content_type: reportData.content_type,
        reason: reportData.reason,
        details: reportData.details || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create report', {
        error: error.message,
        reporterId,
        requestId,
      });
      throw new ValidationError('Failed to create report', error);
    }

    logger.info('Content reported', {
      reportId: data.id,
      contentType: reportData.content_type,
      contentId: reportData.content_id,
      reason: reportData.reason,
      reporterId,
      requestId,
    });

    return data as Report;
  }

  /**
   * Get reports (admin/moderator only)
   */
  async getReports(
    filters: {
      status?: string;
      content_type?: string;
      reason?: string;
    },
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ reports: Report[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    let query = this.supabase
      .from('content_reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.content_type) {
      query = query.eq('content_type', filters.content_type);
    }
    if (filters.reason) {
      query = query.eq('reason', filters.reason);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to get reports', {
        error: error.message,
        requestId,
      });
      throw new ValidationError('Failed to get reports', error);
    }

    return {
      reports: (data || []) as Report[],
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + (data?.length || 0) < (count || 0),
      },
    };
  }

  /**
   * Get a specific report
   */
  async getReportById(
    reportId: string,
    requestId: string
  ): Promise<Report> {
    const { data, error } = await this.supabase
      .from('content_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Report not found');
    }

    return data as Report;
  }

  /**
   * Update report status (admin/moderator only)
   */
  async updateReportStatus(
    reportId: string,
    reviewerId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    requestId: string
  ): Promise<Report> {
    const { data, error } = await this.supabase
      .from('content_reports')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to update report status', {
        error: error?.message,
        reportId,
        requestId,
      });
      throw new ValidationError('Failed to update report status', error);
    }

    logger.info('Report status updated', {
      reportId,
      status,
      reviewerId,
      requestId,
    });

    return data as Report;
  }

  /**
   * Get user's reports
   */
  async getUserReports(
    userId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ reports: Report[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('content_reports')
      .select('*', { count: 'exact' })
      .eq('reporter_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get user reports', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get user reports', error);
    }

    return {
      reports: (data || []) as Report[],
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + (data?.length || 0) < (count || 0),
      },
    };
  }

  /**
   * Validate that the reported content exists
   */
  private async validateContent(
    contentType: string,
    contentId: string,
    requestId: string
  ): Promise<void> {
    let table: string;
    let errorCode: string;

    switch (contentType) {
      case 'post':
        table = 'social_posts';
        errorCode = ERROR_CODES.POST_NOT_FOUND;
        break;
      case 'comment':
        table = 'post_comments';
        errorCode = ERROR_CODES.COMMENT_NOT_FOUND;
        break;
      case 'story':
        table = 'stories';
        errorCode = ERROR_CODES.STORY_NOT_FOUND;
        break;
      case 'user':
        table = 'user_profiles';
        errorCode = ERROR_CODES.USER_NOT_FOUND;
        break;
      default:
        throw new ValidationError(`Invalid content type: ${contentType}`);
    }

    const { data, error } = await this.supabase
      .from(table)
      .select('id')
      .eq('id', contentId)
      .single();

    if (error || !data) {
      throw new NotFoundError(contentType, errorCode);
    }
  }
}
