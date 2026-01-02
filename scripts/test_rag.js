import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '/home/ubuntu/btrix-brain/scripts/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function testRAG(query) {
  console.log(`\n🔍 Query: "${query}"\n`);
  
  // 1. Generate embedding
  console.log('1️⃣ Generating embedding...');
  const embedding = await generateEmbedding(query);
  console.log(`   ✓ Embedding generated (${embedding.length} dimensions)\n`);
  
  // 2. Search chunks
  console.log('2️⃣ Searching knowledge base...');
  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    p_brain_id: 'btrix-core',
    p_query_embedding: embedding,
    p_match_count: 5,
    p_source: null,
  });
  
  if (error) {
    console.error('   ✗ Error:', error.message);
    return;
  }
  
  console.log(`   ✓ Found ${data.length} relevant chunks\n`);
  
  // 3. Display results
  console.log('3️⃣ Top results:\n');
  data.forEach((chunk, idx) => {
    console.log(`   ${idx + 1}. [${chunk.source}] ${chunk.title}`);
    console.log(`      Similarity: ${(chunk.similarity * 100).toFixed(1)}%`);
    console.log(`      Preview: ${chunk.content.substring(0, 100)}...`);
    console.log('');
  });
  
  // 4. Build context
  const contextParts = data.map(chunk => 
    `[Source: ${chunk.source} - ${chunk.title}]\n${chunk.content}`
  );
  const context = contextParts.join('\n\n---\n\n');
  
  console.log(`4️⃣ Context built:`);
  console.log(`   Total characters: ${context.length}`);
  console.log(`   Chunks used: ${data.length}\n`);
  
  return { chunks: data, context };
}

// Run tests
async function main() {
  console.log('🧪 Testing BTRIX RAG System\n');
  console.log('=' .repeat(60));
  
  const queries = [
    'Quanto custa o BTRIX PRO?',
    'Quais agentes estão disponíveis?',
    'O que a BTRIX NÃO faz?',
  ];
  
  for (const query of queries) {
    await testRAG(query);
    console.log('=' .repeat(60));
  }
  
  console.log('\n✅ RAG test complete!');
}

main().catch(console.error);
