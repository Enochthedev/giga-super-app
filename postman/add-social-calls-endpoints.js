// Social Media and Calls Endpoints for Postman Collection
// Run: node add-social-calls-endpoints.js

const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'Giga-API-Collection.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Helper function to create standard headers
const stdHeaders = [
    { "key": "Content-Type", "value": "application/json" },
    { "key": "apikey", "value": "{{supabase_anon_key}}" },
    { "key": "Authorization", "value": "Bearer {{supabase_auth_token}}" }
];

const getHeaders = [
    { "key": "apikey", "value": "{{supabase_anon_key}}" },
    { "key": "Authorization", "value": "Bearer {{supabase_auth_token}}" }
];

// New sections to add
const newSections = [
    {
        "name": "16. Social Media - Posts & Feed",
        "description": "Social media posts, feed, and interactions",
        "item": [
            {
                "name": "Create Social Post",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            content: "Hello world! This is my first post.",
                            media_urls: ["https://example.com/image.jpg"],
                            visibility: "public",
                            location: "Lagos, Nigeria"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/create-social-post",
                        "host": ["{{base_url}}"],
                        "path": ["create-social-post"]
                    },
                    "description": "Create a new social media post with optional media and location"
                }
            },
            {
                "name": "Get Social Feed",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-social-feed?page=1&limit=20",
                        "host": ["{{base_url}}"],
                        "path": ["get-social-feed"],
                        "query": [
                            { "key": "page", "value": "1" },
                            { "key": "limit", "value": "20" }
                        ]
                    },
                    "description": "Get personalized social feed with posts from friends and followed users"
                }
            },
            {
                "name": "Get Post Details",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-post-details?postId=uuid-here",
                        "host": ["{{base_url}}"],
                        "path": ["get-post-details"],
                        "query": [{ "key": "postId", "value": "uuid-here" }]
                    },
                    "description": "Get detailed information about a specific post including comments and likes"
                }
            },
            {
                "name": "Get User Posts",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-user-posts?userId=uuid-here&page=1&limit=20",
                        "host": ["{{base_url}}"],
                        "path": ["get-user-posts"],
                        "query": [
                            { "key": "userId", "value": "uuid-here" },
                            { "key": "page", "value": "1" },
                            { "key": "limit", "value": "20" }
                        ]
                    },
                    "description": "Get all posts by a specific user"
                }
            },
            {
                "name": "Update Post",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            postId: "uuid-here",
                            content: "Updated content",
                            visibility: "friends"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/update-post",
                        "host": ["{{base_url}}"],
                        "path": ["update-post"]
                    },
                    "description": "Update an existing post"
                }
            },
            {
                "name": "Delete Post",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ postId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/delete-post",
                        "host": ["{{base_url}}"],
                        "path": ["delete-post"]
                    },
                    "description": "Delete a post"
                }
            },
            {
                "name": "Share Post",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            postId: "uuid-here",
                            comment: "Check this out!"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/share-post",
                        "host": ["{{base_url}}"],
                        "path": ["share-post"]
                    },
                    "description": "Share a post to your timeline"
                }
            },
            {
                "name": "Like Post",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ postId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/like-post",
                        "host": ["{{base_url}}"],
                        "path": ["like-post"]
                    },
                    "description": "Like or unlike a post (toggle)"
                }
            },
            {
                "name": "Comment on Post",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            postId: "uuid-here",
                            content: "Great post!",
                            parentCommentId: null
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/comment-on-post",
                        "host": ["{{base_url}}"],
                        "path": ["comment-on-post"]
                    },
                    "description": "Add a comment to a post (supports nested replies)"
                }
            },
            {
                "name": "Update Comment",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            commentId: "uuid-here",
                            content: "Updated comment"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/update-comment",
                        "host": ["{{base_url}}"],
                        "path": ["update-comment"]
                    },
                    "description": "Update a comment"
                }
            },
            {
                "name": "Delete Comment",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ commentId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/delete-comment",
                        "host": ["{{base_url}}"],
                        "path": ["delete-comment"]
                    },
                    "description": "Delete a comment"
                }
            },
            {
                "name": "Like Comment",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ commentId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/like-comment",
                        "host": ["{{base_url}}"],
                        "path": ["like-comment"]
                    },
                    "description": "Like or unlike a comment (toggle)"
                }
            }
        ]
    },
    {
        "name": "17. Social Media - Stories",
        "description": "Create and view temporary stories",
        "item": [
            {
                "name": "Create Story",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            media_url: "https://example.com/story.jpg",
                            media_type: "image",
                            duration_seconds: 10,
                            visibility: "friends"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/create-story",
                        "host": ["{{base_url}}"],
                        "path": ["create-story"]
                    },
                    "description": "Create a new story (expires after 24 hours)"
                }
            },
            {
                "name": "Get Stories",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-stories",
                        "host": ["{{base_url}}"],
                        "path": ["get-stories"]
                    },
                    "description": "Get active stories from friends and followed users"
                }
            },
            {
                "name": "View Story",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ storyId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/view-story",
                        "host": ["{{base_url}}"],
                        "path": ["view-story"]
                    },
                    "description": "Mark a story as viewed and record view timestamp"
                }
            },
            {
                "name": "Get Story Viewers",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-story-viewers?storyId=uuid-here",
                        "host": ["{{base_url}}"],
                        "path": ["get-story-viewers"],
                        "query": [{ "key": "storyId", "value": "uuid-here" }]
                    },
                    "description": "Get list of users who viewed your story"
                }
            }
        ]
    },
    {
        "name": "18. Social Media - Friends & Connections",
        "description": "Manage friendships and social connections",
        "item": [
            {
                "name": "Send Friend Request",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ friendId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/send-friend-request",
                        "host": ["{{base_url}}"],
                        "path": ["send-friend-request"]
                    },
                    "description": "Send a friend request to another user"
                }
            },
            {
                "name": "Respond to Friend Request",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            requestId: "uuid-here",
                            action: "accept"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/respond-to-friend-request",
                        "host": ["{{base_url}}"],
                        "path": ["respond-to-friend-request"]
                    },
                    "description": "Accept or reject a friend request (action: 'accept' or 'reject')"
                }
            },
            {
                "name": "Get Friends",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-friends?userId=optional-uuid",
                        "host": ["{{base_url}}"],
                        "path": ["get-friends"],
                        "query": [{ "key": "userId", "value": "optional-uuid", "description": "Leave empty for current user" }]
                    },
                    "description": "Get list of friends for a user"
                }
            },
            {
                "name": "Get Friend Requests",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-friend-requests",
                        "host": ["{{base_url}}"],
                        "path": ["get-friend-requests"]
                    },
                    "description": "Get pending friend requests"
                }
            },
            {
                "name": "Unfriend",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ friendId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/unfriend",
                        "host": ["{{base_url}}"],
                        "path": ["unfriend"]
                    },
                    "description": "Remove a friend connection"
                }
            },
            {
                "name": "Block User",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ userId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/block-user",
                        "host": ["{{base_url}}"],
                        "path": ["block-user"]
                    },
                    "description": "Block a user from interacting with you"
                }
            },
            {
                "name": "Unblock User",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ userId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/unblock-user",
                        "host": ["{{base_url}}"],
                        "path": ["unblock-user"]
                    },
                    "description": "Unblock a previously blocked user"
                }
            },
            {
                "name": "Search Users",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/search-users?query=john&page=1&limit=20",
                        "host": ["{{base_url}}"],
                        "path": ["search-users"],
                        "query": [
                            { "key": "query", "value": "john" },
                            { "key": "page", "value": "1" },
                            { "key": "limit", "value": "20" }
                        ]
                    },
                    "description": "Search for users by name or username"
                }
            }
        ]
    },
    {
        "name": "19. Social Media - Messaging",
        "description": "Direct messaging and conversations",
        "item": [
            {
                "name": "Create Conversation",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            participantIds: ["uuid-1", "uuid-2"],
                            conversationType: "direct",
                            name: "Optional group name"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/create-conversation",
                        "host": ["{{base_url}}"],
                        "path": ["create-conversation"]
                    },
                    "description": "Create a new conversation (direct or group)"
                }
            },
            {
                "name": "Get Conversations",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-conversations?page=1&limit=20",
                        "host": ["{{base_url}}"],
                        "path": ["get-conversations"],
                        "query": [
                            { "key": "page", "value": "1" },
                            { "key": "limit", "value": "20" }
                        ]
                    },
                    "description": "Get all conversations for current user"
                }
            },
            {
                "name": "Send Message",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            conversationId: "uuid-here",
                            content: "Hello!",
                            messageType: "text",
                            mediaUrl: null
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/send-message",
                        "host": ["{{base_url}}"],
                        "path": ["send-message"]
                    },
                    "description": "Send a message in a conversation"
                }
            },
            {
                "name": "Get Messages",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-messages?conversationId=uuid-here&page=1&limit=50",
                        "host": ["{{base_url}}"],
                        "path": ["get-messages"],
                        "query": [
                            { "key": "conversationId", "value": "uuid-here" },
                            { "key": "page", "value": "1" },
                            { "key": "limit", "value": "50" }
                        ]
                    },
                    "description": "Get messages from a conversation"
                }
            }
        ]
    },
    {
        "name": "20. Social Media - Voice & Video Calls",
        "description": "Voice and video calling with Agora integration",
        "item": [
            {
                "name": "Initiate Call",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            conversationId: "uuid-here",
                            callType: "video",
                            participantIds: ["uuid-1", "uuid-2"]
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/initiate-call",
                        "host": ["{{base_url}}"],
                        "path": ["initiate-call"]
                    },
                    "description": "Start a voice or video call. Returns Agora channel name and token.\n\n**Call Types:**\n- voice: Audio only\n- video: Audio + Video\n\n**Response includes:**\n- call.id: Call UUID\n- call.agora_channel: Channel name for Agora SDK\n- call.agora_token: Authentication token for Agora\n- call.status: 'initiated'\n\n**Next Steps:**\n1. Use Agora Web SDK to join the channel\n2. Participants receive notifications via notification_queue\n3. Use Supabase Realtime to listen for call status changes"
                }
            },
            {
                "name": "Answer Call",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ callId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/answer-call",
                        "host": ["{{base_url}}"],
                        "path": ["answer-call"]
                    },
                    "description": "Accept an incoming call. Updates call status to 'active' when first participant joins.\n\n**Behavior:**\n- Records joined_at timestamp for participant\n- If first to join (after initiator), sets call.status = 'active'\n- Returns updated call details with Agora credentials"
                }
            },
            {
                "name": "Decline Call",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ callId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/decline-call",
                        "host": ["{{base_url}}"],
                        "path": ["decline-call"]
                    },
                    "description": "Reject an incoming call. Sets call status to 'declined' and notifies the initiator."
                }
            },
            {
                "name": "End Call",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ callId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/end-call",
                        "host": ["{{base_url}}"],
                        "path": ["end-call"]
                    },
                    "description": "End an active call for all participants.\n\n**Actions:**\n- Calculates call duration\n- Sets call.status = 'ended'\n- Updates all participants' left_at timestamps\n- Creates call summary message in conversation\n\n**Returns:**\n- success: true\n- duration: Call duration in seconds"
                }
            },
            {
                "name": "Leave Call",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({ callId: "uuid-here" }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/leave-call",
                        "host": ["{{base_url}}"],
                        "path": ["leave-call"]
                    },
                    "description": "Leave a group call without ending it for others.\n\n**Behavior:**\n- Updates participant's left_at timestamp\n- If all participants have left, automatically ends the call\n- Other participants can continue the call"
                }
            }
        ]
    },
    {
        "name": "21. Social Media - Support & Moderation",
        "description": "Support tickets and content moderation",
        "item": [
            {
                "name": "Create Support Ticket",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            subject: "Account Issue",
                            description: "I can't access my account",
                            category: "account",
                            priority: "medium"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/create-support-ticket",
                        "host": ["{{base_url}}"],
                        "path": ["create-support-ticket"]
                    },
                    "description": "Create a new support ticket"
                }
            },
            {
                "name": "Reply to Ticket",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            ticketId: "uuid-here",
                            message: "Here's more information..."
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/reply-to-ticket",
                        "host": ["{{base_url}}"],
                        "path": ["reply-to-ticket"]
                    },
                    "description": "Add a reply to a support ticket"
                }
            },
            {
                "name": "Get My Tickets",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/get-my-tickets?status=open",
                        "host": ["{{base_url}}"],
                        "path": ["get-my-tickets"],
                        "query": [{ "key": "status", "value": "open", "description": "Optional: open, in_progress, resolved, closed" }]
                    },
                    "description": "Get all support tickets for current user"
                }
            },
            {
                "name": "Report Content",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            contentType: "post",
                            contentId: "uuid-here",
                            reason: "spam",
                            description: "This is spam content"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/report-content",
                        "host": ["{{base_url}}"],
                        "path": ["report-content"]
                    },
                    "description": "Report inappropriate content (post, comment, user, etc.)"
                }
            }
        ]
    },
    {
        "name": "22. Admin - Social Media Management",
        "description": "Admin endpoints for managing social media platform",
        "item": [
            {
                "name": "Admin Manage Users",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            userId: "uuid-here",
                            action: "suspend",
                            reason: "Violation of terms",
                            duration_days: 7
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/admin-manage-users",
                        "host": ["{{base_url}}"],
                        "path": ["admin-manage-users"]
                    },
                    "description": "Admin actions: suspend, unsuspend, ban, unban users"
                }
            },
            {
                "name": "Admin Manage Content",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            contentType: "post",
                            contentId: "uuid-here",
                            action: "remove",
                            reason: "Violates community guidelines"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/admin-manage-content",
                        "host": ["{{base_url}}"],
                        "path": ["admin-manage-content"]
                    },
                    "description": "Admin content moderation: remove, restore, flag content"
                }
            },
            {
                "name": "Admin Get Dashboard Stats",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/admin-get-dashboard-stats",
                        "host": ["{{base_url}}"],
                        "path": ["admin-get-dashboard-stats"]
                    },
                    "description": "Get comprehensive platform statistics for admin dashboard"
                }
            },
            {
                "name": "Admin Manage Vendors",
                "request": {
                    "method": "POST",
                    "header": stdHeaders,
                    "body": {
                        "mode": "raw",
                        "raw": JSON.stringify({
                            vendorId: "uuid-here",
                            action: "approve",
                            notes: "Verified documents"
                        }, null, 2)
                    },
                    "url": {
                        "raw": "{{base_url}}/admin-manage-vendors",
                        "host": ["{{base_url}}"],
                        "path": ["admin-manage-vendors"]
                    },
                    "description": "Admin vendor management: approve, reject, suspend vendors"
                }
            },
            {
                "name": "Admin Financial Reports",
                "request": {
                    "method": "GET",
                    "header": getHeaders,
                    "url": {
                        "raw": "{{base_url}}/admin-financial-reports?startDate=2024-01-01&endDate=2024-12-31",
                        "host": ["{{base_url}}"],
                        "path": ["admin-financial-reports"],
                        "query": [
                            { "key": "startDate", "value": "2024-01-01" },
                            { "key": "endDate", "value": "2024-12-31" }
                        ]
                    },
                    "description": "Get financial reports and analytics"
                }
            }
        ]
    }
];

// Add sections to collection
collection.item.push(...newSections);

// Write updated collection
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));

console.log('✅ Added 7 new sections to Postman collection:');
console.log('   - 16. Social Media - Posts & Feed (11 endpoints)');
console.log('   - 17. Social Media - Stories (4 endpoints)');
console.log('   - 18. Social Media - Friends & Connections (8 endpoints)');
console.log('   - 19. Social Media - Messaging (4 endpoints)');
console.log('   - 20. Social Media - Voice & Video Calls (5 endpoints)');
console.log('   - 21. Social Media - Support & Moderation (4 endpoints)');
console.log('   - 22. Admin - Social Media Management (5 endpoints)');
console.log('');
console.log('📊 Total endpoints added: 41');
console.log('');
console.log('🎯 All social media and calls endpoints are now documented!');
