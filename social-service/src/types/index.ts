import { Request } from 'express';

// ============================================================================
// User Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  roles?: string[];
}

// Use the extended Express.Request type from modules.d.ts
export type AuthenticatedRequest = Request;

// ============================================================================
// Post Types
// ============================================================================

export type PostType = 'post' | 'story' | 'reel' | 'status';
export type Visibility = 'public' | 'friends' | 'private' | 'custom';

export interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  place_id?: string;
}

export interface CreatePostRequest {
  content: string;
  media_urls?: string[];
  post_type?: PostType;
  visibility?: Visibility;
  allowed_viewers?: string[];
  location?: Location;
  feeling_activity?: string;
  tagged_users?: string[];
}

export interface UpdatePostRequest {
  content?: string;
  media_urls?: string[];
  visibility?: Visibility;
  allowed_viewers?: string[];
  location?: Location;
  feeling_activity?: string;
  tagged_users?: string[];
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  post_type: PostType;
  visibility: Visibility;
  allowed_viewers: string[];
  location: Location | null;
  feeling_activity: string | null;
  tagged_users: string[];
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  shared_post_id: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostWithUser extends Post {
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username?: string;
  };
  shared_post?: PostWithUser;
  has_liked?: boolean;
}

// ============================================================================
// Comment Types
// ============================================================================

export interface CreateCommentRequest {
  post_id: string;
  content: string;
  parent_comment_id?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  like_count: number;
  reply_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentWithUser extends Comment {
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username?: string;
  };
  replies?: CommentWithUser[];
  has_liked?: boolean;
}

// ============================================================================
// Like Types
// ============================================================================

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface CreateLikeRequest {
  reaction_type?: ReactionType;
}

export interface Like {
  id: string;
  post_id?: string;
  comment_id?: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface LikeWithUser extends Like {
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username?: string;
  };
}

// ============================================================================
// Story Types
// ============================================================================

export interface CreateStoryRequest {
  media_url: string;
  media_type: 'image' | 'video';
  duration?: number;
  background_color?: string;
  text_overlay?: string;
  viewers_list?: string[];
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  duration: number;
  background_color: string | null;
  text_overlay: string | null;
  viewers_list: string[];
  view_count: number;
  expires_at: string;
  created_at: string;
}

export interface StoryWithUser extends Story {
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username?: string;
  };
  has_viewed?: boolean;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
}

// ============================================================================
// Share Types
// ============================================================================

export interface CreateShareRequest {
  post_id: string;
  content?: string;
  visibility?: Visibility;
  share_type: 'repost' | 'quote' | 'send';
  recipient_ids?: string[];
}

export interface Share {
  id: string;
  user_id: string;
  post_id: string;
  share_type: 'repost' | 'quote' | 'send';
  created_at: string;
}

// ============================================================================
// Feed Types
// ============================================================================

export interface FeedQuery {
  page?: number;
  limit?: number;
  filter?: 'all' | 'friends' | 'following';
}

export interface TrendingQuery {
  page?: number;
  limit?: number;
  timeframe?: '24h' | '7d' | '30d';
}

// ============================================================================
// Report Types
// ============================================================================

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'false_information'
  | 'scam'
  | 'other';

export interface CreateReportRequest {
  content_id: string;
  content_type: 'post' | 'comment' | 'user' | 'story';
  reason: ReportReason;
  details?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  content_id: string;
  content_type: 'post' | 'comment' | 'user' | 'story';
  reason: ReportReason;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Following/Connection Types
// ============================================================================

export interface FollowRequest {
  user_id: string;
}

export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface ConnectionWithUser extends Connection {
  user?: {
    id: string;
    full_name: string;
    avatar_url: string;
    username?: string;
  };
}

// ============================================================================
// Blocking Types
// ============================================================================

export interface BlockRequest {
  blocked_user_id: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  created_at: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface APIMetadata {
  timestamp: string;
  request_id: string;
  version: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: APIMetadata;
  pagination?: PaginationMetadata;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
  jwt: {
    secret: string;
  };
  cache: {
    ttl: number;
    maxKeys: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
  logging: {
    level: string;
    format: string;
  };
  social: {
    maxMediaUploads: number;
    maxContentLength: number;
    maxCommentLength: number;
    storyExpirationHours: number;
    trendingTimeframeHours: number;
  };
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface UserStats {
  user_id: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  total_likes_received: number;
  total_comments_received: number;
  total_shares_received: number;
}

export interface PostAnalytics {
  post_id: string;
  impressions: number;
  engagement_rate: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  click_count: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'like' | 'comment' | 'share' | 'follow' | 'mention' | 'reply';

export interface NotificationPayload {
  type: NotificationType;
  actor_id: string;
  target_id: string;
  content_id?: string;
  content_type?: 'post' | 'comment' | 'story';
  message: string;
}
