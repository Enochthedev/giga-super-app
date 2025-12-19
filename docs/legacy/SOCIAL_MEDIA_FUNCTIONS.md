# Social Media Edge Functions

## Complete Social Media Platform Functions

### Posts Management

#### create-social-post

- **Method**: POST
- **Auth**: Required
- **Body**:
  ```json
  {
    "content": "Post text",
    "media_urls": ["url1", "url2"],
    "post_type": "post|story|reel|status",
    "visibility": "public|friends|private|custom",
    "location": { "lat": 0, "lng": 0, "name": "Location" },
    "feeling_activity": "feeling happy",
    "tagged_users": ["user_id1", "user_id2"],
    "shared_post_id": "uuid"
  }
  ```
- **Description**: Create a new social media post
- **Features**:
  - Multiple media attachments
  - Privacy controls
  - Location tagging
  - User tagging
  - Post sharing

#### update-post

- **Method**: POST
- **Auth**: Required (Owner only)
- **Body**:
  `{ "postId": "uuid", "content": "Updated text", "media_urls": [], "visibility": "public" }`
- **Description**: Update an existing post

#### delete-post

- **Method**: POST
- **Auth**: Required (Owner only)
- **Body**: `{ "postId": "uuid" }`
- **Description**: Soft delete a post

#### share-post

- **Method**: POST
- **Auth**: Required
- **Body**:
  `{ "postId": "uuid", "content": "Optional comment", "visibility": "public" }`
- **Description**: Share another user's post
- **Features**: Increments share count, notifies original poster

#### get-post-details

- **Method**: GET
- **Auth**: Required
- **Query**: `?post_id=uuid`
- **Description**: Get full post details with comments
- **Returns**: Post data, comments, user's like status, shared post details

#### get-user-posts

- **Method**: GET
- **Auth**: Required
- **Query**: `?user_id=uuid&limit=20&offset=0`
- **Description**: Get posts from a specific user (profile view)

#### get-social-feed

- **Method**: GET
- **Auth**: Required
- **Query**: `?limit=20&offset=0`
- **Description**: Get personalized feed based on connections
- **Features**: Shows posts from friends and public posts

### Interactions

#### like-post

- **Method**: POST
- **Auth**: Required
- **Body**:
  `{ "postId": "uuid", "reactionType": "like|love|haha|wow|sad|angry" }`
- **Description**: Like/unlike a post with reaction types
- **Features**: Toggle like, multiple reaction types

#### comment-on-post

- **Method**: POST
- **Auth**: Required
- **Body**:
  `{ "postId": "uuid", "content": "Comment text", "parentCommentId": "uuid" }`
- **Description**: Comment on a post or reply to a comment
- **Features**: Nested comments, notifications

#### update-comment

- **Method**: POST
- **Auth**: Required (Owner only)
- **Body**: `{ "commentId": "uuid", "content": "Updated text" }`
- **Description**: Edit a comment
- **Features**: Marks as edited

#### delete-comment

- **Method**: POST
- **Auth**: Required (Owner only)
- **Body**: `{ "commentId": "uuid" }`
- **Description**: Delete a comment
- **Features**: Decrements comment count

#### like-comment

- **Method**: POST
- **Auth**: Required
- **Body**: `{ "commentId": "uuid" }`
- **Description**: Like/unlike a comment

### Stories

#### create-story

- **Method**: POST
- **Auth**: Required
- **Body**:
  ```json
  {
    "mediaUrl": "url",
    "mediaType": "image|video",
    "caption": "Optional caption",
    "durationSeconds": 5
  }
  ```
- **Description**: Create a 24-hour story
- **Features**: Auto-expires after 24 hours

#### get-stories

- **Method**: GET
- **Auth**: Required
- **Description**: Get stories from friends
- **Returns**: Stories grouped by user, only active (non-expired) stories

#### view-story

- **Method**: POST
- **Auth**: Required
- **Body**: `{ "storyId": "uuid" }`
- **Description**: Mark story as viewed
- **Features**: Tracks unique views, increments view count

#### get-story-viewers

- **Method**: GET
- **Auth**: Required (Owner only)
- **Query**: `?story_id=uuid`
- **Description**: See who viewed your story
- **Returns**: List of viewers with timestamps

### Connections/Friends

#### send-friend-request

- **Method**: POST
- **Auth**: Required
- **Body**:
  `{ "targetUserId": "uuid", "connectionType": "friend|follower|family|colleague" }`
- **Description**: Send a connection request
- **Features**: Prevents duplicate requests, notifies recipient

#### respond-to-friend-request

- **Method**: POST
- **Auth**: Required
- **Body**: `{ "connectionId": "uuid", "action": "accept|decline" }`
- **Description**: Accept or decline a friend request
- **Features**: Creates reciprocal connection on accept, notifies requester

#### get-friends

- **Method**: GET
- **Auth**: Required
- **Query**: `?status=accepted|pending|blocked`
- **Description**: Get user's connections
- **Returns**: List of connections with user profiles

#### get-friend-requests

- **Method**: GET
- **Auth**: Required
- **Query**: `?type=received|sent`
- **Description**: Get pending friend requests
- **Returns**: Received or sent requests

#### unfriend

- **Method**: POST
- **Auth**: Required
- **Body**: `{ "userId": "uuid" }`
- **Description**: Remove a connection
- **Features**: Removes both directions of connection

#### block-user

- **Method**: POST
- **Auth**: Required
- **Body**: `{ "userId": "uuid" }`
- **Description**: Block a user
- **Features**: Removes existing connections, prevents future connections

#### unblock-user

- **Method**: POST
- **Auth**: Required
- **Body**: `{ "userId": "uuid" }`
- **Description**: Unblock a user

#### search-users

- **Method**: GET
- **Auth**: Required
- **Query**: `?q=search_term&limit=20`
- **Description**: Search for users by name or email
- **Returns**: Users with connection status (none, pending, accepted, blocked)

### Messaging (Already Created)

#### create-conversation

- **Method**: POST
- **Auth**: Required
- **Body**:
  `{ "participantIds": ["uuid"], "conversationType": "direct|group", "name": "Group name" }`
- **Description**: Start a new conversation

#### send-message

- **Method**: POST
- **Auth**: Required
- **Body**:
  ```json
  {
    "conversationId": "uuid",
    "messageType": "text|image|video|audio|file|location",
    "content": "Message text",
    "mediaUrl": "url",
    "replyToId": "uuid"
  }
  ```
- **Description**: Send a message

#### get-conversations

- **Method**: GET
- **Auth**: Required
- **Description**: Get user's conversations

#### get-messages

- **Method**: GET
- **Auth**: Required
- **Query**: `?conversation_id=uuid&limit=50&before=timestamp`
- **Description**: Get messages from a conversation

### Moderation

#### report-content

- **Method**: POST
- **Auth**: Required
- **Body**:
  ```json
  {
    "contentType": "post|comment|user|message",
    "contentId": "uuid",
    "reason": "spam|harassment|inappropriate|other",
    "description": "Additional details"
  }
  ```
- **Description**: Report inappropriate content
- **Features**: Creates support ticket, logs in audit trail

## Database RPC Functions Needed

Create these in your Supabase SQL editor:

```sql
-- Increment/decrement post counters
CREATE OR REPLACE FUNCTION increment_post_likes(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE social_posts SET like_count = like_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_likes(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE social_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_comments(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE social_posts SET comment_count = comment_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_post_comments(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE social_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_shares(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE social_posts SET share_count = share_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_views(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE social_posts SET view_count = view_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Comment likes
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE post_comments SET like_count = like_count + 1 WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE post_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = comment_id;
END;
$$ LANGUAGE plpgsql;

-- Story views
CREATE OR REPLACE FUNCTION increment_story_views(story_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE stories SET view_count = view_count + 1 WHERE id = story_id;
END;
$$ LANGUAGE plpgsql;
```

## Features Summary

### ✅ Implemented

- Post creation with media, tagging, location
- Post editing and deletion
- Post sharing
- Like/reactions system
- Comments and replies
- Comment editing and deletion
- Comment likes
- Stories (24-hour posts)
- Story viewing and viewer tracking
- Friend requests and connections
- Friend management (accept, decline, unfriend)
- User blocking/unblocking
- User search
- Personalized feed
- Direct and group messaging
- Content reporting

### 🎯 Key Features

- **Privacy Controls**: Public, friends-only, private posts
- **Rich Media**: Images, videos, multiple attachments
- **Engagement**: Likes, comments, shares, reactions
- **Stories**: 24-hour ephemeral content
- **Connections**: Friend requests, followers, blocking
- **Messaging**: Direct and group chats
- **Moderation**: Content reporting system
- **Notifications**: Real-time notifications for all interactions

### 📱 Mobile-Ready

All endpoints support:

- Pagination
- Infinite scroll
- Real-time updates (via Supabase Realtime)
- Offline support (via local caching)

## Testing

Use the Postman collection to test all endpoints. Each function includes:

- Authentication validation
- Input validation
- Permission checks
- Error handling
- Audit logging

## Next Steps

1. Deploy all functions to Supabase
2. Create the RPC functions in SQL
3. Set up RLS policies for security
4. Configure Realtime subscriptions
5. Add rate limiting
6. Set up content moderation workflows
7. Implement push notifications
8. Add analytics tracking
