-- 001_init_rbac.sql
-- Compatibility-first RBAC migration for existing integer-based schema

-- Ensure auth-friendly username exists on existing users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username VARCHAR(50);

UPDATE users
SET username = COALESCE(
  username,
  NULLIF(display_name, ''),
  split_part(email, '@', 1),
  'user_' || id::text
)
WHERE username IS NULL;

-- Unique username for login/register flow
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users (username);

-- Add compatibility metadata column if absent
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS created_by INTEGER;

-- Backfill created_by from owner_id where possible
UPDATE projects
SET created_by = owner_id
WHERE created_by IS NULL;

-- Ensure membership uniqueness for ON CONFLICT usage
CREATE UNIQUE INDEX IF NOT EXISTS project_members_project_user_idx
  ON project_members (project_id, user_id);

-- Normalize role values to app-level roles
UPDATE project_members
SET role = CASE
  WHEN lower(role) IN ('owner', 'admin') THEN 'owner'
  ELSE 'member'
END
WHERE role IS NOT NULL;

-- Ensure project_files exists with integer FK compatibility
CREATE TABLE IF NOT EXISTS project_files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  google_file_id VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
