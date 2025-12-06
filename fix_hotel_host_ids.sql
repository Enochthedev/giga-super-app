-- Fix hotels with incorrect host_id values
-- This script corrects hotels that are using profile.id instead of user_id

-- IMPORTANT: Run check_data_integrity.sql first to see what needs fixing!

-- Step 1: Preview what will be fixed (DRY RUN)
SELECT 
    h.id as hotel_id,
    h.name as hotel_name,
    h.host_id as current_wrong_host_id,
    hp.user_id as correct_user_id,
    'UPDATE hotels SET host_id = ''' || hp.user_id::text || ''' WHERE id = ''' || h.id::text || ''';' as fix_sql
FROM hotels h
JOIN host_profiles hp ON h.host_id = hp.id  -- Finding hotels using profile.id (WRONG)
WHERE h.host_id != hp.user_id;

-- Step 2: ACTUAL FIX - Uncomment and run ONLY after reviewing Step 1 results
-- WARNING: This will modify your database!

/*
BEGIN;

-- Update hotels to use user_id instead of profile.id
UPDATE hotels h
SET host_id = hp.user_id,
    updated_at = NOW()
FROM host_profiles hp
WHERE h.host_id = hp.id  -- Hotels currently using profile.id
  AND h.host_id != hp.user_id;  -- That need to be changed

-- Verify the fix
SELECT 
    COUNT(*) as hotels_fixed,
    'All hotels now reference host_profiles.user_id' as status
FROM hotels h
JOIN host_profiles hp ON h.host_id = hp.user_id;

-- If everything looks good, COMMIT. Otherwise ROLLBACK.
-- COMMIT;
-- ROLLBACK;

END;
*/

-- Step 3: Verification query - Run AFTER the fix
-- This should return 0 rows if all hotels are correctly referencing user_id
SELECT 
    h.id,
    h.name,
    h.host_id,
    'STILL BROKEN' as status
FROM hotels h
LEFT JOIN host_profiles hp ON h.host_id = hp.user_id
WHERE hp.user_id IS NULL;
