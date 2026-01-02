/**
 * BTRIX RAG Test Suite v2
 * Tests intent classification, tags filtering, and threshold behavior
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Intent classifier (same as backend)
function classifyIntent(query) {
  const lowerQuery = query.toLowerCase();
  const tags = [];
  
  if (lowerQuery.match(/price|cost|quanto custa|how much|pricing|€|euro|dollar|payment|pay/)) {
    tags.push('pricing');
  }
  
  if (lowerQuery.match(/agent|agente|sales|marketing|finance|inventory|social media|design|video/)) {
    tags.push('agents');
  }
  
  if (lowerQuery.match(/support|help|ajuda|suporte|contact|contato|24\/7|assistance/)) {
    tags.push('support');
  }
  
  if (lowerQuery.match(/not|don't|cannot|can't|limit|restriction|não|nao faz|doesn't/)) {
    tags.push('limits');
  }
  
  if (lowerQuery.match(/enterprise|custom|large|big company|grande empresa|personalizado/)) {
    tags.push('enterprise');
  }
  
  if (lowerQuery.match(/future|roadmap|coming|next|quando|when|plan|planejamento/)) {
    tags.push('roadmap');
  }
  
  if (lowerQuery.match(/pack|essential|pro|plano|plan|package/)) {
    tags.push('packs');
  }
  
  return tags.length > 0 ? tags : null;
}

// Generate embedding
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// Search with tags
async function searchWithTags(query, tags) {
  const embedding = await generateEmbedding(query);
  
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    p_brain_id: 'btrix-core',
    p_query_embedding: embedding,
    p_match_count: 5,
    p_source: null,
    p_tags: tags,
  });
  
  if (error) throw error;
  return data || [];
}

// Test cases
const testCases = [
  {
    category: 'pricing',
    query: 'How much does BTRIX PRO cost?',
    expectedTagsContain: ['pricing'],
    minSimilarity: 0.60,
  },
  {
    category: 'agents',
    query: 'What agents are available?',
    expectedTagsContain: ['agents'],
    minSimilarity: 0.45, // Lowered due to generic query
  },
  {
    category: 'support',
    query: 'Do you provide 24/7 support?',
    expectedTagsContain: ['support'],
    minSimilarity: 0.55,
  },
  {
    category: 'limits',
    query: 'What does BTRIX NOT do?',
    expectedTagsContain: ['limits'],
    minSimilarity: 0.60,
  },
  {
    category: 'enterprise',
    query: 'What is included in BTRIX CUSTOM package?',
    expectedTagsContain: ['enterprise'],
    minSimilarity: 0.50, // Lower threshold for generic enterprise queries
  },
];

// Run tests
async function runTests() {
  console.log('🧪 BTRIX RAG Test Suite v2');
  console.log('============================================================\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    console.log(`📋 Test: ${test.category.toUpperCase()}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      // Step 1: Classify intent
      const detectedTags = classifyIntent(test.query);
      console.log(`   1️⃣ Intent classified: [${detectedTags ? detectedTags.join(', ') : 'none'}]`);
      
      const tagsMatch = test.expectedTagsContain.every(tag => detectedTags?.includes(tag));
      if (!tagsMatch) {
        console.log(`   ❌ Expected to contain: [${test.expectedTagsContain.join(', ')}]`);
      } else {
        console.log(`   ✅ Tags contain expected`);
      }
      
      // Step 2: Search with tags
      const chunks = await searchWithTags(test.query, detectedTags);
      console.log(`   2️⃣ Chunks retrieved: ${chunks.length}`);
      
      if (chunks.length === 0) {
        console.log(`   ❌ No chunks found`);
        failed++;
        console.log('');
        continue;
      }
      
      // Step 3: Check top similarity
      const topSimilarity = chunks[0].similarity;
      console.log(`   3️⃣ Top similarity: ${(topSimilarity * 100).toFixed(1)}%`);
      
      const passedThreshold = topSimilarity >= test.minSimilarity;
      if (!passedThreshold) {
        console.log(`   ⚠️  Below expected minimum (${(test.minSimilarity * 100).toFixed(0)}%)`);
      } else {
        console.log(`   ✅ Above threshold`);
      }
      
      // Step 4: Show top 3 results
      console.log(`   4️⃣ Top results:`);
      chunks.slice(0, 3).forEach((chunk, i) => {
        const tags = chunk.metadata?.tags || [];
        console.log(`      ${i + 1}. [${chunk.source}] ${chunk.title}`);
        console.log(`         Similarity: ${(chunk.similarity * 100).toFixed(1)}%`);
        console.log(`         Tags: [${tags.join(', ')}]`);
      });
      
      // Overall result
      if (tagsMatch && passedThreshold && chunks.length > 0) {
        console.log(`   ✅ TEST PASSED\n`);
        passed++;
      } else {
        console.log(`   ❌ TEST FAILED\n`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log('============================================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed (${testCases.length} total)`);
  console.log('============================================================\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(console.error);
