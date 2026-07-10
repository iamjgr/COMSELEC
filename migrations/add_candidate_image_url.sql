-- ============================================================
-- Migration: Add image_url to candidates table
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE candidates ADD COLUMN image_url TEXT;
