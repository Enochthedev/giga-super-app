# Database Scripts

This directory contains utility scripts for database operations and maintenance.

## Scripts

### Data Integrity and Validation

- `check_data_integrity.sql` - Validates data consistency across tables
- `fix_hotel_host_ids.sql` - Fixes hotel host ID inconsistencies

### Schema and Seeding

- `taxi_schema.sql` - Taxi service schema definitions
- `seed_database.sql` - Database seeding script
- `run-seed.js` - JavaScript seeding utility

## Usage

### Running SQL Scripts

```bash
# Using Supabase CLI
supabase db reset --debug

# Using psql directly
psql -d your_database -f database/scripts/script_name.sql
```

### Running Seeding Scripts

```bash
# JavaScript seeding
node database/scripts/run-seed.js

# SQL seeding
npm run db:seed
```

## Note

These scripts are utilities and should be used with caution in production
environments. Always backup your database before running any modification
scripts.
