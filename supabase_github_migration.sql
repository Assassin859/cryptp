-- Migration to add GitHub integration fields to the projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS github_repo TEXT,
ADD COLUMN IF NOT EXISTS github_branch TEXT,
ADD COLUMN IF NOT EXISTS last_sync_hash TEXT;
