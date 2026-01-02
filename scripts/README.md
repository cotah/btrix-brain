# BTRIX Brain Scripts

Automated scripts for chunking, embedding, and ingesting BTRIX Brain knowledge into vector database.

---

## Prerequisites

1. **Node.js** 18+ installed
2. **Supabase** project with pgvector enabled
3. **OpenAI API** key
4. **Environment variables** configured

---

## Installation

```bash
cd btrix-brain/scripts
npm install
```

---

## Environment Variables

Create `.env` file or use existing from `ai-chatbot-plataform/backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
```

---

## Usage

### 1. Chunk Documents

Split markdown files into overlapping chunks:

```bash
node chunker.js ../core 1.0.0
```

**Output:** `../chunks_output.json`

---

### 2. Ingest to Vector Database

Generate embeddings and upload to Supabase:

```bash
npm run ingest
# or
node ingest.js ingest ../core 1.0.0
```

---

### 3. View Statistics

```bash
npm run stats
# or
node ingest.js stats
```

---

### 4. Delete Version

```bash
node ingest.js delete 1.0.0
```

---

## Scripts

### `chunker.js`

**Purpose:** Split markdown documents into chunks

**Features:**
- 600-900 token chunks
- 100 token overlap
- Automatic tag extraction
- SHA256 hash for deduplication

**Usage:**
```bash
node chunker.js <directory> [version]
```

---

### `ingest.js`

**Purpose:** Generate embeddings and upsert to Supabase

**Commands:**
- `ingest [directory] [version]` - Ingest all documents
- `delete <version>` - Delete all chunks for version
- `stats` - Show database statistics

**Features:**
- Batch processing (10 chunks at a time)
- Rate limiting (1s delay)
- Error handling
- Progress logging

---

## Configuration

### Chunking Config (`chunker.js`)

```javascript
const CONFIG = {
  minTokens: 600,
  maxTokens: 900,
  overlapTokens: 100,
  estimatedCharsPerToken: 4,
};
```

---

## Troubleshooting

### "Missing environment variables"

Ensure `.env` file exists with required variables.

### "Cannot find module"

Run `npm install` in the scripts directory.

### "Supabase connection error"

Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct.

---

## See Also

- [RAG_IMPLEMENTATION.md](../RAG_IMPLEMENTATION.md) - Complete RAG documentation
- [setup_pgvector.sql](./setup_pgvector.sql) - Database setup script
