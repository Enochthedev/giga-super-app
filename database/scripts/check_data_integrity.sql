-- Check for data integrity issues in hotels and profiles
-- Run this to find hotels with invalid host_id references

-- 1. Check for hotels with host_id that don't match any host_profiles.user_id
SELECT 
    h.id as hotel_id,
    h.name as hotel_name,
    h.host_id,
    hp.user_id,
    hp.id as profile_id,
    CASE 
        WHEN hp.user_id IS NULL THEN 'ORPHANED - No matching host_profile'
        WHEN h.host_id = hp.id THEN 'WRONG PATTERN - Using profile.id instead of user_id'
        WHEN h.host_id = hp.user_id THEN 'CORRECT'
        ELSE 'UNKNOWN ISSUE'
    END as status
FROM hotels h
LEFT JOIN host_profiles hp ON h.host_id = hp.user_id
WHERE hp.user_id IS NULL
   OR hp.user_id IS NOT NULL;

-- 2. Check specifically for hotels using profile.id instead of user_id (WRONG pattern)
SELECT 
    h.id as hotel_id,
    h.name as hotel_name,
    h.host_id as stored_host_id,
    hp.id as profile_id,
    hp.user_id as correct_user_id,
    'NEEDS FIX: host_id should be ' || hp.user_id::text as fix_needed
FROM hotels h
JOIN host_profiles hp ON h.host_id = hp.id  -- Wrong join!
WHERE h.host_id != hp.user_id;

-- 3. Check for orphaned hotels (host_id doesn't match ANY profile)
SELECT 
    h.id as hotel_id,
    h.name as hotel_name,
    h.host_id,
    'ORPHANED - No profile found' as issue
FROM hotels h
WHERE NOT EXISTS (
    SELECT 1 FROM host_profiles hp 
    WHERE hp.user_id = h.host_id
)
AND NOT EXISTS (
    SELECT 1 FROM host_profiles hp 
    WHERE hp.id = h.host_id
);

-- 4. Get count summary
SELECT 
    COUNT(*) FILTER (WHERE hp_by_user.user_id IS NOT NULL) as correct_references,
    COUNT(*) FILTER (WHERE hp_by_user.user_id IS NULL AND hp_by_id.id IS NOT NULL) as wrong_pattern_count,
    COUNT(*) FILTER (WHERE hp_by_user.user_id IS NULL AND hp_by_id.id IS NULL) as orphaned_count,
    COUNT(*) as total_hotels
FROM hotels h
LEFT JOIN host_profiles hp_by_user ON h.host_id = hp_by_user.user_id
LEFT JOIN host_profiles hp_by_id ON h.host_id = hp_by_id.id;
