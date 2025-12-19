# Edge Functions Summary

## Overview

Complete set of edge functions for the Giga platform covering all modules.

## Admin Functions

### admin-get-dashboard-stats

- **Method**: GET
- **Auth**: Required (Admin only)
- **Description**: Get platform-wide statistics for admin dashboard
- **Returns**: User count, hotels, bookings, orders, rides, revenue

### admin-manage-users

- **Method**: POST
- **Auth**: Required (Admin only)
- **Actions**: suspend, activate, update
- **Description**: Manage user accounts

### admin-manage-vendors

- **Method**: POST
- **Auth**: Required (Admin only)
- **Actions**: verify, suspend, update_commission
- **Description**: Manage vendor accounts and settings

### admin-manage-content

- **Method**: POST
- **Auth**: Required (Admin only)
- **Actions**: remove, restore
- **Description**: Moderate content (posts, products, hotels, reviews)

### admin-financial-reports

- **Method**: GET
- **Auth**: Required (Admin only)
- **Query Params**: start_date, end_date, module
- **Description**: Generate financial reports and revenue analytics

### admin-approve-campaign

- **Method**: POST
- **Auth**: Required (Admin only)
- **Actions**: approve, reject
- **Description**: Approve or reject ad campaigns

### Admin-process-payout (existing)

- Process vendor payout requests

## Support Functions

### create-support-ticket

- **Method**: POST
- **Auth**: Required
- **Body**: subject, description, category, priority, module_name, reference_id,
  attachments
- **Description**: Create a new support ticket

### reply-to-ticket

- **Method**: POST
- **Auth**: Required
- **Body**: ticketId, message, attachments, isInternalNote
- **Description**: Reply to a support ticket (customer or staff)

### get-my-tickets

- **Method**: GET
- **Auth**: Required
- **Query Params**: status
- **Description**: Get user's support tickets

## Social Media Functions

### create-social-post

- **Method**: POST
- **Auth**: Required
- **Body**: content, media_urls, post_type, visibility, location,
  feeling_activity, tagged_users, shared_post_id
- **Description**: Create a new social media post

### get-social-feed

- **Method**: GET
- **Auth**: Required
- **Query Params**: limit, offset
- **Description**: Get personalized social feed based on connections

### like-post

- **Method**: POST
- **Auth**: Required
- **Body**: postId, reactionType
- **Description**: Like/unlike a post

### comment-on-post

- **Method**: POST
- **Auth**: Required
- **Body**: postId, content, parentCommentId
- **Description**: Comment on a post or reply to a comment

### send-friend-request

- **Method**: POST
- **Auth**: Required
- **Body**: targetUserId, connectionType
- **Description**: Send a friend/connection request

### respond-to-friend-request

- **Method**: POST
- **Auth**: Required
- **Body**: connectionId, action (accept/decline)
- **Description**: Respond to a friend request

## Messaging Functions

### create-conversation

- **Method**: POST
- **Auth**: Required
- **Body**: participantIds, conversationType, name, description
- **Description**: Create a new conversation (direct or group)

### send-message

- **Method**: POST
- **Auth**: Required
- **Body**: conversationId, messageType, content, mediaUrl, replyToId
- **Description**: Send a message in a conversation

### get-conversations

- **Method**: GET
- **Auth**: Required
- **Description**: Get user's conversations

### get-messages

- **Method**: GET
- **Auth**: Required
- **Query Params**: conversation_id, limit, before
- **Description**: Get messages from a conversation

## Advertising Functions

### create-ad-campaign

- **Method**: POST
- **Auth**: Required (Advertiser only)
- **Body**: campaignName, campaignType, description, budget, dailyBudget,
  startDate, endDate, targetAudience, creativeAssets, landingUrl
- **Description**: Create a new ad campaign

### get-my-campaigns

- **Method**: GET
- **Auth**: Required (Advertiser only)
- **Description**: Get advertiser's campaigns

## Hotel Functions (Existing)

- Search-hotels
- Get-hotel-details
- check-room-availability
- Calculate-booking-price
- Create-booking
- Get-user-bookings
- cancel-booking
- update-booking-status
- check-in-guest
- Checkout-guest
- create-hotel
- update-hotel
- delete-hotel
- create-room-type
- update-room-type
- delete-room-type
- get-hotel-reviews
- create-hotel-review
- respond-to-review
- mark-review-helpful
- add-hotel-to-favorites
- remove-hotel-from-favorites
- get-user-favorites
- get-recommended-hotels
- get-booking-details
- get-hotel-analytics
- get-booking-calendar
- analyze-booking-risk
- bulk-update-pricing
- calculate-dynamic-price
- create-hotel-promo-code
- validate-hotel-promo-code
- modify-booking
- update-room-availability
- check-hotel-integrity

## Payment Functions (Existing)

- Initialize-payment
- Initialize-payment-with-mock
- Paystack-webhook
- Mock-payment-webhook
- Verify-payment
- Process-refund
- Release-escrow
- Create-payout-request
- Pay-with-wallet
- Topup-wallet
- Get-vendor-balance

## Taxi/Ride Functions (Existing)

- request-ride
- accept-ride
- reject-ride
- start-ride
- complete-ride
- cancel-ride
- get-active-ride
- get-ride-estimate
- get-ride-requests
- get-ride-history
- get-ride-analytics
- rate-driver
- get-nearby-drivers
- verify-driver
- get-earnings
- toggle-availability
- update-location
- get-platform-settings
- update-platform-setting

## Ecommerce Functions (Existing)

- get-user-cart
- add-to-cart
- checkout-cart
- Checkout-guest
- apply-vendor

## User Profile Functions (Existing)

- get-user-profile
- get-current-profile
- update-user-profile
- upload-profile-picture
- add-user-address
- switch-role
- apply-for-role
- review-role-application

## File Management Functions (Existing)

- upload-file
- process-image

## Notification Functions (Existing)

- send-notification
- queue-notification
- process-notification-queue
- batch-queue-notifications
- update-notification-preferences
- get-notification-history

## Search & Discovery Functions (Existing)

- sync-products-to-algolia

## Payment Integration Functions (Existing)

- create-payment-intent
- stripe-webhook
- send-order-confirmation
- send-sms

## Missing Functions (Recommended to Add)

### Analytics & Reporting

- get-user-analytics
- get-vendor-analytics
- get-platform-analytics

### Content Moderation

- report-content
- review-reported-content

### Notifications

- get-in-app-notifications
- mark-notification-read

### Search

- global-search
- search-users
- search-products

### Reviews & Ratings

- get-user-reviews
- flag-review

### Wallet & Transactions

- get-wallet-transactions
- get-transaction-history

### Admin Tools

- get-audit-logs
- export-data
- bulk-operations

## Deployment Notes

All functions require:

- Supabase URL and Anon Key in environment
- JWT authentication via Authorization header
- Proper RLS policies on database tables

## Testing

Use Postman collection in `/postman` directory for testing all endpoints.

## Security Considerations

1. All functions validate user authentication
2. Role-based access control implemented
3. Input validation on all endpoints
4. Rate limiting should be configured at API gateway level
5. Sensitive operations require admin privileges
6. Audit logging for critical actions
