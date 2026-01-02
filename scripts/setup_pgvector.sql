-- BTRIX Brain - Supabase pgvector Setup
-- Version: 1.0.0
-- Purpose: Create vector database for BTRIX knowledge chunks

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create brain_chunks table
CREATE TABLE IF NOT EXISTS brain_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  source TEXT NOT NULL,  -- e.g., "BTRIX_CORE.md", "BTRIX_PACKS.md"
  section TEXT,           -- e.g., "Service Packs", "AI Agents"
  tags TEXT[],            -- e.g., ["pricing", "essential"], ["agents", "sales"]
  version TEXT NOT NULL,  -- e.g., "1.0.0"
  content_hash TEXT NOT NULL UNIQUE,  -- SHA256 hash to prevent duplicates
  token_count INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS brain_chunks_embedding_idx 
  ON brain_chunks 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS brain_chunks_source_idx 
  ON brain_chunks (source);

CREATE INDEX IF NOT EXISTS brain_chunks_version_idx 
  ON brain_chunks (version);

CREATE INDEX IF NOT EXISTS brain_chunks_tags_idx 
  ON brain_chunks USING GIN (tags);

CREATE INDEX IF NOT EXISTS brain_chunks_content_hash_idx 
  ON brain_chunks (content_hash);

-- Create RPC function for similarity search
CREATE OR REPLACE FUNCTION match_brain_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 8,
  filter_version text DEFAULT NULL,
  filter_tags text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  source text,
  section text,
  tags text[],
  version text,
  token_count integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    brain_chunks.id,
    brain_chunks.content,
    brain_chunks.source,
    brain_chunks.section,
    brain_chunks.tags,
    brain_chunks.version,
    brain_chunks.token_count,
    1 - (brain_chunks.embedding <=> query_embedding) AS similarity
  FROM brain_chunks
  WHERE 
    (filter_version IS NULL OR brain_chunks.version = filter_version)
    AND (filter_tags IS NULL OR brain_chunks.tags && filter_tags)
    AND 1 - (brain_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY brain_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_brain_chunks_updated_at
  BEFORE UPDATE ON brain_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- ALTER TABLE brain_chunks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE brain_chunks IS 'BTRIX Brain knowledge chunks with embeddings for RAG';
COMMENT ON COLUMN brain_chunks.content IS 'The actual text content of the chunk';
COMMENT ON COLUMN brain_chunks.source IS 'Source document filename';
COMMENT ON COLUMN brain_chunks.section IS 'Section or heading within the document';
COMMENT ON COLUMN brain_chunks.tags IS 'Tags for filtering (e.g., pricing, agents, limits)';
COMMENT ON COLUMN brain_chunks.version IS 'Brain version (semantic versioning)';
COMMENT ON COLUMN brain_chunks.content_hash IS 'SHA256 hash for deduplication';
COMMENT ON COLUMN brain_chunks.token_count IS 'Approximate token count of the chunk';
COMMENT ON COLUMN brain_chunks.embedding IS 'Vector embedding (OpenAI text-embedding-3-small)';
