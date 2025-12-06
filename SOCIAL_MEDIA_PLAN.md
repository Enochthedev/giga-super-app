# Social Media Service Implementation Plan

## Overview
Implement "WhatsApp-like" chat and a Social Feed using Supabase Edge Functions. The database schema (`conversations`, `messages`, `social_posts`, etc.) is already in place.

## 1. Chat Service (WhatsApp-style)

### A. `send-message`
- **Purpose**: Send a text or media message to a conversation.
- **Logic**:
  - Check if conversation exists between participants; if not, create it.
  - Insert message into `messages`.
  - Update `conversations.last_message` and `updated_at`.
  - Trigger push notification to recipient.

### B. `get-conversations`
- **Purpose**: List all conversations for the current user.
- **Logic**:
  - Query `conversation_participants` to find user's chats.
  - Join with `conversations` to get last message preview.
  - Join with `user_profiles` to get other participant's name/avatar.
  - Sort by `updated_at` desc.

### C. `get-messages`
- **Purpose**: Fetch message history for a specific conversation.
- **Logic**:
  - Pagination (cursor-based or offset).
  - Fetch from `messages` table.
  - Mark messages as 'delivered' if not already.

### D. `mark-messages-read`
- **Purpose**: Send read receipts.
- **Logic**:
  - Update `status` to 'read' for messages in a conversation where `sender_id` != `current_user`.

## 2. Social Feed Service

### A. `create-post`
- **Purpose**: User creates a new post (Text, Image, Video).
- **Logic**:
  - Validate input (media URLs, content).
  - Insert into `social_posts`.
  - Handle hashtags/mentions (optional for MVP).

### B. `get-feed`
- **Purpose**: Main scrollable feed.
- **Logic**:
  - Fetch posts from `social_posts`.
  - **Algorithm**:
    - Priority 1: Posts from `user_connections` (friends).
    - Priority 2: Recent public posts (discovery).
  - Pagination.
  - Include `user_profiles` data (author).
  - Include `post_likes` count and `liked_by_user` boolean.

### C. `interact-post` (Like/Unlike)
- **Purpose**: Toggle like status.
- **Logic**:
  - Check if like exists in `post_likes`.
  - If yes, delete (unlike).
  - If no, insert (like).
  - Update `social_posts.likes_count` (or rely on DB trigger).

### D. `comment-post`
- **Purpose**: Add a comment to a post.
- **Logic**:
  - Insert into `post_comments`.
  - Update `social_posts.comments_count`.

### E. `create-story`
- **Purpose**: Post ephemeral content (24h).
- **Logic**:
  - Insert into `stories` table.
  - Set `expires_at` to 24h from now.

### F. `get-stories`
- **Purpose**: View active stories from connections.
- **Logic**:
  - Fetch from `stories` where `expires_at` > `now()`.
  - Group by user.

## 3. Postman Collection
- Add "16. Social Media" section to `Giga-API-Collection.postman_collection.json`.
