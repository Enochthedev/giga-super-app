# Giga API Documentation

## 📚 Postman Collection

This directory contains the complete Postman collection for the Giga Platform
API, generated from TypeScript definitions.

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
3. Select the `.collection.json` and `.environment.json` files
4. The collection and environments will be imported

### 2. Configure Environment

1. Select the appropriate environment (Production or Local)
2. Update the following variables if needed:
   - `base_url` - Supabase function URL
   - `supabase_auth_token` - Login to your app to get this token

## 🛠️ Generating the Collection

The collection is now auto-generated from TypeScript source files to ensure type
safety and consistency.

### Requirements

- Node.js >= 18
- npm

### Usage

To regenerate the collection after making changes:

```bash
cd postman/src
npm install
npm run generate
```

This will:

1. Validate all service definitions
2. Generate a new `Giga-API-Collection.postman_collection.json`
3. Update specific endpoint details, examples, and edge cases

### Adding New Endpoints

1. Navigate to `postman/src/services`
2. Open the relevant service file (e.g., `user-profile.service.ts`)
3. Add your new endpoint definition to the `endpoints` array
4. Run `npm run generate`

For creating new services, verify `postman/src/README.md` for detailed
instructions.

## 📖 API Modules

The API is organized into the following modules:

1. **Authentication & User Management**
2. **Hotel Discovery & Management**
3. **Booking Management**
4. **Payment & Wallet**
5. **Taxi & Rides**
6. **Delivery & Logistics**
7. **Social Media**
8. **Chat & Communication**
9. **Admin & Platform**
10. **Advertising**
11. **Notifications**
12. **Core Utilities**

## 🔗 Related Resources

- **Source Code**: `postman/src/` (Generator source)
- **Supabase Functions**: `/supabase/functions/` (Backend implementation)
- **API Reference**: `API_REFERENCE.md` (Markdown summary)
