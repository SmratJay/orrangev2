-- ============================================
-- FIX: Make email nullable in users table
-- ============================================
-- This fixes the issue where Privy Google logins don't provide email
-- Run this in Supabase SQL Editor

-- Remove NOT NULL constraint from email
ALTER TABLE public.users 
ALTER COLUMN email DROP NOT NULL;

-- Verify the change
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'email';

-- Note: UNIQUE constraint on email is fine - NULL values don't conflict with each other in PostgreSQL
