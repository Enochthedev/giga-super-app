# Database Types Management Guide

## Overview

This guide explains how database types are managed across all services in the Giga platform. We use a **single source of truth** approach where types are generated from Supabase and shared across all Railway services.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Database                        │
│                  (Single Source of Truth)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Supabase CLI
                           │ gen types typescript
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              shared/types/database.ts                        │
│           (Auto-generated TypeScript Types)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Imported by all services
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ API Gateway  │  │Social Service│  │Admin Service │
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Delivery   │  │   Payment    │  │    Search    │
│   Service    │  │Queue Service │  │   Service    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Quick Start

### 1. Generate Types from Supabase

```bash
# Generate types once
npm run db:generate-types

# Or watch for changes (auto-regenerate on schema updates)
npm run db:watch-types
```

### 2. Use Types in Your Service

```typescript
// Import from shared package
import { Database, UserProfile, Hotel, SocialPost } from '@shared/types/database';
import { createClient } from '@supabase/supabase-js';

// Create typed Supabase client
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Now you get full type safety!
const { data: user, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

// user is typed as UserProfile
console.log(user?.first_name); // ✅ Type-safe
console.log(user?.invalid_field); // ❌ TypeScript error
```

## Type Generation Process

### Automatic Generation

The type generation script does the following:

1. **Connects to Supabase** using the project reference
2. **Generates TypeScript types** from the database schema
3. **Adds helper types** for easier usage
4. **Builds the shared package** so all services can import it
5. **Validates** the generated types

### Manual Generation

If you need to manually generate types:

```bash
# From project root
npm run db:generate-types

# Or from shared package
cd shared
npm run db:generate-types
```

## Available Type Helpers

### Table Types

```typescript
import { Tables } from '@shared/types/database';

// Get the Row type for any table
type User = Tables<'user_profiles'>;
type Post = Tables<'social_posts'>;
type Hotel = Tables<'hotels'>;
```

### Insert Types

```typescript
import { Insertable } from '@shared/types/database';

// Get the Insert type for creating new records
type NewUser = Insertable<'user_profiles'>;
type NewPost = Insertable<'social_posts'>;

const newUser: NewUser = {
  id: 'uuid',
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  // TypeScript ensures all required fields are present
};
```

### Update Types

```typescript
import { Updatable } from '@shared/types/database';

// Get the Update type for partial updates
type UserUpdate = Updatable<'user_profiles'>;

const updates: UserUpdate = {
  first_name: 'Jane', // Only update what you need
  // All fields are optional
};
```

### Convenience Types

Pre-defined types for commonly used tables:

```typescript
import {
  UserProfile,
  SocialPost,
  Hotel,
  HotelBooking,
  Payment,
  DeliveryAssignment,
  EcommerceOrder,
  Ride,
} from '@shared/types/database';

// Use directly without Tables<>
const user: UserProfile = { /* ... */ };
const post: SocialPost = { /* ... */ };
```

## Handling Schema Changes

### When You Update the Database Schema

1. **Apply migration in Supabase**:
   ```bash
   supabase db push
   ```

2. **Regenerate types**:
   ```bash
   npm run db:generate-types
   ```

3. **Rebuild shared package**:
   ```bash
   cd shared && npm run build
   ```

4. **Update services** (if needed):
   - TypeScript will show errors where types changed
   - Update your code to match the new schema
   - Test thoroughly

### Automatic Type Sync (Recommended)

Run the type watcher during development:

```bash
npm run db:watch-types
```

This will automatically regenerate types whenever you:
- Add a new migration
- Modify an existing migration
- Change the database schema

## Service-Specific Usage

### API Gateway

```typescript
// api-gateway/src/middleware/auth.ts
import { Database, UserProfile } from '@shared/types/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return data;
}
```

### Social Service

```typescript
// social-service/src/routes/posts.ts
import { Database, SocialPost, InsertSocialPost } from '@shared/types/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createPost(postData: InsertSocialPost): Promise<SocialPost> {
  const { data, error } = await supabase
    .from('social_posts')
    .insert(postData)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Admin Service

```typescript
// admin-service/src/routes/approvals.ts
import { Database, AdminApproval, AuditTrail } from '@shared/types/database';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function approveRequest(approvalId: string, adminId: string) {
  // Full type safety for admin operations
  const { data, error } = await supabase
    .from('admin_approvals')
    .update({
      status: 'approved',
      decided_by: adminId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .select()
    .single();

  return data;
}
```

## Best Practices

### 1. Always Use Generated Types

❌ **Don't** define your own database types:
```typescript
// Bad - manual types get out of sync
interface User {
  id: string;
  name: string;
  // Missing fields, wrong types, etc.
}
```

✅ **Do** use generated types:
```typescript
// Good - always in sync with database
import { UserProfile } from '@shared/types/database';
```

### 2. Use Helper Types

❌ **Don't** manually construct insert/update types:
```typescript
// Bad - error-prone
type NewUser = Omit<UserProfile, 'created_at' | 'updated_at'>;
```

✅ **Do** use provided helpers:
```typescript
// Good - automatically correct
import { Insertable } from '@shared/types/database';
type NewUser = Insertable<'user_profiles'>;
```

### 3. Regenerate After Schema Changes

Always regenerate types after:
- Adding new tables
- Adding/removing columns
- Changing column types
- Modifying constraints
- Adding enums

```bash
npm run db:generate-types
```

### 4. Commit Generated Types

✅ **Do** commit `shared/types/database.ts` to git:
- Ensures all developers have the same types
- CI/CD can build without database access
- Types are versioned with your code

### 5. Type-Safe Queries

Use TypeScript to catch errors at compile time:

```typescript
// TypeScript will error if table/column doesn't exist
const { data } = await supabase
  .from('user_profiles') // ✅ Valid table
  .select('first_name, last_name, email') // ✅ Valid columns
  .eq('invalid_column', 'value'); // ❌ TypeScript error!
```

## Troubleshooting

### Types Not Updating

1. **Regenerate types**:
   ```bash
   npm run db:generate-types
   ```

2. **Rebuild shared package**:
   ```bash
   cd shared && npm run build
   ```

3. **Restart TypeScript server** in your IDE

### Supabase CLI Not Found

Install the Supabase CLI:

```bash
npm install -g supabase
```

Then login:

```bash
supabase login
```

### Project Not Linked

Link your project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

The project ref is stored in `supabase/.temp/project-ref`.

### Type Errors After Schema Change

1. **Regenerate types** to get latest schema
2. **Fix TypeScript errors** in your code
3. **Update tests** to match new schema
4. **Test thoroughly** before deploying

### Build Errors in Services

If services can't find types:

1. **Check shared package is built**:
   ```bash
   cd shared && npm run build
   ```

2. **Verify import paths**:
   ```typescript
   import { Database } from '@shared/types/database'; // ✅ Correct
   import { Database } from 'shared/types/database'; // ❌ Wrong
   ```

3. **Check tsconfig.json paths**:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@shared/*": ["../shared/*"]
       }
     }
   }
   ```

## CI/CD Integration

### GitHub Actions

```yaml
name: Type Check

on: [push, pull_request]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate database types
        run: npm run db:generate-types
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Type check all services
        run: npm run type-check
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.s