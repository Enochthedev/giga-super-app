# Giga API Reference

> Auto-generated on 2025-11-22T10:08:56.658Z

**Total Endpoints:** 72

## Table of Contents

- [6. Payment & Wallet](#6-payment-wallet)
- [4. Booking Management](#4-booking-management)
- [2. Hotel Discovery & Search](#2-hotel-discovery-search)
- [Webhooks](#webhooks)
- [9. Shopping Cart (Marketplace)](#9-shopping-cart-marketplace-)
- [1. Authentication & User Management](#1-authentication-user-management)
- [8. Admin & Analytics](#8-admin-analytics)
- [7. Notifications](#7-notifications)
- [3. Hotel Management (Vendor)](#3-hotel-management-vendor-)
- [5. Reviews & Ratings](#5-reviews-ratings)
- [10. Media & Files](#10-media-files)

---

## 6. Payment & Wallet

**Endpoints:** 11

### Admin-process-payout

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Admin-process-payout`
- **Auth Required:** Yes

### Create-payout-request

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Create-payout-request`
- **Auth Required:** Yes

### Get-vendor-balance

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/Get-vendor-balance`
- **Auth Required:** Yes

### Initialize-payment

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Initialize-payment`
- **Auth Required:** Yes

### Initialize-payment-with-mock

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Initialize-payment-with-mock`
- **Auth Required:** Yes

### Pay-with-wallet

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Pay-with-wallet`
- **Auth Required:** Yes

### Process-refund

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Process-refund`
- **Auth Required:** Yes

### Release-escrow

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Release-escrow`
- **Auth Required:** Yes

### Topup-wallet

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Topup-wallet`
- **Auth Required:** Yes

### Verify-payment

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Verify-payment`
- **Auth Required:** Yes

### create-payment-intent

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/create-payment-intent`
- **Auth Required:** Yes

## 4. Booking Management

**Endpoints:** 11

### Calculate-booking-price

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Calculate-booking-price`
- **Auth Required:** Yes

### Checkout-guest

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Checkout-guest`
- **Auth Required:** Yes

### Create-booking

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Create-booking`
- **Auth Required:** Yes

### Get-user-bookings

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/Get-user-bookings`
- **Auth Required:** Yes

### cancel-booking

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/cancel-booking`
- **Auth Required:** Yes

### check-in-guest

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/check-in-guest`
- **Auth Required:** Yes

### get-booking-calendar

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-booking-calendar`
- **Auth Required:** Yes

### get-booking-details

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-booking-details`
- **Auth Required:** Yes

### modify-booking

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/modify-booking`
- **Auth Required:** Yes

### update-booking-status

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/update-booking-status`
- **Auth Required:** Yes

### validate-hotel-promo-code

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/validate-hotel-promo-code`
- **Auth Required:** Yes

## 2. Hotel Discovery & Search

**Endpoints:** 8

### Get-hotel-details

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/Get-hotel-details`
- **Auth Required:** Yes

### Search-hotels

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Search-hotels`
- **Auth Required:** Yes

### add-hotel-to-favorites

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/add-hotel-to-favorites`
- **Auth Required:** Yes

### check-room-availability

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/check-room-availability`
- **Auth Required:** Yes

### get-hotel-reviews

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-hotel-reviews`
- **Auth Required:** Yes

### get-recommended-hotels

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-recommended-hotels`
- **Auth Required:** Yes

### get-user-favorites

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-user-favorites`
- **Auth Required:** Yes

### remove-hotel-from-favorites

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/remove-hotel-from-favorites`
- **Auth Required:** Yes

## Webhooks

**Endpoints:** 3

### Mock-payment-webhook

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Mock-payment-webhook`
- **Auth Required:** Yes

### Paystack-webhook

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/Paystack-webhook`
- **Auth Required:** Yes

### stripe-webhook

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/stripe-webhook`
- **Auth Required:** Yes

## 9. Shopping Cart (Marketplace)

**Endpoints:** 5

### add-to-cart

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/add-to-cart`
- **Auth Required:** Yes

### checkout-cart

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/checkout-cart`
- **Auth Required:** Yes

### get-user-cart

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-user-cart`
- **Auth Required:** Yes

### send-order-confirmation

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/send-order-confirmation`
- **Auth Required:** Yes

### sync-products-to-algolia

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/sync-products-to-algolia`
- **Auth Required:** Yes

## 1. Authentication & User Management

**Endpoints:** 8

### add-user-address

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/add-user-address`
- **Auth Required:** Yes

### apply-for-role

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/apply-for-role`
- **Auth Required:** Yes

### apply-vendor

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/apply-vendor`
- **Auth Required:** Yes

### get-current-profile

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-current-profile`
- **Auth Required:** Yes

### get-user-profile

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-user-profile`
- **Auth Required:** Yes

### switch-role

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/switch-role`
- **Auth Required:** Yes

### update-user-profile

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/update-user-profile`
- **Auth Required:** Yes

### upload-profile-picture

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/upload-profile-picture`
- **Auth Required:** Yes

## 8. Admin & Analytics

**Endpoints:** 3

### admin-dashboard-stats

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/admin-dashboard-stats`
- **Auth Required:** Yes

### analyze-booking-risk

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/analyze-booking-risk`
- **Auth Required:** Yes

### review-role-application

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/review-role-application`
- **Auth Required:** Yes

## 7. Notifications

**Endpoints:** 7

### batch-queue-notifications

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/batch-queue-notifications`
- **Auth Required:** Yes

### get-notification-history

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-notification-history`
- **Auth Required:** Yes

### process-notification-queue

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/process-notification-queue`
- **Auth Required:** Yes

### queue-notification

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/queue-notification`
- **Auth Required:** Yes

### send-notification

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/send-notification`
- **Auth Required:** Yes

### send-sms

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/send-sms`
- **Auth Required:** Yes

### update-notification-preferences

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/update-notification-preferences`
- **Auth Required:** Yes

## 3. Hotel Management (Vendor)

**Endpoints:** 11

### bulk-update-pricing

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/bulk-update-pricing`
- **Auth Required:** Yes

### calculate-dynamic-price

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/calculate-dynamic-price`
- **Auth Required:** Yes

### create-hotel

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/create-hotel`
- **Auth Required:** Yes

### create-hotel-promo-code

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/create-hotel-promo-code`
- **Auth Required:** Yes

### create-room-type

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/create-room-type`
- **Auth Required:** Yes

### delete-hotel

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/delete-hotel`
- **Auth Required:** Yes

### delete-room-type

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/delete-room-type`
- **Auth Required:** Yes

### get-hotel-analytics

- **Method:** `GET`
- **Endpoint:** `{{base_url}}/get-hotel-analytics`
- **Auth Required:** Yes

### update-hotel

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/update-hotel`
- **Auth Required:** Yes

### update-room-availability

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/update-room-availability`
- **Auth Required:** Yes

### update-room-type

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/update-room-type`
- **Auth Required:** Yes

## 5. Reviews & Ratings

**Endpoints:** 3

### create-hotel-review

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/create-hotel-review`
- **Auth Required:** Yes

### mark-review-helpful

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/mark-review-helpful`
- **Auth Required:** Yes

### respond-to-review

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/respond-to-review`
- **Auth Required:** Yes

## 10. Media & Files

**Endpoints:** 2

### process-image

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/process-image`
- **Auth Required:** Yes

### upload-file

- **Method:** `POST`
- **Endpoint:** `{{base_url}}/upload-file`
- **Auth Required:** Yes

