-- 002_create_saved_ideas.sql
-- Missing table for storing saved synthesis ideas across research sessions

CREATE TABLE IF NOT EXISTS saved_ideas (
    id UUID PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    idea_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    strategic_thesis TEXT,
    mechanism TEXT,
    implementation_framework JSONB,
    idea_type VARCHAR(100),
    derived_from_models JSONB,
    support_count INTEGER DEFAULT 1,
    confidence NUMERIC,
    status VARCHAR(50) DEFAULT 'active',
    rating INTEGER DEFAULT 0,
    notes TEXT,
    tags JSONB,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for fast retrieval for a specific user and avoiding duplicates
CREATE INDEX IF NOT EXISTS saved_ideas_user_idx ON saved_ideas(user_id);
CREATE INDEX IF NOT EXISTS saved_ideas_session_idx ON saved_ideas(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS saved_ideas_user_idea_idx ON saved_ideas(user_id, idea_id);
