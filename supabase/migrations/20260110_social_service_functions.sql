-- ============================================================================
-- Social Service Database Functions
-- Functions for analytics, counters, and trending content
-- ============================================================================

-- ============================================================================
-- Counter Functions
-- ============================================================================

-- Increment post like count
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE social_posts
  SET like_count = like_count + 1,
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement post like count
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE social_posts
  SET like_count = GREATEST(like_count - 1, 0),
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Increment post comment count
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE social_posts
  SET comment_count = comment_count + 1,
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement post comment count
CREATE OR REPLACE FUNCTION decrement_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE social_posts
  SET comment_count = GREATEST(comment_count - 1, 0),
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Increment post share count
CREATE OR REPLACE FUNCTION increment_post_shares(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE social_posts
  SET share_count = share_count + 1,
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement post share count
CREATE OR REPLACE FUNCTION decrement_post_shares(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE social_posts
  SET share_count = GREATEST(share_count - 1, 0),
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Increment post view count
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE social_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Increment comment like count
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE post_comments
  SET like_count = like_count + 1,
      updated_at = NOW()
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement comment like count
CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE post_comments
  SET like_count = GREATEST(like_count - 1, 0),
      updated_at = NOW()
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Increment comment reply count
CREATE OR REPLACE FUNCTION increment_comment_replies(comment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE post_comments
  SET reply_count = reply_count + 1,
      updated_at = NOW()
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement comment reply count
CREATE OR REPLACE FUNCTION decrement_comment_replies(comment_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE post_comments
  SET reply_count = GREATEST(reply_count - 1, 0),
      updated_at = NOW()
  WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Increment story view count
CREATE OR REPLACE FUNCTION increment_story_views(story_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE stories
  SET view_count = view_count + 1
  WHERE id = story_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Trending Posts Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_trending_posts(
  time_threshold TIMESTAMP,
  page_offset INTEGER DEFAULT 0,
  page_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  media_urls TEXT[],
  post_type TEXT,
  visibility TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  view_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  trending_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.media_urls,
    p.post_type,
    p.visibility,
    p.like_count,
    p.comment_count,
    p.share_count,
    p.view_count,
    p.created_at,
    p.updated_at,
    -- Trending score calculation (weighted engagement)
    (
      (p.like_count * 1.0) +
      (p.comment_count * 2.0) +
      (p.share_count * 3.0) +
      (p.view_count * 0.1)
    ) / EXTRACT(EPOCH FROM (NOW() - p.created_at)) * 3600 AS trending_score
  FROM social_posts p
  WHERE
    p.is_active = true
    AND p.visibility = 'public'
    AND p.created_at >= time_threshold
  ORDER BY trending_score DESC, p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Count trending posts
CREATE OR REPLACE FUNCTION count_trending_posts(time_threshold TIMESTAMP)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO total_count
  FROM social_posts
  WHERE
    is_active = true
    AND visibility = 'public'
    AND created_at >= time_threshold;

  RETURN total_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- User Stats Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_social_stats(target_user_id UUID)
RETURNS TABLE (
  post_count BIGINT,
  follower_count BIGINT,
  following_count BIGINT,
  total_likes_received BIGINT,
  total_comments_received BIGINT,
  total_shares_received BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Post count
    (SELECT COUNT(*) FROM social_posts WHERE user_id = target_user_id AND is_active = true),
    -- Follower count
    (SELECT COUNT(*) FROM user_connections WHERE connected_user_id = target_user_id AND status = 'accepted'),
    -- Following count
    (SELECT COUNT(*) FROM user_connections WHERE user_id = target_user_id AND status = 'accepted'),
    -- Total likes received
    (SELECT COALESCE(SUM(like_count), 0) FROM social_posts WHERE user_id = target_user_id AND is_active = true),
    -- Total comments received
    (SELECT COALESCE(SUM(comment_count), 0) FROM social_posts WHERE user_id = target_user_id AND is_active = true),
    -- Total shares received
    (SELECT COALESCE(SUM(share_count), 0) FROM social_posts WHERE user_id = target_user_id AND is_active = true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Content Cleanup Functions
-- ============================================================================

-- Delete expired stories
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM stories
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Archive old inactive posts (optional, for data retention)
CREATE OR REPLACE FUNCTION archive_old_posts(days_threshold INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  WITH archived AS (
    UPDATE social_posts
    SET is_active = false
    WHERE
      is_active = true
      AND created_at < (NOW() - (days_threshold || ' days')::INTERVAL)
      AND view_count < 10
      AND like_count < 5
    RETURNING id
  )
  SELECT COUNT(*) INTO archived_count FROM archived;

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Engagement Metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_post_engagement_rate(target_post_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  engagement_rate NUMERIC;
  total_engagement INTEGER;
  views INTEGER;
BEGIN
  SELECT
    like_count + comment_count + share_count,
    GREATEST(view_count, 1)
  INTO total_engagement, views
  FROM social_posts
  WHERE id = target_post_id;

  IF views > 0 THEN
    engagement_rate := (total_engagement::NUMERIC / views::NUMERIC) * 100;
  ELSE
    engagement_rate := 0;
  END IF;

  RETURN ROUND(engagement_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_post_likes TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_likes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_comments TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_comments TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_shares TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_shares TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_views TO authenticated;
GRANT EXECUTE ON FUNCTION increment_comment_likes TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_comment_likes TO authenticated;
GRANT EXECUTE ON FUNCTION increment_comment_replies TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_comment_replies TO authenticated;
GRANT EXECUTE ON FUNCTION increment_story_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_posts TO authenticated;
GRANT EXECUTE ON FUNCTION count_trending_posts TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_social_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_post_engagement_rate TO authenticated;

-- Cleanup functions should only be executable by service role
GRANT EXECUTE ON FUNCTION cleanup_expired_stories TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_posts TO service_role;
