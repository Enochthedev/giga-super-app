-- S1 / E12: social_posts.comment_count was always 0 — update_post_counts() already had a
-- post_comments branch but no trigger fired it, and its COUNT(*) didn't exclude soft-deleted
-- comments. Fixes the count to respect deleted_at and wires the trigger on post_comments for
-- insert and soft-delete. Verified: post insert 0 -> comment 1 -> soft-delete 0. Backfills
-- existing posts. Applied 2026-08-19 via MCP.
CREATE OR REPLACE FUNCTION public.update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_post_id uuid := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  PERFORM 1 FROM social_posts WHERE id = v_post_id FOR UPDATE;
  IF TG_TABLE_NAME = 'post_likes' THEN
    UPDATE social_posts
      SET like_count = (SELECT COUNT(*) FROM post_likes WHERE post_id = v_post_id),
          updated_at = NOW()
      WHERE id = v_post_id;
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    UPDATE social_posts
      SET comment_count = (
            SELECT COUNT(*) FROM post_comments
            WHERE post_id = v_post_id AND deleted_at IS NULL
          ),
          updated_at = NOW()
      WHERE id = v_post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Post count update failed for post_id % on table %: %', v_post_id, TG_TABLE_NAME, SQLERRM;
    RAISE;
END;
$function$;

DROP TRIGGER IF EXISTS update_post_comment_counts_trigger ON public.post_comments;
CREATE TRIGGER update_post_comment_counts_trigger
  AFTER INSERT OR UPDATE OF deleted_at ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_counts();

UPDATE social_posts sp
  SET comment_count = (
    SELECT COUNT(*) FROM post_comments pc
    WHERE pc.post_id = sp.id AND pc.deleted_at IS NULL
  );
