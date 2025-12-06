# API Changelog

All notable changes to the Giga API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### To Do
- Create automated test scripts
- Add API versioning strategy
- Implement rate limiting documentation

## [1.2.0] - 2025-11-30

### Added - Advanced Taxi Features (8 new functions)

#### Riders (3 endpoints)
- `get-ride-history` - List past rides with pagination and role-based filtering
- `rate-driver` - Submit rating and review for completed rides
- `get-nearby-drivers` - View available drivers on map (wrapper for PostGIS RPC)

#### Drivers (3 endpoints)
- `get-ride-requests` - List pending ride requests
- `get-earnings` - View earnings history and summary
- `reject-ride` - Explicitly decline a ride request

#### Admin (2 endpoints)
- `verify-driver` - Approve driver documents/status
- `get-ride-analytics` - Platform stats (rides, drivers, revenue)

### Changed
- `request-ride` - Fixed to use `passenger_id` column instead of `rider_id`

## [1.1.0] - 2025-11-30

### Added - Taxi/Ride Service (11 new functions)

#### Riders (4 endpoints)
- `get-ride-estimate` - Calculate fare estimates with Google Maps integration, surge pricing support
- `request-ride` - Request new rides with driver matching and notifications
- `get-active-ride` - Retrieve current active ride with real-time driver location
- `cancel-ride` - Cancel rides with automatic fee calculation based on grace period

#### Drivers (5 endpoints)
- `toggle-availability` - Go online/offline - set driver availability status
- `update-location` - Update driver's real-time GPS location (lat, lng, heading, speed)
- `accept-ride` - Accept ride requests with driver verification and ETA calculation
- `start-ride` - Initiate ride when driver picks up passenger
- `complete-ride` - Complete rides with final fare calculation and payment processing

#### Platform Settings (2 endpoints)
- `get-platform-settings` - Retrieve platform configuration (pricing, commission, settings)
- `update-platform-setting` - Update platform settings (admin only - clearance level 4+)

### Changed
- Postman collection now includes 90+ endpoints across 13 modules
- All 84 edge functions are now deployed and active

### Fixed
- `Get-hotel-details` - Redeployed to fix PostgREST filter parsing issue with UUID parameters

## [1.0.0] - 2024-11-22

### Added - Hotel Management (15 new functions)
- `cancel-booking` - Cancel bookings with automatic refund calculation
- `update-booking-status` - Change booking status with history tracking
- `create-hotel-review` - Submit reviews after checkout
- `get-hotel-reviews` - Fetch paginated reviews with filtering
- `validate-hotel-promo-code` - Verify and calculate promo discounts
- `create-hotel` - Add new hotel listings (requires approval)
- `update-hotel` - Modify hotel details
- `delete-hotel` - Soft delete hotels
- `create-room-type` - Add room types to hotels
- `add-hotel-to-favorites` - Save hotels to favorites
- `remove-hotel-from-favorites` - Remove from favorites
- `get-user-favorites` - Get user's favorite hotels list
- `get-booking-details` - Fetch complete booking information
- `respond-to-review` - Hotel owners respond to reviews
- `get-hotel-analytics` - Revenue, occupancy, and performance metrics

### Added - Documentation
- Comprehensive Postman collection with 49 endpoints
- Production and Local environment configurations
- API organization guide with 10 modules
- Quick reference guide with common workflows
- Auto-generated API reference
- Documentation generator script
- CHANGELOG for tracking changes

### Changed
- Organized all 61 functions into logical modules
- Standardized request/response formats
- Improved error handling across all endpoints

## [0.9.0] - Previous Release

### Existing Functions (46 total)

#### Authentication & User (7 functions)
- `get-current-profile`
- `get-user-profile`
- `update-user-profile`
- `upload-profile-picture`
- `add-user-address`
- `apply-for-role`
- `switch-role`

#### Hotel Search (4 functions)
- `Search-hotels`
- `Get-hotel-details`
- `check-room-availability`

#### Booking (4 functions)
- `Calculate-booking-price`
- `Create-booking`
- `Get-user-bookings`
- `check-in-guest`
- `Checkout-guest`

#### Payment & Wallet (11 functions)
- `Initialize-payment`
- `Verify-payment`
- `Topup-wallet`
- `Pay-with-wallet`
- `Get-vendor-balance`
- `Process-refund`
- `Create-payout-request`
- `Admin-process-payout`
- `Initialize-payment-with-mock`
- `create-payment-intent`
- `Release-escrow`

#### Notifications (7 functions)
- `send-notification`
- `queue-notification`
- `batch-queue-notifications`
- `process-notification-queue`
- `get-notification-history`
- `update-notification-preferences`
- `send-sms`

#### Shopping Cart (5 functions)
- `add-to-cart`
- `get-user-cart`
- `checkout-cart`
- `send-order-confirmation`
- `sync-products-to-algolia`

#### Admin (2 functions)
- `admin-dashboard-stats`
- `review-role-application`

#### Media (2 functions)
- `upload-file`
- `process-image`

#### Webhooks (3 functions)
- `Paystack-webhook`
- `stripe-webhook`
- `Mock-payment-webhook`

---

## Change Categories

### 🎉 Added
New features, endpoints, or functionality.

### ✏️ Changed
Changes to existing functionality (non-breaking).

### 🔧 Fixed
Bug fixes.

### 🚨 Breaking Changes
Changes that require client updates.

### 🗑️ Deprecated
Features that will be removed in future versions.

### ❌ Removed
Features that have been removed.

### 🔒 Security
Security-related changes.

---

## Version Guidelines

- **Major (X.0.0)**: Breaking changes, major new features
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, minor improvements

---

## Maintenance Notes

### When to Update This File

1. **Adding new endpoints** - Document under "Unreleased" → "Added"
2. **Modifying endpoints** - Document under "Unreleased" → "Changed"
3. **Breaking changes** - Document under "Unreleased" → "Breaking Changes"
4. **Before release** - Move "Unreleased" items to new version section

### Update Process

1. Make code changes
2. Update this CHANGELOG
3. Update Postman collection
4. Run `node scripts/generate-api-docs.js`
5. Update version in `postman/Giga-API-Collection.postman_collection.json`
6. Commit changes

---

**Note**: This changelog is manually maintained. Consider using conventional commits and automated changelog generation tools for larger projects.
