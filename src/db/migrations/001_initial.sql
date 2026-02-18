-- ─────────────────────────────────────────────
-- Migration 001: Initial Schema
-- ─────────────────────────────────────────────

-- Track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(20) PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Research Sessions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_statement   TEXT NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ  -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON research_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_sessions_deleted_at ON research_sessions(deleted_at)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- LLM Responses (one per provider per session)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  provider            VARCHAR(50) NOT NULL,
  model               VARCHAR(100),
  status              VARCHAR(20) NOT NULL DEFAULT 'success'
                        CHECK (status IN ('success', 'failed')),
  raw_response        TEXT,
  error_message       TEXT,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  latency_ms          INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_responses_session_id ON llm_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_responses_provider ON llm_responses(provider);

-- ─────────────────────────────────────────────
-- Ideas (individual ideas extracted from LLM responses)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ideas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  llm_response_id       UUID NOT NULL REFERENCES llm_responses(id) ON DELETE CASCADE,
  provider              VARCHAR(50) NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  rationale             TEXT NOT NULL,
  category              VARCHAR(50) NOT NULL,
  confidence_score      NUMERIC(4,3) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  novelty_score         NUMERIC(4,3) NOT NULL CHECK (novelty_score BETWEEN 0 AND 1),
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  cluster_id            INTEGER,
  is_duplicate          BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of          UUID REFERENCES ideas(id) ON DELETE SET NULL,
  similarity_to_dup     NUMERIC(5,4),
  -- embedding column added in migration 002 (requires pgvector)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ideas_session_id ON ideas(session_id);
CREATE INDEX IF NOT EXISTS idx_ideas_session_unique ON ideas(session_id, is_duplicate);
CREATE INDEX IF NOT EXISTS idx_ideas_cluster_id ON ideas(cluster_id);
CREATE INDEX IF NOT EXISTS idx_ideas_provider ON ideas(provider);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);

-- ─────────────────────────────────────────────
-- Deepening Sessions (idea deep-dives)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deepening_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  idea_id             UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  provider            VARCHAR(50) NOT NULL,
  depth_level         SMALLINT NOT NULL CHECK (depth_level BETWEEN 1 AND 3),
  prompt_used         TEXT,
  result              JSONB,
  status              VARCHAR(20) NOT NULL DEFAULT 'success'
                        CHECK (status IN ('success', 'failed')),
  error_message       TEXT,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  latency_ms          INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deepening_sessions_session_id ON deepening_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_deepening_sessions_idea_id ON deepening_sessions(idea_id);

-- ─────────────────────────────────────────────
-- Auto-update updated_at trigger
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_research_sessions_updated_at ON research_sessions;
CREATE TRIGGER set_research_sessions_updated_at
  BEFORE UPDATE ON research_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO schema_migrations (version) VALUES ('001') ON CONFLICT DO NOTHING;
