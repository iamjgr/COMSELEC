-- ============================================================
-- Migration: Add pin_attempts column for server-side PIN lockout
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add attempt counter (defaults to 0 for all existing voters)
ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS pin_attempts INTEGER NOT NULL DEFAULT 0;

-- Optional: Add a comment for clarity
COMMENT ON COLUMN voters.pin_attempts IS 'Number of failed PIN attempts. Locked at 3.';
