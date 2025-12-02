-- Migration: Add characters column to stories table
-- Run this if you already have a database and need to add the characters field

-- Add characters column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'characters'
    ) THEN
        ALTER TABLE stories ADD COLUMN characters JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
