-- Migration: Add image_position column to candidates table
-- Run this in your Supabase SQL editor.
-- This allows admins to set a focal point for candidate photos
-- so voters see the correct area in the voting card.

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS image_position TEXT DEFAULT 'center';
