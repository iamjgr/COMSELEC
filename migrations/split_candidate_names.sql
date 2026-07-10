-- ============================================================
-- Migration: Add split name fields to candidates table
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE candidates 
ADD COLUMN first_name TEXT,
ADD COLUMN middle_name TEXT,
ADD COLUMN last_name TEXT;
