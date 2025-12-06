# Quick Reference - Social Media & Calls

## 🚀 What's New

**41 new endpoints** for social media platform with voice/video calling

## 📋 Supabase Dashboard TODO

### 1. Add Environment Variables
```bash
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate
```
**Location**: Project Settings → Edge Functions → Secrets

### 2. Enable Realtime
Enable for these tables:
- ✅ `calls`
- ✅ `messages`
- ✅ `social_posts`

**Location**: Database → Replication

### 3. Create Storage Buckets
- ✅ `profile-pictures` (public, 5MB)
- ✅ `post-media` (public, 10MB)
- ✅ `story-media` (public, 10MB, 24h auto-delete)

**Location**: Storage → Buckets

## 🔌 API Endpoints

### Calls
```javascript
// Initiate
POST /initiate-call
{ conversationId, callType: "video", participantIds: [] }

// Answer
POST /answer-call
{ callId }

// End
POST /end-call
{ callId }
```

### Social Posts
```javascript
// Create
POST /create-social-post
{ content, media_urls: [], visibility: "public" }

// Feed
GET /get-social-feed?page=1&limit=20

// Like
POST /like-post
{ postId }
```

### Messaging
```javascript
// Send
POST /send-message
{ conversationId, content, messageType: "text" }

// Get
GET /get-messages?conversationId=uuid&page=1
```

## 📱 Frontend Integration

### Initialize Supabase
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

### Call Edge Function
```javascript
const { data, error } = await supabase.functions.invoke('initiate-call', {
  body: { conversationId, callType: 'video', participantIds }
});
```

### Subscribe to Realtime
```javascript
supabase
  .channel('calls')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'calls'
  }, handleIncomingCall)
  .subscribe();
```

### Join Agora Call
```javascript
import AgoraRTC from 'agora-rtc-sdk-ng';

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
await client.join(
  AGORA_APP_ID,
  call.agora_channel,
  call.agora_token,
  userId
);
```

## 📚 Documentation

- **SUPABASE_DASHBOARD_SETUP.md** - Complete dashboard configuration
- **CALLS_MODULE_DEPLOYMENT.md** - Calls implementation details
- **POSTMAN_UPDATE_2025-12-01.md** - All 41 endpoints documented
- **COMPLETION_SUMMARY.md** - Full overview

## ✅ Testing Checklist

### Backend
- [ ] All functions show ACTIVE
- [ ] Environment variables set
- [ ] Realtime enabled
- [ ] Storage buckets created

### API
- [ ] Test with Postman collection
- [ ] Verify Agora credentials returned
- [ ] Check Realtime subscriptions work

### Frontend
- [ ] Can authenticate
- [ ] Can call functions
- [ ] Can join Agora calls
- [ ] Realtime updates work

## 🆘 Troubleshooting

**Calls not working?**
- Check AGORA_APP_ID and AGORA_APP_CERTIFICATE are set
- Verify Realtime is enabled for `calls` table
- Check function logs in dashboard

**Realtime not updating?**
- Verify table has Realtime enabled
- Check subscription filter matches
- Ensure RLS policies allow reads

**Storage upload fails?**
- Verify bucket exists and is public
- Check RLS policies on storage.objects
- Verify file size within limits

## 🔗 Quick Links

- Supabase Dashboard: https://app.supabase.com
- Agora Console: https://console.agora.io
- Postman Collection: `postman/Giga-API-Collection.postman_collection.json`

---

**Status**: ✅ Ready for integration  
**Functions Deployed**: 41  
**Documentation**: Complete
