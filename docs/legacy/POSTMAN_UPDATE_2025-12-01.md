# Postman Collection Update - December 1, 2025

## Summary

Successfully added **41 new endpoints** across **7 sections** to the Giga
Platform API Postman collection, covering all social media features and
voice/video calling functionality.

## What Was Added

### 16. Social Media - Posts & Feed (11 endpoints)

Complete social media posting functionality:

- ✅ Create Social Post - Create posts with media and location
- ✅ Get Social Feed - Personalized feed from friends
- ✅ Get Post Details - Detailed post view with comments/likes
- ✅ Get User Posts - View user's post history
- ✅ Update Post - Edit existing posts
- ✅ Delete Post - Remove posts
- ✅ Share Post - Share to timeline
- ✅ Like Post - Like/unlike toggle
- ✅ Comment on Post - Add comments (supports nested replies)
- ✅ Update Comment - Edit comments
- ✅ Delete Comment - Remove comments
- ✅ Like Comment - Like/unlike comments

### 17. Social Media - Stories (4 endpoints)

Temporary 24-hour stories feature:

- ✅ Create Story - Upload image/video stories
- ✅ Get Stories - View active stories from network
- ✅ View Story - Mark story as viewed
- ✅ Get Story Viewers - See who viewed your story

### 18. Social Media - Friends & Connections (8 endpoints)

Social networking and user discovery:

- ✅ Send Friend Request - Connect with users
- ✅ Respond to Friend Request - Accept/reject requests
- ✅ Get Friends - View friend list
- ✅ Get Friend Requests - View pending requests
- ✅ Unfriend - Remove connections
- ✅ Block User - Block unwanted users
- ✅ Unblock User - Unblock users
- ✅ Search Users - Find users by name/username

### 19. Social Media - Messaging (4 endpoints)

Direct messaging and conversations:

- ✅ Create Conversation - Start direct or group chats
- ✅ Get Conversations - View all conversations
- ✅ Send Message - Send text/media messages
- ✅ Get Messages - Retrieve conversation history

### 20. Social Media - Voice & Video Calls (5 endpoints)

Agora-powered calling system:

- ✅ Initiate Call - Start voice/video calls
- ✅ Answer Call - Accept incoming calls
- ✅ Decline Call - Reject calls
- ✅ End Call - Terminate calls for all
- ✅ Leave Call - Leave group calls

**Special Features:**

- Returns Agora channel name and token
- Supports both voice and video
- Tracks call duration
- Real-time status updates via Supabase Realtime
- Notification queue integration

### 21. Social Media - Support & Moderation (4 endpoints)

User support and content reporting:

- ✅ Create Support Ticket - Submit support requests
- ✅ Reply to Ticket - Add ticket responses
- ✅ Get My Tickets - View user's tickets
- ✅ Report Content - Report inappropriate content

### 22. Admin - Social Media Management (5 endpoints)

Administrative controls:

- ✅ Admin Manage Users - Suspend/ban users
- ✅ Admin Manage Content - Moderate content
- ✅ Admin Get Dashboard Stats - Platform analytics
- ✅ Admin Manage Vendors - Vendor approval
- ✅ Admin Financial Reports - Financial analytics

## Collection Statistics

### Before Update

- Sections: 15
- Total Endpoints: ~100

### After Update

- Sections: 22 (+7)
- Total Endpoints: ~141 (+41)
- New Features: Social Media Platform + Voice/Video Calls

## How to Use

### 1. Import Updated Collection

```bash
# The collection file has been updated in place
postman/Giga-API-Collection.postman_collection.json
```

### 2. Set Environment Variables

Make sure your Postman environment has:

```
base_url = https://your-project.supabase.co/functions/v1
supabase_anon_key = your-anon-key
supabase_auth_token = (obtained after login)
```

### 3. Authentication Flow

1. Use **0. Supabase Auth → Sign Up** or **Sign In**
2. Copy the `access_token` from response
3. Set it as `supabase_auth_token` in environment
4. All subsequent requests will use this token

### 4. Testing Calls Feature

```javascript
// 1. Initiate a call
POST /initiate-call
{
  "conversationId": "uuid-here",
  "callType": "video",
  "participantIds": ["user-uuid-1", "user-uuid-2"]
}

// Response includes:
{
  "success": true,
  "call": {
    "id": "call-uuid",
    "agora_channel": "call_conversation_timestamp",
    "agora_token": "token-for-agora-sdk",
    "status": "initiated"
  }
}

// 2. Answer the call (as recipient)
POST /answer-call
{
  "callId": "call-uuid"
}

// 3. End the call
POST /end-call
{
  "callId": "call-uuid"
}
```

## Request Format

All endpoints follow this standard format:

### Headers

```
Content-Type: application/json
apikey: {{supabase_anon_key}}
Authorization: Bearer {{supabase_auth_token}}
```

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Format

```json
{
  "error": "Error message",
  "details": "Optional details"
}
```

## Testing Checklist

### Social Media Posts

- [ ] Create a post with media
- [ ] View social feed
- [ ] Like a post
- [ ] Comment on a post
- [ ] Share a post
- [ ] Delete a post

### Stories

- [ ] Create a story
- [ ] View stories feed
- [ ] View a specific story
- [ ] Check story viewers

### Friends

- [ ] Send friend request
- [ ] Accept friend request
- [ ] View friends list
- [ ] Search for users
- [ ] Block/unblock user

### Messaging

- [ ] Create conversation
- [ ] Send message
- [ ] Get messages
- [ ] View conversations list

### Calls

- [ ] Initiate voice call
- [ ] Initiate video call
- [ ] Answer call
- [ ] Decline call
- [ ] End call
- [ ] Leave group call

### Support

- [ ] Create support ticket
- [ ] Reply to ticket
- [ ] View tickets

### Admin

- [ ] View dashboard stats
- [ ] Manage users
- [ ] Moderate content
- [ ] View financial reports

## Integration with Frontend

### Example: Using with Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-project.supabase.co/functions/v1',
  headers: {
    apikey: process.env.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${userToken}`,
  },
});

// Create a post
const createPost = async (content, mediaUrls) => {
  const response = await api.post('/create-social-post', {
    content,
    media_urls: mediaUrls,
    visibility: 'public',
  });
  return response.data;
};

// Initiate a call
const initiateCall = async (conversationId, callType, participantIds) => {
  const response = await api.post('/initiate-call', {
    conversationId,
    callType,
    participantIds,
  });
  return response.data.call; // Contains Agora credentials
};
```

### Example: Using with Supabase Client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create a post
const createPost = async (content, mediaUrls) => {
  const { data, error } = await supabase.functions.invoke(
    'create-social-post',
    {
      body: {
        content,
        media_urls: mediaUrls,
        visibility: 'public',
      },
    }
  );
  return data;
};
```

## Real-time Integration

For calls and messaging, subscribe to Realtime updates:

```javascript
// Subscribe to incoming calls
const callsChannel = supabase
  .channel('calls')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'calls',
      filter: `participants=cs.{${userId}}`,
    },
    payload => {
      console.log('Incoming call:', payload.new);
      // Show incoming call UI
    }
  )
  .subscribe();

// Subscribe to new messages
const messagesChannel = supabase
  .channel('messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    },
    payload => {
      console.log('New message:', payload.new);
      // Update chat UI
    }
  )
  .subscribe();
```

## Files Updated

1. **postman/Giga-API-Collection.postman_collection.json**
   - Added 41 new endpoints
   - Organized into 7 new sections
   - All endpoints include detailed descriptions

2. **postman/add-social-calls-endpoints.js**
   - Script to add endpoints
   - Can be re-run if needed
   - Follows existing patterns

## Next Steps

1. **Import Collection**: Import the updated collection into Postman
2. **Configure Environment**: Set up your environment variables
3. **Test Endpoints**: Run through the testing checklist
4. **Configure Agora**: Set up Agora credentials for calls (see
   SUPABASE_DASHBOARD_SETUP.md)
5. **Enable Realtime**: Enable Realtime for calls and messages tables
6. **Frontend Integration**: Use the examples above to integrate with your
   frontend

## Related Documentation

- [CALLS_MODULE_DEPLOYMENT.md](./CALLS_MODULE_DEPLOYMENT.md) - Calls
  implementation details
- [SUPABASE_DASHBOARD_SETUP.md](./SUPABASE_DASHBOARD_SETUP.md) - Dashboard
  configuration guide
- [postman/README.md](./postman/README.md) - Postman collection guide
- [DATABASE_ALGORITHM_AND_REALTIME.md](./DATABASE_ALGORITHM_AND_REALTIME.md) -
  Database setup

## Support

If you encounter issues:

1. Check function logs in Supabase dashboard
2. Verify environment variables are set
3. Ensure RLS policies are configured
4. Check Realtime is enabled for required tables

---

**Status**: ✅ Complete  
**Date**: December 1, 2025  
**Endpoints Added**: 41  
**Sections Added**: 7
