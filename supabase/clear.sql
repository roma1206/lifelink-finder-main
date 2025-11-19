-- WARNING: This will permanently remove data from the listed tables.
-- Run this in Supabase SQL Editor (SQL -> New query) to clear app tables.
-- It does NOT delete users in the `auth.users` table. Back up data before running.

BEGIN;

-- Preferred: TRUNCATE the app tables. Use CASCADE to handle FK relations.
TRUNCATE TABLE
  blood_requests,
  notifications,
  donor_profiles,
  seeker_profiles,
  user_roles
RESTART IDENTITY CASCADE;

COMMIT;

-- If you don't have permission to TRUNCATE, use DELETE (slower):
-- DELETE FROM blood_requests;
-- DELETE FROM notifications;
-- DELETE FROM donor_profiles;
-- DELETE FROM seeker_profiles;
-- DELETE FROM user_roles;

-- Optional: vacuum to reclaim space (Supabase may manage this for you):
-- VACUUM ANALYZE;

-- Backup tip: export tables first using the Supabase Table Editor Export (CSV/JSON)
-- or run SELECT * FROM table_name into a file before truncating.
