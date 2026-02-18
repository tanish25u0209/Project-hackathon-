-- ─────────────────────────────────────────────
-- Migration 002: pgvector Extension + Embedding Column
-- ─────────────────────────────────────────────

-- Enable pgvector extension (must be installed on the PostgreSQL server)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to ideas table
-- Using 1536 dimensions for text-embedding-3-small (configurable)
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW index for fast approximate nearest neighbor search
-- ef_construction=128 and m=16 are good defaults for production
-- This index is used for pgvector similarity queries (not used by our in-memory pipeline,
-- but available for future SQL-based similarity queries at scale)
CREATE INDEX IF NOT EXISTS idx_ideas_embedding_hnsw
  ON ideas USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

INSERT INTO schema_migrations (version) VALUES ('002') ON CONFLICT DO NOTHING;
