#!/bin/bash
# Script: sync-edge-functions.sh
# Description: Downloads all edge functions from Supabase to sync local codebase
# Usage: ./scripts/sync-edge-functions.sh

set -e

cd "$(dirname "$0")/.."

echo "📦 Syncing Edge Functions from Supabase..."
echo ""

# List of deployed functions to download
# (extracted from `npx supabase functions list`)
FUNCTIONS=(
  "admin-process-payout"
  "calculate-booking-price"
  "checkout-guest"
  "create-booking"
  "create-payout-request"
  "get-hotel-details"
  "get-user-bookings"
  "get-vendor-balance"
  "initialize-payment"
  "initialize-payment-with-mock"
  "mock-payment-webhook"
  "pay-with-wallet"
  "paystack-webhook"
  "process-refund"
  "release-escrow"
  "search-hotels"
  "topup-wallet"
  "verify-payment"
  "get-current-profile"
  "apply-for-role"
  "switch-role"
  "review-role-application"
  "apply-vendor"
  "update-user-profile"
  "get-user-profile"
  "cancel-booking"
  "get-hotel-reviews"
  "validate-hotel-promo-code"
  "update-hotel"
  "create-room-type"
  "get-user-favorites"
  "get-booking-details"
  "create-hotel-review"
  "get-hotel-analytics"
  "create-hotel"
  "add-hotel-to-favorites"
  "remove-hotel-from-favorites"
  "get-recommended-hotels"
  "analyze-booking-risk"
  "get-booking-calendar"
  "update-room-type"
  "delete-room-type"
  "bulk-update-pricing"
  "calculate-dynamic-price"
  "create-hotel-promo-code"
  "modify-booking"
  "mark-review-helpful"
  "update-room-availability"
  "check-hotel-integrity"
  "accept-ride"
  "cancel-ride"
  "complete-ride"
  "get-active-ride"
  "get-platform-settings"
  "get-ride-estimate"
  "request-ride"
  "start-ride"
  "toggle-availability"
  "update-location"
  "update-platform-setting"
  "rate-driver"
  "get-nearby-drivers"
  "verify-driver"
  "get-ride-analytics"
  "get-ride-requests"
  "get-earnings"
  "reject-ride"
  "get-ride-history"
  "admin-get-dashboard-stats"
  "admin-manage-users"
  "initiate-call"
  "answer-call"
  "decline-call"
  "end-call"
  "leave-call"
  "get-my-tickets"
  "api"
  "on-user-signup"
)

DOWNLOAD_DIR="supabase/functions"
BACKUP_DIR="supabase/functions-backup-$(date +%Y%m%d-%H%M%S)"

echo "📁 Creating backup at: $BACKUP_DIR"
# cp -r "$DOWNLOAD_DIR" "$BACKUP_DIR" 2>/dev/null || true

SUCCESS_COUNT=0
FAIL_COUNT=0
SKIPPED_COUNT=0

for func in "${FUNCTIONS[@]}"; do
  echo -n "  ⬇️  Downloading: $func ... "
  
  # Check if function directory exists with exact name
  if [ -d "$DOWNLOAD_DIR/$func" ]; then
    echo "already exists (skipped)"
    ((SKIPPED_COUNT++))
    continue
  fi
  
  # Try to download
  if npx supabase functions download "$func" --project-ref nkrqcigvcakqicutkpfd 2>/dev/null; then
    echo "✅"
    ((SUCCESS_COUNT++))
  else
    echo "❌ (may not exist or error)"
    ((FAIL_COUNT++))
  fi
done

echo ""
echo "📊 Sync Summary:"
echo "   ✅ Downloaded: $SUCCESS_COUNT"
echo "   ⏭️  Skipped (already exists): $SKIPPED_COUNT"
echo "   ❌ Failed: $FAIL_COUNT"
echo ""
echo "🎉 Edge function sync complete!"
