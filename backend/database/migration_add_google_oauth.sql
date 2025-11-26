-- Migration script to add Google OAuth support
-- Run this if you have an existing database

-- Add google_id column (nullable, unique)
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);

-- Make password_hash nullable (for OAuth users)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create unique index on google_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.google_id IS 'Google OAuth user ID';
COMMENT ON COLUMN users.password_hash IS 'Password hash (nullable for OAuth users)';

