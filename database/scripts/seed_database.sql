-- ============================================================================
-- GIGA PLATFORM - DATABASE SEEDING (PRODUCTION-READY)
-- ============================================================================
-- This script can be run multiple times safely (idempotent)
-- Run in Supabase SQL Editor or via: psql -f seed_database.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SEED NIPOST REGIONS (HIERARCHICAL - CONTINENTS TO CITIES)
-- ============================================================================

-- Insert Continents
INSERT INTO public.nipost_regions (region_name, region_code, region_type, timezone, currency, languages, is_active) VALUES
('Africa', 'AF', 'continent', 'UTC', NULL, ARRAY['en', 'fr', 'ar', 'sw'], true),
('Europe', 'EU', 'continent', 'UTC', 'EUR', ARRAY['en', 'fr', 'de', 'es', 'it'], true),
('Asia', 'AS', 'continent', 'UTC', NULL, ARRAY['en', 'zh', 'hi', 'ar', 'ja'], true),
('North America', 'NA', 'continent', 'UTC', 'USD', ARRAY['en', 'es', 'fr'], true),
('South America', 'SA', 'continent', 'UTC', NULL, ARRAY['es', 'pt', 'en'], true)
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

-- Insert Countries under Africa
INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, country_code, timezone, currency, languages, is_active) 
SELECT 
    'Nigeria',
    'NG',
    'country',
    id,
    'NG',
    'Africa/Lagos',
    'NGN',
    ARRAY['en', 'yo', 'ig', 'ha'],
    true
FROM public.nipost_regions WHERE region_code = 'AF'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, country_code, timezone, currency, languages, is_active) 
SELECT 
    'Ghana',
    'GH',
    'country',
    id,
    'GH',
    'Africa/Accra',
    'GHS',
    ARRAY['en'],
    true
FROM public.nipost_regions WHERE region_code = 'AF'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, country_code, timezone, currency, languages, is_active)
SELECT 
    'Kenya',
    'KE',
    'country',
    id,
    'KE',
    'Africa/Nairobi',
    'KES',
    ARRAY['en', 'sw'],
    true
FROM public.nipost_regions WHERE region_code = 'AF'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

-- Insert States under Nigeria
INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, timezone, is_active) 
SELECT 
    'Lagos',
    'LOS',
    'state',
    id,
    'Africa/Lagos',
    true
FROM public.nipost_regions WHERE region_code = 'NG'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, timezone, is_active) 
SELECT 
    'Abuja FCT',
    'ABJ',
    'state',
    id,
    'Africa/Lagos',
    true
FROM public.nipost_regions WHERE region_code = 'NG'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, timezone, is_active)
SELECT 
    'Rivers',
    'RIV',
    'state',
    id,
    'Africa/Lagos',
    true
FROM public.nipost_regions WHERE region_code = 'NG'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

-- Insert Cities under Lagos
INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, timezone, is_active) 
SELECT 
    'Ikeja',
    'IKJ',
    'city',
    id,
    'Africa/Lagos',
    true
FROM public.nipost_regions WHERE region_code = 'LOS'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, timezone, is_active) 
SELECT 
    'Victoria Island',
    'VI',
    'city',
    id,
    'Africa/Lagos',
    true
FROM public.nipost_regions WHERE region_code = 'LOS'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_regions (region_name, region_code, region_type, parent_region_id, timezone, is_active)
SELECT 
    'Lekki',
    'LEK',
    'city',
    id,
    'Africa/Lagos',
    true
FROM public.nipost_regions WHERE region_code = 'LOS'
ON CONFLICT (region_code) DO UPDATE SET
    region_name = EXCLUDED.region_name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 2. SEED NIPOST OFFICES
-- ============================================================================

INSERT INTO public.nipost_offices (
    office_code, office_name, region_id, office_type, address, city, state_province, 
    country, postal_code, phone_numbers, email_addresses, operating_hours, 
    services_offered, is_24_7, is_active
) 
SELECT 
    'HQ-LAG',
    'Lagos Headquarters',
    id,
    'headquarters',
    '123 Broad Street, Marina',
    'Lagos',
    'Lagos',
    'Nigeria',
    '100001',
    ARRAY['+234-1-1234567', '+234-1-1234568'],
    ARRAY['lagos.hq@nipost.ng'],
    '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "14:00"}}'::jsonb,
    ARRAY['parcel', 'logistics', 'financial', 'government'],
    false,
    true
FROM public.nipost_regions WHERE region_code = 'IKJ'
ON CONFLICT (office_code) DO UPDATE SET
    office_name = EXCLUDED.office_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_offices (
    office_code, office_name, region_id, office_type, address, city, state_province,
    country, postal_code, phone_numbers, email_addresses, operating_hours,
    services_offered, is_24_7, is_active
)
SELECT 
    'ABJ-MAIN',
    'Abuja Main Office',
    id,
    'regional_hq',
    '456 Central Business District',
    'Abuja',
    'FCT',
    'Nigeria',
    '900001',
    ARRAY['+234-9-8765432'],
    ARRAY['abuja.main@nipost.ng'],
    '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "17:00"}}'::jsonb,
    ARRAY['parcel', 'logistics', 'government'],
    false,
    true
FROM public.nipost_regions WHERE region_code = 'ABJ'
ON CONFLICT (office_code) DO UPDATE SET
    office_name = EXCLUDED.office_name,
    is_active = EXCLUDED.is_active;

INSERT INTO public.nipost_offices (
    office_code, office_name, region_id, office_type, address, city, state_province,
    country, postal_code, phone_numbers, email_addresses, operating_hours,
    services_offered, is_24_7, is_active
)
SELECT 
    'VI-EXPRESS',
    'Victoria Island Express Center',
    id,
    'processing_center',
    '12 Adeola Odeku Street',
    'Lagos',
    'Lagos',
    'Nigeria',
    '101241',
    ARRAY['+234-1-9876543'],
    ARRAY['vi.express@nipost.ng'],
    '{"monday": {"open": "07:00", "close": "21:00"}}'::jsonb,
    ARRAY['express_delivery', 'parcel', 'logistics'],
    true,
    true
FROM public.nipost_regions WHERE region_code = 'VI'
ON CONFLICT (office_code) DO UPDATE SET
    office_name = EXCLUDED.office_name,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 3. SEED ADMIN PERMISSIONS
-- ============================================================================

INSERT INTO public.admin_permissions (permission_code, permission_name, module_name, description, min_clearance_level, required_department, is_global) VALUES
('user_manage', 'Manage Users', 'users', 'Can view, edit, and suspend user accounts', 3, ARRAY['management', 'compliance'], false),
('content_moderate', 'Moderate Content', 'content', 'Can approve or remove user-generated content', 2, ARRAY['compliance', 'customer_service'], false),
('financial_approve', 'Approve Financial Transactions', 'finance', 'Can approve payouts and refunds', 4, ARRAY['finance', 'management'], false),
('vendor_verify', 'Verify Vendors', 'vendors', 'Can verify vendor accounts and documents', 3, ARRAY['compliance', 'operations'], false),
('support_escalate', 'Escalate Support Tickets', 'support', 'Can handle escalated support cases', 3, ARRAY['customer_service', 'management'], false),
('system_configure', 'Configure System Settings', 'system', 'Can modify platform configuration', 5, ARRAY['management', 'technical'], true),
('analytics_view', 'View Analytics', 'analytics', 'Can access platform analytics and reports', 2, ARRAY['management', 'operations'], false),
('audit_view', 'View Audit Logs', 'audit', 'Can view system audit logs', 4, ARRAY['management', 'audit'], true),
('hotel_approve', 'Approve Hotels', 'hotel', 'Can approve new hotel listings', 3, ARRAY['compliance', 'operations'], false),
('payout_process', 'Process Payouts', 'finance', 'Can initiate vendor payouts', 4, ARRAY['finance'], false)
ON CONFLICT (permission_code) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    description = EXCLUDED.description;

-- ============================================================================
-- 4. SEED NOTIFICATION TEMPLATES
-- ============================================================================

INSERT INTO public.notification_templates (name, description, category, channels, subject, email_body, sms_body, push_title, push_body, is_active, required_variables) VALUES
('welcome_email', 'Welcome Email for New Users', 'auth', ARRAY['email'], 'Welcome to Giga Platform! 🎉', '<h1>Welcome to Giga Platform!</h1><p>Hello {{name}},</p><p>Your account has been successfully created. We are excited to have you on board!</p><p>Start exploring our services:</p><ul><li>🏨 Book hotels</li><li>🛍️ Shop on our marketplace</li><li>🚗 Get rides</li><li>📢 Advertise your business</li></ul><p>Best regards,<br>Giga Platform Team</p>', NULL, NULL, NULL, true, ARRAY['name']),
('order_confirmation', 'Order Confirmation', 'order', ARRAY['email', 'sms', 'push'], 'Order Confirmed - #{{order_number}}', '<h1>Order Confirmed!</h1><p>Your order #{{order_number}} has been confirmed and is being processed.</p><p>Total Amount: ₦{{total_amount}}</p><p>Track your order in the app.</p>', 'Your order #{{order_number}} has been confirmed. Total: ₦{{total_amount}}. Track in app.', 'Order Confirmed', 'Your order #{{order_number}} is being processed', true, ARRAY['order_number', 'total_amount']),
('booking_confirmation', 'Hotel Booking Confirmation', 'booking', ARRAY['email', 'sms', 'push'], 'Booking Confirmed - {{hotel_name}}', '<h1>Booking Confirmed!</h1><p>Your reservation at {{hotel_name}} is confirmed.</p><p><strong>Check-in:</strong> {{check_in_date}}<br><strong>Check-out:</strong> {{check_out_date}}<br><strong>Room Type:</strong> {{room_type}}</p><p>Booking Number: {{booking_number}}</p>', 'Booking confirmed at {{hotel_name}}. Check-in: {{check_in_date}}. Booking #{{booking_number}}', 'Booking Confirmed', 'Your stay at {{hotel_name}} is confirmed', true, ARRAY['hotel_name', 'check_in_date', 'check_out_date', 'room_type', 'booking_number']),
('booking_reminder', 'Hotel Booking Reminder', 'booking', ARRAY['email', 'push'], 'Reminder: Check-in Tomorrow at {{hotel_name}}', '<h1>Booking Reminder</h1><p>Your check-in tomorrow at {{hotel_name}}!</p><p><strong>Check-in Time:</strong> {{check_in_time}}<br><strong>Address:</strong> {{hotel_address}}</p><p>See you soon!</p>', NULL, 'Check-in Tomorrow', 'Your booking at {{hotel_name}} is tomorrow at {{check_in_time}}', true, ARRAY['hotel_name', 'check_in_time', 'hotel_address']),
('ride_requested', 'Ride Request Notification for Driver', 'ride', ARRAY['push'], NULL, NULL, NULL, 'New Ride Request', 'New ride request from {{pickup_location}} to {{dropoff_location}}', true, ARRAY['pickup_location', 'dropoff_location']),
('ride_accepted', 'Ride Accepted by Driver', 'ride', ARRAY['push', 'sms'], NULL, NULL, 'Driver {{driver_name}} accepted your ride. Arrival in {{arrival_time}} mins.', 'Ride Accepted', 'Your ride has been accepted by {{driver_name}}', true, ARRAY['driver_name', 'arrival_time']),
('ride_arrived', 'Driver Arrived', 'ride', ARRAY['push'], NULL, NULL, NULL, 'Driver Arrived', 'Your driver has arrived at the pickup location', true, ARRAY[]::text[]),
('ride_completed', 'Ride Completed', 'ride', ARRAY['email', 'push'], 'Ride Completed - Thank You!', '<h1>Ride Completed</h1><p>Thank you for using Giga Rides!</p><p><strong>Fare:</strong> ₦{{fare}}<br><strong>Distance:</strong> {{distance}} km</p><p>Please rate your driver.</p>', NULL, 'Ride Completed', 'Thank you for riding with us! Fare: ₦{{fare}}', true, ARRAY['fare', 'distance']),
('payment_successful', 'Payment Successful', 'payment', ARRAY['email', 'sms'], 'Payment Successful - ₦{{amount}}', '<h1>Payment Successful</h1><p>Your payment of ₦{{amount}} was successful.</p><p><strong>Transaction ID:</strong> {{transaction_id}}<br><strong>Payment Method:</strong> {{payment_method}}</p>', 'Payment of ₦{{amount}} successful. Ref: {{transaction_id}}', 'Payment Successful', 'Your payment of ₦{{amount}} was successful', true, ARRAY['amount', 'transaction_id', 'payment_method']),
('payment_failed', 'Payment Failed', 'payment', ARRAY['email', 'push'], 'Payment Failed', '<h1>Payment Failed</h1><p>Your payment of ₦{{amount}} failed.</p><p><strong>Reason:</strong> {{reason}}</p><p>Please try again or use a different payment method.</p>', NULL, 'Payment Failed', 'Payment of ₦{{amount}} failed. Please try again.', true, ARRAY['amount', 'reason']),
('refund_processed', 'Refund Processed', 'payment', ARRAY['email', 'sms'], 'Refund Processed - ₦{{amount}}', '<h1>Refund Processed</h1><p>Your refund of ₦{{amount}} has been processed.</p><p>It will reflect in your account within 5-7 business days.</p>', 'Refund of ₦{{amount}} processed. Expect in 5-7 days.', 'Refund Processed', 'Your refund of ₦{{amount}} has been processed', true, ARRAY['amount']),
('support_reply', 'Support Ticket Reply', 'support', ARRAY['email', 'push'], 'New Reply to Your Support Ticket', '<h1>Support Ticket Update</h1><p>You have a new reply to your support ticket: {{ticket_subject}}</p><p>{{reply_preview}}</p><p>View full reply in the app.</p>', NULL, 'Support Reply', 'New reply to your support ticket', true, ARRAY['ticket_subject', 'reply_preview']),
('support_resolved', 'Support Ticket Resolved', 'support', ARRAY['email'], 'Your Support Ticket Has Been Resolved', '<h1>Ticket Resolved</h1><p>Your support ticket #{{ticket_number}} has been resolved.</p><p>If you need further assistance, please reopen the ticket or create a new one.</p>', NULL, NULL, NULL, true, ARRAY['ticket_number']),
('vendor_payout', 'Vendor Payout Notification', 'finance', ARRAY['email', 'sms'], 'Payout Processed - ₦{{amount}}', '<h1>Payout Processed</h1><p>Your payout of ₦{{amount}} has been processed and sent to your account.</p><p><strong>Account:</strong> {{account_number}}<br><strong>Bank:</strong> {{bank_name}}</p>', 'Payout of ₦{{amount}} sent to {{bank_name}} account {{account_number}}.', 'Payout Processed', 'Your payout of ₦{{amount}} has been sent', true, ARRAY['amount', 'account_number', 'bank_name'])
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 5. SEED SUPPORT ARTICLES
-- ============================================================================

INSERT INTO public.support_articles (title, slug, content, category, subcategory, tags, view_count, helpful_count, is_published, published_at) VALUES
('How to Create an Account', 'how-to-create-account', 
'# Creating Your Giga Platform Account

Creating an account on Giga Platform is simple and straightforward. Follow these steps to get started:

## Step 1: Download the App
Download the Giga Platform app from the App Store (iOS) or Google Play Store (Android).

## Step 2: Sign Up
1. Open the app and tap "Sign Up"
2. Enter your phone number or email address
3. Create a secure password
4. Complete your profile information

## Step 3: Verify Your Account
- Check your email or SMS for a verification code
- Enter the code in the app to verify your account

## Step 4: Start Using Giga!
Once verified, you can:
- Book hotels
- Shop on the marketplace
- Request rides
- And much more!

Welcome to Giga Platform! 🎉', 
'account', 'registration', ARRAY['account', 'signup', 'registration', 'getting started'], 150, 45, true, now()),

('Payment Methods Accepted', 'payment-methods', 
'# Accepted Payment Methods

We accept various payment methods to make your transactions convenient:

## Debit/Credit Cards
- Visa
- Mastercard
- Verve

## Bank Transfers
- Direct bank transfer
- USSD codes
- Bank apps

## Mobile Money
- Available in select countries

## Wallet
- Use your Giga Wallet for faster checkout
- Top up your wallet using any payment method

## Security
All payments are processed securely through encrypted channels.', 
'payment', 'methods', ARRAY['payment', 'billing', 'methods', 'cards'], 89, 23, true, now()),

('How to Track Your Order', 'track-order', 
'# Tracking Your Order

Stay updated on your delivery with real-time tracking:

## In the App
1. Go to "My Orders"
2. Select the order you want to track
3. View real-time status updates
4. See estimated delivery time

## Order Statuses
- **Pending**: Order received, awaiting processing
- **Processing**: Order is being prepared
- **Shipped**: Order is on its way
- **Out for Delivery**: Driver is nearby
- **Delivered**: Order completed

## Notifications
You will receive push notifications at each stage of delivery.', 
'order', 'tracking', ARRAY['order', 'tracking', 'delivery', 'status'], 203, 67, true, now()),

('Hotel Booking Cancellation Policy', 'hotel-cancellation', 
'# Hotel Booking Cancellation Policy

## Free Cancellation
- **48+ hours before check-in**: 100% refund
- **24-48 hours before check-in**: 50% refund
- **Less than 24 hours**: No refund

## How to Cancel
1. Go to "My Bookings"
2. Select the booking to cancel
3. Tap "Cancel Booking"
4. Confirm cancellation

## Refund Process
Refunds are processed within 5-7 business days to your original payment method.

## Special Cases
- Some hotels may have different policies
- Always check the specific hotel cancellation policy before booking', 
'booking', 'cancellation', ARRAY['hotel', 'booking', 'cancellation', 'refund'], 76, 18, true, now()),

('Driver Registration Process', 'driver-registration', 
'# Become a Giga Rides Driver

Start earning by driving with Giga Rides!

## Requirements
- Valid driver license
- Vehicle registration documents
- Insurance certificate
- Background check clearance
- Smartphone with internet

## Registration Steps
1. Download the Giga Driver app
2. Complete the application form
3. Upload required documents
4. Wait for verification (2-5 business days)
5. Attend orientation session
6. Start accepting rides!

## Earnings
- Keep 80% of each fare
- Weekly payouts
- Bonuses for high ratings
- Additional incentives

## Support
Contact driver support: drivers@gigaplatform.com', 
'driver', 'registration', ARRAY['driver', 'registration', 'earnings', 'requirements'], 45, 12, true, now()),

('Using Promo Codes', 'using-promo-codes',
'# How to Use Promo Codes

Save money on your purchases with promo codes!

## Where to Enter Promo Codes
- **Hotels**: During booking checkout
- **Marketplace**: In your shopping cart
- **Rides**: Before confirming ride

## Applying a Code
1. Enter the promo code in the designated field
2. Tap "Apply"
3. Discount will be reflected in the total

## Tips
- Codes are case-sensitive
- One code per transaction
- Check expiry dates
- Some codes have minimum purchase requirements

## Getting Codes
- Check your email for exclusive offers
- Follow us on social media
- Refer friends to earn codes',
'promo', 'discounts', ARRAY['promo', 'discount', 'codes', 'savings'], 92, 31, true, now())
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    is_published = EXCLUDED.is_published;

-- ============================================================================
-- 6. SEED HOTEL AMENITIES (SKIPPED - Already exists in database)
-- ============================================================================

-- NOTE: Hotel amenities already exist in your database
-- Uncomment below if you need to add them to a fresh database

/*
INSERT INTO public.hotel_amenities (name, slug, icon, category, description, is_active) VALUES
('Free WiFi', 'free-wifi', '📶', 'connectivity', 'Complimentary high-speed internet access', true),
('Swimming Pool', 'swimming-pool', '🏊', 'recreation', 'Outdoor or indoor swimming pool', true),
('Gym/Fitness Center', 'gym', '💪', 'recreation', 'Fully equipped fitness center', true),
('Restaurant', 'restaurant', '🍽️', 'dining', 'On-site restaurant serving meals', true),
('Free Parking', 'parking', '🅿️', 'transport', 'Free parking facilities', true),
('Air Conditioning', 'air-conditioning', '❄️', 'comfort', 'Air conditioned rooms', true),
('Room Service', 'room-service', '🛎️', 'service', '24-hour room service', true),
('Spa', 'spa', '💆', 'wellness', 'Spa and wellness center', true),
('Business Center', 'business-center', '💼', 'business', 'Business facilities and meeting rooms', true),
('Pet Friendly', 'pet-friendly', '🐕', 'policy', 'Pet-friendly accommodation', true),
('Airport Shuttle', 'airport-shuttle', '🚐', 'transport', 'Airport pickup and drop-off service', true),
('Bar/Lounge', 'bar', '🍸', 'dining', 'On-site bar or lounge', true),
('Laundry Service', 'laundry', '🧺', 'service', 'Laundry and dry cleaning', true),
('Conference Rooms', 'conference-rooms', '👥', 'business', 'Meeting and conference facilities', true),
('Concierge', 'concierge', '👔', 'service', 'Concierge services', true),
('Safe Deposit Box', 'safe', '🔒', 'security', 'In-room safe deposit', true),
('Wheelchair Accessible', 'wheelchair', '♿', 'accessibility', 'Wheelchair accessible facilities', true),
('Kids Club', 'kids-club', '👶', 'family', 'Activities and facilities for children', true),
('Hot Tub', 'hot-tub', '🛁', 'wellness', 'Hot tub or jacuzzi', true),
('Garden', 'garden', '🌳', 'outdoor', 'Garden or outdoor seating area', true)
ON CONFLICT (slug) DO NOTHING;
*/

-- ============================================================================
-- 7. SEED ECOMMERCE CATEGORIES
-- ============================================================================

INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) VALUES
('Electronics', 'electronics', 'Latest gadgets and electronic devices', NULL, 1, true),
('Fashion', 'fashion', 'Clothing and accessories for all', NULL, 2, true),
('Home & Kitchen', 'home-kitchen', 'Home appliances and kitchenware', NULL, 3, true),
('Beauty & Personal Care', 'beauty', 'Cosmetics and personal care products', NULL, 4, true),
('Sports & Outdoors', 'sports', 'Sports equipment and outdoor gear', NULL, 5, true),
('Books & Media', 'books-media', 'Books, movies, music, and games', NULL, 6, true),
('Health & Wellness', 'health', 'Health products and supplements', NULL, 7, true),
('Toys & Games', 'toys', 'Toys and games for children', NULL, 8, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- Insert subcategories
INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) 
SELECT 'Smartphones', 'smartphones', 'Mobile phones and accessories', id, 1, true
FROM public.ecommerce_categories WHERE slug = 'electronics'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) 
SELECT 'Laptops & Computers', 'laptops', 'Computers and laptop devices', id, 2, true
FROM public.ecommerce_categories WHERE slug = 'electronics'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) 
SELECT 'Audio & Headphones', 'audio', 'Headphones, speakers, and audio devices', id, 3, true
FROM public.ecommerce_categories WHERE slug = 'electronics'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) 
SELECT 'Mens Fashion', 'mens-fashion', 'Fashion and clothing for men', id, 1, true
FROM public.ecommerce_categories WHERE slug = 'fashion'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) 
SELECT 'Womens Fashion', 'womens-fashion', 'Fashion and clothing for women', id, 2, true
FROM public.ecommerce_categories WHERE slug = 'fashion'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) 
SELECT 'Kids Fashion', 'kids-fashion', 'Clothing for children', id, 3, true
FROM public.ecommerce_categories WHERE slug = 'fashion'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

INSERT INTO public.ecommerce_categories (name, slug, description, parent_id, display_order, is_active) 
SELECT 'Shoes & Footwear', 'shoes', 'Shoes and footwear for all', id, 4, true
FROM public.ecommerce_categories WHERE slug = 'fashion'
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active;

-- ============================================================================
-- 8. SEED PAYMENT PROVIDER CONFIG (Test Keys Only!)
-- ============================================================================

INSERT INTO public.payment_provider_config (provider_name, public_key, secret_key, webhook_secret, is_active, is_test_mode, supported_methods, priority) VALUES
('Paystack', 'pk_test_xxxxxxxxxxxxxxxxxxxx', 'sk_test_xxxxxxxxxxxxxxxxxxxx', 'whsec_xxxxxxxxxxxxxxxxxxxx', true, true, ARRAY['card', 'bank_transfer'], 1),
('Flutterwave', 'FLWPUBK_TEST-xxxxxxxxxxxx-X', 'FLWSECK_TEST-xxxxxxxxxxxx-X', 'whsec_xxxxxxxxxxxxxxxxxxxx', true, true, ARRAY['card', 'bank_transfer', 'ussd'], 2),
('Stripe', 'pk_test_xxxxxxxxxxxxxxxxxxxx', 'sk_test_xxxxxxxxxxxxxxxxxxxx', 'whsec_xxxxxxxxxxxxxxxxxxxx', false, true, ARRAY['card'], 3)
ON CONFLICT (provider_name) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    is_test_mode = EXCLUDED.is_test_mode,
    priority = EXCLUDED.priority;

-- ============================================================================
-- 9. SEED MODULE COMMISSION RATES
-- ============================================================================

INSERT INTO public.module_commission_rates (module_name, commission_type, commission_value, min_transaction_amount, apply_tax_before_commission, is_active) VALUES
('ecommerce', 'percentage', 15.0, 0, true, true),
('hotel', 'percentage', 10.0, 0, true, true),
('taxi', 'percentage', 20.0, 0, true, true),
('advertising', 'percentage', 0.0, 0, true, true),
('tours', 'percentage', 12.0, 0, true, true),
('events', 'percentage', 8.0, 0, true, true)
ON CONFLICT (module_name) DO UPDATE SET
    commission_value = EXCLUDED.commission_value,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 10. SEED DEPOSIT REQUIREMENTS
-- ============================================================================

INSERT INTO public.deposit_requirements (module_name, deposit_type, deposit_value, min_deposit_amount, balance_due_days_before, is_active) VALUES
('hotel', 'percentage', 50.0, 5000, 7, true),
('tours', 'percentage', 30.0, 3000, 5, true),
('events', 'percentage', 25.0, 2000, 3, true),
('ecommerce', 'none', 0, 0, 0, true),
('taxi', 'none', 0, 0, 0, true)
ON CONFLICT (module_name) DO UPDATE SET
    deposit_value = EXCLUDED.deposit_value,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 11. SEED REFUND POLICIES
-- ============================================================================

INSERT INTO public.refund_policies (module_name, refund_tiers, non_refundable_exceptions, refund_processing_days, is_active) VALUES
('hotel', 
 '[{"hours_before_checkin": 48, "refund_percentage": 100}, {"hours_before_checkin": 24, "refund_percentage": 50}, {"hours_before_checkin": 0, "refund_percentage": 0}]'::jsonb, 
 ARRAY['no_show', 'special_events'], 
 5, true),
('ecommerce', 
 '[{"days_after_delivery": 7, "refund_percentage": 100}, {"days_after_delivery": 14, "refund_percentage": 50}, {"days_after_delivery": 30, "refund_percentage": 0}]'::jsonb, 
 ARRAY['personalized_items', 'digital_products', 'opened_items'], 
 7, true),
('taxi', 
 '[{"minutes_after_booking": 2, "refund_percentage": 100}, {"minutes_after_booking": 5, "refund_percentage": 50}, {"minutes_after_booking": 10, "refund_percentage": 0}]'::jsonb, 
 ARRAY['ride_started'], 
 3, true)
ON CONFLICT (module_name) DO UPDATE SET
    refund_tiers = EXCLUDED.refund_tiers,
    is_active = EXCLUDED.is_active;

-- ============================================================================
-- 12. SEED SAMPLE CONVERSATIONS (Group Channels)
-- ============================================================================

INSERT INTO public.conversations (conversation_type, name, description, is_active) VALUES
('group', 'Giga Platform Support', 'Official support channel for Giga Platform users', true),
('group', 'NIPOST Officials', 'Internal communication for NIPOST staff', true),
('group', 'Vendor Community', 'Community channel for verified vendors', true)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

DO $$
DECLARE
    regions_count integer;
    offices_count integer;
    permissions_count integer;
    templates_count integer;
    articles_count integer;
    amenities_count integer;
    categories_count integer;
    providers_count integer;
    conversations_count integer;
    commission_rates_count integer;
    deposit_reqs_count integer;
    refund_policies_count integer;
BEGIN
    SELECT COUNT(*) INTO regions_count FROM public.nipost_regions;
    SELECT COUNT(*) INTO offices_count FROM public.nipost_offices;
    SELECT COUNT(*) INTO permissions_count FROM public.admin_permissions;
    SELECT COUNT(*) INTO templates_count FROM public.notification_templates;
    SELECT COUNT(*) INTO articles_count FROM public.support_articles;
    SELECT COUNT(*) INTO amenities_count FROM public.hotel_amenities;
    SELECT COUNT(*) INTO categories_count FROM public.ecommerce_categories;
    SELECT COUNT(*) INTO providers_count FROM public.payment_provider_config;
    SELECT COUNT(*) INTO conversations_count FROM public.conversations;
    SELECT COUNT(*) INTO commission_rates_count FROM public.module_commission_rates;
    SELECT COUNT(*) INTO deposit_reqs_count FROM public.deposit_requirements;
    SELECT COUNT(*) INTO refund_policies_count FROM public.refund_policies;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '🎉 GIGA PLATFORM - DATABASE SEEDING COMPLETE! 🎉';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 SEEDED DATA SUMMARY:';
    RAISE NOTICE '   🌍 Regions: % (Continents → Countries → States → Cities)', regions_count;
    RAISE NOTICE '   🏢 NIPOST Offices: %', offices_count;
    RAISE NOTICE '   🔐 Admin Permissions: %', permissions_count;
    RAISE NOTICE '   📧 Notification Templates: %', templates_count;
    RAISE NOTICE '   📚 Support Articles: %', articles_count;
    RAISE NOTICE '   🏨 Hotel Amenities: %', amenities_count;
    RAISE NOTICE '   🛍️ Ecommerce Categories: %', categories_count;
    RAISE NOTICE '   💳 Payment Providers: %', providers_count;
    RAISE NOTICE '   💬 Group Conversations: %', conversations_count;
    RAISE NOTICE '   💰 Commission Rates: %', commission_rates_count;
    RAISE NOTICE '   🏦 Deposit Requirements: %', deposit_reqs_count;
    RAISE NOTICE '   🔄 Refund Policies: %', refund_policies_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ SYSTEM IS READY FOR:';
    RAISE NOTICE '   ✓ Global NIPOST management';
    RAISE NOTICE '   ✓ Multi-channel notifications';
    RAISE NOTICE '   ✓ Support knowledge base';
    RAISE NOTICE '   ✓ Hotel bookings with amenities';
    RAISE NOTICE '   ✓ Ecommerce marketplace';
    RAISE NOTICE '   ✓ Payment processing';
    RAISE NOTICE '   ✓ Commission & financial management';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 NEXT STEPS:';
    RAISE NOTICE '   1. Create user accounts via frontend';
    RAISE NOTICE '   2. Configure payment provider webhooks';
    RAISE NOTICE '   3. Set up email/SMS notification providers';
    RAISE NOTICE '   4. Create sample hotels/products for testing';
    RAISE NOTICE '============================================================';
END $$;
