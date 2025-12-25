# Giga API Documentation

## 📚 Postman Collection

This directory contains the complete Postman collection for the Giga Platform
API.

### Files

- **`Giga-API-Collection.postman_collection.json`** - Main API collection with
  all endpoints
- **`Giga-Environment.postman_environment.json`** - Production environment
  variables
- **`Giga-Environment-Local.postman_environment.json`** - Local development
  environment

## 🚀 Getting Started

### 1. Import to Postman

1. Open Postman
2. Click **Import** in the top left
3. Select all three files in this directory
4. The collection and environments will be imported

### 2. Configure Environment

1. Select the appropriate environment (Production or Local)
2. Update the following variables:
   - `base_url` - Your Supabase function URL
   - `supabase_anon_key` - Your Supabase anon key
   - `supabase_auth_token` - Get from Supabase auth (after login)

#### Getting Auth Token

To get your auth token, login to your app and run this in the browser console:

```javascript
const {
  data: { session },
} = await supabase.auth.getSession();
console.log(session.access_token);
```

Copy the token and paste it into the `supabase_auth_token` variable.

### 3. Test Endpoints

The collection is organized into modules:

1. **Authentication & User Management** - User profiles and roles
2. **Hotel Discovery & Search** - Search and browse hotels
3. **Hotel Management** - Vendor hotel operations
4. **Booking Management** - Create and manage bookings
5. **Reviews & Ratings** - Review system
6. **Payment & Wallet** - Payments and financial operations
7. **Notifications** - Push and SMS notifications
8. **Admin & Analytics** - Admin dashboard
9. **Shopping Cart** - Marketplace features
10. **Webhooks** - Payment provider webhooks

## 📖 API Organization

### Module Overview

| Module           | Endpoints | Purpose                          |
| ---------------- | --------- | -------------------------------- |
| Auth & User      | 7         | User management, profiles, roles |
| Hotel Discovery  | 7         | Search, browse, favorites        |
| Hotel Management | 5         | Vendor operations                |
| Booking          | 9         | Booking lifecycle                |
| Reviews          | 3         | Review system                    |
| Payments         | 12        | Payments, wallet, payouts        |
| Notifications    | 7         | Messaging system                 |
| Admin            | 3         | Admin operations                 |
| Shopping         | 5         | E-commerce features              |
| Webhooks         | 2         | Payment webhooks                 |

## 🔐 Authentication

All authenticated endpoints require:

1. **Authorization Header**: `Bearer {{supabase_auth_token}}`
2. **API Key Header**: `apikey: {{supabase_anon_key}}`

The collection is pre-configured with these headers using environment variables.

## 📝 Request Examples

### Creating a Hotel Booking

```json
POST /Create-booking
{
  "hotelId": "uuid-here",
  "roomTypeId": "uuid-here",
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05",
  "rooms": 1,
  "guests": 2,
  "guestName": "John Doe",
  "guestEmail": "john@example.com",
  "guestPhone": "+1234567890"
}
```

### Searching Hotels

```json
POST /Search-hotels
{
  "location": "Lagos",
  "checkIn": "2024-12-01",
  "checkOut": "2024-12-05",
  "guests": 2,
  "minPrice": 50,
  "maxPrice": 300,
  "amenities": ["wifi", "pool"]
}
```

## 🛠️ Maintenance

### Keeping Documentation Updated

When adding new endpoints:

1. Add the function to the appropriate module in the collection
2. Include request body examples
3. Add description explaining the endpoint
4. Update this README if adding new modules
5. Test the endpoint in both environments

### Auto-Generate Documentation

Run the generator script to create documentation from the collection:

```bash
deno run --allow-read --allow-write scripts/generate-api-docs.ts
```

## 📊 Coverage

- **Total Endpoints**: 62
- **Documented**: 62
- **Coverage**: 100%

## 🔗 Related Files

- `/Users/user/Dev/giga/API_ORGANIZATION.md` - Detailed function organization
- `/Users/user/Dev/giga/HOTEL_FUNCTIONS_SUMMARY.md` - Hotel features summary
- `/Users/user/Dev/giga/supabase/functions/` - Function implementations

## 💡 Tips

1. **Use Variables**: Store commonly used IDs in environment variables
2. **Test Flows**: Create test sequences for common user journeys
3. **Save Responses**: Use Postman's test scripts to save response data
4. **Mock Server**: Use Postman Mock Server for frontend development

## 🐛 Troubleshooting

### 401 Unauthorized

- Check if `supabase_auth_token` is set and valid
- Token expires after 1 hour, get a new one

### 403 Forbidden

- Ensure user has the required role (vendor, admin)
- Check RLS policies in Supabase

### 404 Not Found

- Verify `base_url` is correct
- Check function name matches exactly (case-sensitive)

## 📞 Support

For issues or questions:

- Check function logs in Supabase Dashboard
- Review function implementation in `/supabase/functions/`
- Test locally with `supabase functions serve`
