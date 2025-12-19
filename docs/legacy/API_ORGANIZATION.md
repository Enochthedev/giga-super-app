# Giga API Organization Structure

## 📂 Module Categories

### 1. **Authentication & User Management**

- `get-current-profile` - Get authenticated user's profile
- `get-user-profile` - Get any user's public profile
- `update-user-profile` - Update user profile information
- `upload-profile-picture` - Upload user avatar
- `add-user-address` - Add delivery/billing address
- `apply-for-role` - Request role upgrade (vendor, admin)
- `review-role-application` - Admin reviews role requests
- `switch-role` - Switch between user roles
- `apply-vendor` - Vendor application workflow

### 2. **Hotel Discovery & Search**

- `Search-hotels` - Search hotels with filters (location, price, amenities)
- `Get-hotel-details` - Get detailed hotel information
- `check-room-availability` - Check room availability for dates
- `get-hotel-reviews` - Get paginated hotel reviews
- `get-user-favorites` - Get user's favorite hotels
- `add-hotel-to-favorites` - Add hotel to favorites
- `remove-hotel-from-favorites` - Remove from favorites

### 3. **Hotel Management (Vendor)**

- `create-hotel` - Create new hotel listing
- `update-hotel` - Update hotel information
- `delete-hotel` - Soft delete hotel
- `create-room-type` - Add room types to hotel
- `get-hotel-analytics` - Revenue, occupancy, and performance metrics

### 4. **Booking Management**

#### Guest Operations

- `Calculate-booking-price` - Calculate booking total with taxes/fees
- `Create-booking` - Create new booking
- `Get-user-bookings` - Get user's booking history
- `get-booking-details` - Get detailed booking information
- `cancel-booking` - Cancel booking with refund calculation
- `validate-hotel-promo-code` - Validate and apply promo code

#### Hotel Operations

- `update-booking-status` - Update booking status (confirmed, cancelled, etc.)
- `check-in-guest` - Check in guest at hotel
- `Checkout-guest` - Check out guest

### 5. **Reviews & Ratings**

- `create-hotel-review` - Submit review after checkout
- `get-hotel-reviews` - Get paginated reviews with filters
- `respond-to-review` - Hotel owner responds to review

### 6. **Payment & Wallet**

#### Payment Processing

- `Initialize-payment` - Initialize payment with provider
- `Initialize-payment-with-mock` - Test payment flow
- `Verify-payment` - Verify payment status
- `create-payment-intent` - Create Stripe payment intent
- `Paystack-webhook` - Handle Paystack webhooks
- `stripe-webhook` - Handle Stripe webhooks
- `Mock-payment-webhook` - Mock webhook for testing

#### Wallet Operations

- `Topup-wallet` - Add funds to wallet
- `Pay-with-wallet` - Pay using wallet balance
- `Get-vendor-balance` - Get vendor earnings

#### Refunds & Payouts

- `Process-refund` - Process booking refund
- `Release-escrow` - Release funds from escrow
- `Create-payout-request` - Vendor requests payout
- `Admin-process-payout` - Admin processes payout

### 7. **Shopping Cart (Marketplace)**

- `add-to-cart` - Add item to cart
- `get-user-cart` - Get user's cart items
- `checkout-cart` - Checkout cart
- `send-order-confirmation` - Send order confirmation
- `sync-products-to-algolia` - Sync products to search

### 8. **Notifications**

- `send-notification` - Send push notification
- `queue-notification` - Queue notification for processing
- `batch-queue-notifications` - Batch queue notifications
- `process-notification-queue` - Process notification queue
- `get-notification-history` - Get user's notifications
- `update-notification-preferences` - Update notification settings
- `send-sms` - Send SMS notification

### 9. **Admin & Analytics**

- `admin-dashboard-stats` - Get dashboard statistics
- `get-hotel-analytics` - Hotel performance metrics

### 10. **Media & Files**

- `upload-file` - Generic file upload
- `upload-profile-picture` - Upload user avatar
- `process-image` - Process/optimize images

---

## 📊 Function Count by Module

| Module                | Count  | Status           |
| --------------------- | ------ | ---------------- |
| Authentication & User | 9      | ✅ Complete      |
| Hotel Discovery       | 7      | ✅ Complete      |
| Hotel Management      | 5      | 🟡 Partial (75%) |
| Booking Management    | 9      | ✅ Complete      |
| Reviews & Ratings     | 3      | ✅ Complete      |
| Payment & Wallet      | 12     | ✅ Complete      |
| Shopping Cart         | 5      | ✅ Complete      |
| Notifications         | 7      | ✅ Complete      |
| Admin                 | 2      | 🟡 Partial       |
| Media                 | 3      | ✅ Complete      |
| **TOTAL**             | **62** | **90%**          |

---

## 🎯 Recommended Folder Structure

Currently all functions are in flat structure. Consider organizing like:

```
functions/
├── auth/
│   ├── get-current-profile/
│   ├── update-user-profile/
│   └── switch-role/
├── hotels/
│   ├── discovery/
│   │   ├── search-hotels/
│   │   └── get-hotel-details/
│   ├── management/
│   │   ├── create-hotel/
│   │   └── update-hotel/
│   └── reviews/
│       ├── create-hotel-review/
│       └── get-hotel-reviews/
├── bookings/
│   ├── create-booking/
│   ├── cancel-booking/
│   └── get-booking-details/
├── payments/
│   ├── wallet/
│   ├── providers/
│   └── webhooks/
├── notifications/
└── admin/
```

**Note**: Restructuring is optional. Postman organization doesn't require folder
changes.
