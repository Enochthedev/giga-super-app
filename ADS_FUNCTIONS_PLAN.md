# Giga Ads Service - Edge Functions Plan

## Overview
Advertising platform allowing businesses to create campaigns, target users, and track performance. Includes advertiser profile management and admin approval workflows.

---

## Advertiser Functions

### 1. **create-advertiser-profile**
- **Method**: POST
- **Purpose**: Register a user as an advertiser
- **Input**: `company_name`, `industry`, `website`
- **Output**: Created profile

### 2. **get-advertiser-profile**
- **Method**: GET
- **Purpose**: Get current user's advertiser profile
- **Output**: Profile details with stats

### 3. **create-ad-campaign**
- **Method**: POST
- **Purpose**: Create a new ad campaign
- **Input**: 
  - `campaign_name`, `campaign_type`
  - `budget`, `daily_budget`
  - `start_date`, `end_date`
  - `target_audience` (JSON)
  - `creative_assets` (JSON)
- **Logic**:
  - Validate budget and dates
  - Set status to 'draft' or 'pending_approval'
  - Generate campaign number

### 4. **update-ad-campaign**
- **Method**: POST
- **Purpose**: Update campaign details or status
- **Input**: `campaign_id`, `status` (active/paused), `budget`, etc.
- **Logic**:
  - Check ownership
  - Update allowed fields
  - Log changes

### 5. **get-ad-campaigns**
- **Method**: GET
- **Purpose**: List advertiser's campaigns
- **Query**: `status`, `page`, `limit`
- **Output**: List of campaigns with summary stats

### 6. **get-ad-analytics**
- **Method**: GET
- **Purpose**: Get detailed performance metrics
- **Input**: `campaign_id`, `date_range`
- **Output**: Impressions, clicks, CTR, spend over time

---

## System/User Functions

### 7. **fetch-ads**
- **Method**: POST
- **Purpose**: Get relevant ads for a user placement
- **Input**: `placement_type`, `user_context`
- **Logic**:
  - Find active campaigns matching targeting
  - Select ads based on bid/budget (simplified logic initially)
  - Return ad creatives

### 8. **track-ad-event**
- **Method**: POST
- **Purpose**: Record impression or click
- **Input**: `campaign_id`, `event_type` (impression/click)
- **Logic**:
  - Update campaign stats (atomic increment)
  - Update spent amount (if CPC/CPM)
  - Log for analytics

---

## Admin Functions

### 9. **approve-ad-campaign**
- **Method**: POST
- **Purpose**: Approve or reject a submitted campaign
- **Input**: `campaign_id`, `decision` (approve/reject), `reason`
- **Logic**:
  - Update status
  - Notify advertiser

---

## Database Schema (Existing)
- `ad_campaigns`
- `advertiser_profiles`
- `admin_approvals` (for campaign approval)

## Next Steps
1. Create Edge Functions for Advertiser operations.
2. Create Edge Functions for Ad Serving & Tracking.
3. Update Postman Collection.
