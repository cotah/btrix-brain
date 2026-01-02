# BTRIX Brain - RAG Implementation

**Version:** 1.0.0  
**Date:** 2025-01-02  
**Status:** ✅ Complete

---

## Overview

This document describes the complete RAG (Retrieval-Augmented Generation) implementation for the BTRIX Brain knowledge base.

The system uses **vector database** (Supabase pgvector) to store knowledge chunks with embeddings, enabling efficient semantic search and context retrieval for the chatbot.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BTRIX Brain (Markdown)                   │
│  BTRIX_CORE.md | BTRIX_PACKS.md | BTRIX_AGENTS.md | ...    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 1. Chunking
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chunks (600-900 tokens)                  │
│  + Overlap (100 tokens) + Metadata (source, section, tags) │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 2. Embedding Generation
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenAI text-embedding-3-small                  │
│                   (1536 dimensions)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 3. Storage
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            Supabase pgvector (brain_chunks table)           │
│  id | content | source | section | tags | embedding | ...  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 4. Retrieval (User Query)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Semantic Search (Cosine)                   │
│         match_brain_chunks(query_embedding, ...)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 5. Context Building
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Top 4-8 chunks (max 12k characters)                │
│     System Prompt + Context + User Message → OpenAI        │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Database Schema (`setup_pgvector.sql`)

**Table:** `brain_chunks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `content` | TEXT | Chunk text content |
| `source` | TEXT | Source file (e.g., "BTRIX_PACKS.md") |
| `section` | TEXT | Section heading |
| `tags` | TEXT[] | Tags for filtering (e.g., ["pricing", "pro"]) |
| `version` | TEXT | Brain version (e.g., "1.0.0") |
| `content_hash` | TEXT | SHA256 hash for deduplication |
| `token_count` | INTEGER | Estimated token count |
| `embedding` | vector(1536) | OpenAI embedding |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `embedding` - IVFFlat index for cosine similarity search
- `source`, `version`, `tags`, `content_hash` - B-tree indexes

**RPC Function:** `match_brain_chunks(query_embedding, match_threshold, match_count, filter_version, filter_tags)`

Returns top-k chunks by cosine similarity with optional filters.

---

### 2. Chunking Script (`scripts/chunker.js`)

**Purpose:** Split markdown documents into overlapping chunks with metadata.

**Configuration:**
- **Chunk size:** 600-900 tokens (2,400-3,600 characters)
- **Overlap:** 100 tokens (400 characters)
- **Strategy:** Split by sentences, preserve headings

**Features:**
- Parses markdown structure (headings → sections)
- Generates SHA256 hash for deduplication
- Extracts tags automatically from content
- Estimates token count (1 token ≈ 4 characters)

**Usage:**
```bash
node chunker.js ../core 1.0.0
```

**Output:**
- Array of chunk objects with metadata
- Saved to `chunks_output.json` for inspection

---

### 3. Ingestion Script (`scripts/ingest.js`)

**Purpose:** Generate embeddings and upsert chunks to Supabase.

**Process:**
1. Chunk all markdown files in directory
2. Generate embeddings using OpenAI API
3. Upsert to Supabase (using `content_hash` for deduplication)
4. Log progress and statistics

**Features:**
- Batch processing (10 chunks at a time)
- Rate limiting (1s delay between batches)
- Graceful error handling
- Statistics reporting

**Usage:**
```bash
# Ingest all documents
npm run ingest

# Delete version
node ingest.js delete 1.0.0

# Show statistics
npm run stats
```

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`

---

### 4. RAG Service (`backend/src/services/rag.service.js`)

**Purpose:** Retrieve relevant context from vector database.

**Main Function:** `retrieveBrainContext(query, options)`

**Parameters:**
- `query` - User question/message
- `options.maxChunks` - Max chunks to retrieve (default: 8)
- `options.minSimilarity` - Min similarity threshold (default: 0.7)
- `options.maxContextChars` - Max context size (default: 12,000)
- `options.version` - Brain version (default: "1.0.0")
- `options.tags` - Filter by tags (optional)

**Returns:**
```javascript
{
  context: "...",           // Formatted context string
  chunksUsed: 6,            // Number of chunks used
  totalChars: 8543,         // Total characters
  sources: ["BTRIX_PACKS.md", "BTRIX_CORE.md"],
  chunks: [                 // Chunk metadata
    {
      source: "BTRIX_PACKS.md",
      section: "BTRIX Pro",
      similarity: 0.89,
      tokenCount: 750
    },
    ...
  ]
}
```

**Process:**
1. Generate embedding for user query
2. Call `match_brain_chunks` RPC function
3. Build context with character limit
4. Return context + metadata

**Graceful Degradation:**
- Returns empty context on error
- Logs errors but doesn't crash
- Bot can still respond with general knowledge

---

### 5. OpenAI Service Integration

**Updated:** `backend/src/services/openai.service.js`

**Changes:**
- `getSystemPrompt()` now uses RAG
- `chatCompletion()` retrieves context for each message
- Logs RAG metadata (chunks used, sources)

**System Prompt Structure:**
```
┌─────────────────────────────────────────┐
│  Base Prompt (Behavior Rules)           │
│  - Core principles                      │
│  - Tone and style                       │
│  - Important rules                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  RAG Context (Relevant Knowledge)       │
│  [Source: BTRIX_PACKS.md - BTRIX Pro]  │
│  Content: ...                           │
│  ---                                    │
│  [Source: BTRIX_AGENTS.md - Sales]     │
│  Content: ...                           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Language Instructions                  │
│  Respond in [language]                  │
└─────────────────────────────────────────┘
```

---

## Configuration

### Chunking Config (`scripts/chunker.js`)

```javascript
const CONFIG = {
  minTokens: 600,
  maxTokens: 900,
  overlapTokens: 100,
  estimatedCharsPerToken: 4,
};
```

### RAG Config (`backend/src/services/rag.service.js`)

```javascript
const RAG_CONFIG = {
  maxChunks: 8,
  minSimilarity: 0.7,
  maxContextChars: 12000,
  version: '1.0.0',
};
```

---

## Deployment Guide

### Step 1: Setup Supabase

1. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. Run setup script:
   ```bash
   psql -h <supabase-host> -U postgres -d postgres -f scripts/setup_pgvector.sql
   ```

3. Verify table creation:
   ```sql
   SELECT * FROM brain_chunks LIMIT 1;
   ```

---

### Step 2: Install Dependencies

```bash
# Brain scripts
cd btrix-brain/scripts
npm install

# Backend
cd ../../ai-chatbot-plataform/backend
npm install @supabase/supabase-js
```

---

### Step 3: Configure Environment Variables

Add to `backend/.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# OpenAI (already configured)
OPENAI_API_KEY=sk-...
```

---

### Step 4: Ingest Brain Documents

```bash
cd btrix-brain/scripts
npm run ingest
```

**Expected Output:**
```
╔══════════════════════════════════════╗
║   BTRIX Brain Ingestion Script      ║
╚══════════════════════════════════════╝

✓ Environment variables loaded
✓ Supabase URL: https://...
✓ OpenAI API Key: sk-...

--- Step 1: Chunking documents ---
Chunking BTRIX_CORE.md...
  → 8 chunks created
Chunking BTRIX_PACKS.md...
  → 12 chunks created
...

--- Step 2: Generating embeddings and ingesting ---
Ingesting 45 chunks...

Processing batch 1/5 (chunks 1-10)...
  ✓ BTRIX_CORE.md - Your Identity (650 tokens)
  ✓ BTRIX_CORE.md - Core Principles (720 tokens)
  ...

✅ Ingestion complete!
   Success: 45
   Errors: 0
   Total: 45

--- Step 3: Database statistics ---
Total chunks: 45
Total tokens: 32,450

By version:
  1.0.0: 45 chunks

By source:
  BTRIX_CORE.md: 8 chunks
  BTRIX_PACKS.md: 12 chunks
  BTRIX_AGENTS.md: 10 chunks
  BTRIX_FAQ.md: 10 chunks
  BTRIX_LIMITS.md: 5 chunks
```

---

### Step 5: Test RAG Retrieval

```bash
cd ../../ai-chatbot-plataform/backend
node -e "import('./src/services/rag.service.js').then(rag => rag.testRetrieval('How much does BTRIX Pro cost?'))"
```

**Expected Output:**
```
=== Testing RAG Retrieval ===
Query: How much does BTRIX Pro cost?

Chunks retrieved: 6
Total characters: 8543
Sources: BTRIX_PACKS.md, BTRIX_CORE.md

Context preview:
[Source: BTRIX_PACKS.md - BTRIX Pro]
BTRIX PRO

Setup: €2,200
Monthly: €550

Best for: Growing companies with higher volume (50-200 leads/day)
...

Chunk details:
  1. BTRIX_PACKS.md - BTRIX Pro (similarity: 0.923)
  2. BTRIX_PACKS.md - Pricing Overview (similarity: 0.887)
  3. BTRIX_CORE.md - Service Packs (similarity: 0.845)
  ...
```

---

### Step 6: Start Backend

```bash
cd ai-chatbot-plataform/backend
npm start
```

**Verify in logs:**
```
2026-01-02 02:00:00 [info]: RAG context retrieved {"chunksUsed":6,"sources":["BTRIX_PACKS.md","BTRIX_CORE.md"]}
```

---

## Usage Examples

### Example 1: Pricing Question

**User:** "How much does BTRIX Pro cost?"

**RAG Process:**
1. Generate embedding for query
2. Search vector DB → Find chunks about "Pro" and "pricing"
3. Retrieve top 6 chunks (similarity > 0.7)
4. Build context (8,543 chars)
5. Send to OpenAI with system prompt + context

**Bot Response:** "BTRIX Pro costs €2,200 for setup and €550 per month. It's best for growing companies handling 50-200 leads per day..."

**Chunks Used:**
- BTRIX_PACKS.md - BTRIX Pro (0.92 similarity)
- BTRIX_PACKS.md - Pricing Overview (0.89)
- BTRIX_CORE.md - Service Packs (0.85)

---

### Example 2: Agent Question

**User:** "What does the Sales Agent do?"

**RAG Process:**
1. Query embedding generated
2. Search → Find chunks tagged with "sales-agent"
3. Retrieve 4 chunks (similarity > 0.7)
4. Build context (5,234 chars)

**Bot Response:** "The Sales Agent qualifies leads, prioritizes opportunities, suggests follow-ups, and manages pipelines. It costs €200/month..."

**Chunks Used:**
- BTRIX_AGENTS.md - Sales Agent (0.95 similarity)
- BTRIX_AGENTS.md - Agent Overview (0.82)
- BTRIX_FAQ.md - What are AI Agents? (0.78)

---

### Example 3: Out-of-Scope Question

**User:** "Can you design my logo?"

**RAG Process:**
1. Query embedding generated
2. Search → Find chunks about "Design Agent" and "Limits"
3. Retrieve 3 chunks (similarity 0.72-0.81)
4. Build context (3,456 chars)

**Bot Response:** "That's outside BTRIX's scope. BTRIX focuses on automation systems, not design services. The Design Agent can create static designs based on templates, but not custom logo design. Would you like to explore what BTRIX can automate for your business?"

**Chunks Used:**
- BTRIX_LIMITS.md - We Are NOT an Agency (0.81)
- BTRIX_AGENTS.md - Design Agent (0.76)
- BTRIX_CORE.md - What BTRIX Does NOT Do (0.72)

---

## Monitoring and Logs

### RAG Metadata in Logs

Every chat completion logs RAG metadata:

```json
{
  "conversationId": "uuid",
  "chunksUsed": 6,
  "totalChars": 8543,
  "sources": ["BTRIX_PACKS.md", "BTRIX_CORE.md"],
  "chunks": [
    {
      "source": "BTRIX_PACKS.md",
      "section": "BTRIX Pro",
      "similarity": 0.923,
      "tokenCount": 750
    }
  ]
}
```

### Useful Queries

**Check chunk distribution:**
```sql
SELECT source, COUNT(*) as count
FROM brain_chunks
GROUP BY source
ORDER BY count DESC;
```

**Check average similarity:**
```sql
SELECT AVG(1 - (embedding <=> '[your_embedding]')) as avg_similarity
FROM brain_chunks;
```

**Find orphan chunks (no tags):**
```sql
SELECT id, source, section
FROM brain_chunks
WHERE tags = '{}' OR tags IS NULL;
```

---

## Maintenance

### Updating Brain Content

1. **Edit markdown files** in `btrix-brain/core/`
2. **Update version** in CHANGELOG.md (e.g., 1.0.0 → 1.1.0)
3. **Re-ingest:**
   ```bash
   cd btrix-brain/scripts
   node ingest.js ingest ../core 1.1.0
   ```
4. **Update RAG config** to use new version:
   ```javascript
   const RAG_CONFIG = {
     version: '1.1.0',  // Update this
   };
   ```
5. **Restart backend**

### Deleting Old Versions

```bash
node ingest.js delete 1.0.0
```

### Reindexing

If embeddings model changes or chunking strategy improves:

```bash
# Delete old version
node ingest.js delete 1.0.0

# Reingest with same version
node ingest.js ingest ../core 1.0.0
```

---

## Performance

### Benchmarks

**Chunking:**
- ~45 chunks from 5 documents
- ~2 seconds total

**Ingestion:**
- ~45 chunks with embeddings
- ~30 seconds (with rate limiting)
- ~$0.05 cost (OpenAI embeddings)

**Retrieval:**
- Query embedding: ~200ms
- Vector search: ~50ms
- Total: ~250ms per query

**Context Size:**
- Average: 8,000 characters
- Maximum: 12,000 characters
- ~2,000-3,000 tokens

---

## Troubleshooting

### Issue: "BOT_SYSTEM_PROMPT.md not found"

**Solution:** Ensure `btrix-brain` is cloned in the correct location:
```
/parent-directory/
├── btrix-brain/
└── ai-chatbot-plataform/
```

### Issue: "Cannot find module '@supabase/supabase-js'"

**Solution:**
```bash
cd ai-chatbot-plataform/backend
npm install @supabase/supabase-js
```

### Issue: "pgvector extension not found"

**Solution:** Enable pgvector in Supabase dashboard or run:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: "No chunks retrieved"

**Possible causes:**
1. Chunks not ingested yet → Run `npm run ingest`
2. Similarity threshold too high → Lower `minSimilarity` in config
3. Wrong version filter → Check `version` in RAG_CONFIG

### Issue: "Context too large"

**Solution:** Reduce `maxChunks` or `maxContextChars` in RAG_CONFIG:
```javascript
const RAG_CONFIG = {
  maxChunks: 6,              // Reduce from 8
  maxContextChars: 10000,    // Reduce from 12000
};
```

---

## Future Enhancements

### Phase 2: Advanced Filtering

- Filter by tags (e.g., only "pricing" chunks)
- Filter by source (e.g., only BTRIX_PACKS.md)
- Hybrid search (keyword + semantic)

### Phase 3: Multi-language

- Translate chunks to Portuguese, Spanish
- Store translations in separate columns
- Retrieve based on session language

### Phase 4: Analytics

- Track which chunks are used most
- Identify knowledge gaps
- A/B test chunking strategies

### Phase 5: Real-time Updates

- Webhook on Brain repository changes
- Auto-reingest on commit
- Zero-downtime version switching

---

## Summary

✅ **Vector database** configured (Supabase pgvector)  
✅ **Chunking** implemented (600-900 tokens, 100 overlap)  
✅ **Ingestion** automated (embeddings + upsert)  
✅ **Retrieval** optimized (top-k, character limit)  
✅ **Integration** complete (RAG in chatbot)  
✅ **Monitoring** enabled (logs + metadata)  
✅ **Documentation** comprehensive  

**Status:** Production-ready ✅

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-02  
**Maintained by:** BTRIX Dev Team
