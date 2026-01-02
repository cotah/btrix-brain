/**
 * BTRIX Brain Ingestion Script
 * Chunks documents, generates embeddings, and upserts to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { chunkDirectory } from './chunker.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../ai-chatbot-plataform/backend/.env') });

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Upsert chunk to Supabase
 */
async function upsertChunk(chunk, embedding) {
  try {
    const { data, error } = await supabase
      .from('brain_chunks')
      .upsert({
        content: chunk.content,
        source: chunk.source,
        section: chunk.section,
        tags: chunk.tags,
        version: chunk.version,
        content_hash: chunk.content_hash,
        token_count: chunk.token_count,
        embedding: embedding,
      }, {
        onConflict: 'content_hash',
      });
    
    if (error) {
      console.error('Error upserting chunk:', error.message);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in upsertChunk:', error.message);
    throw error;
  }
}

/**
 * Ingest all chunks with rate limiting
 */
async function ingestChunks(chunks, batchSize = 10, delayMs = 1000) {
  console.log(`\nIngesting ${chunks.length} chunks...`);
  console.log(`Batch size: ${batchSize}, Delay: ${delayMs}ms\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)})...`);
    
    const promises = batch.map(async (chunk) => {
      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk.content);
        
        // Upsert to Supabase
        await upsertChunk(chunk, embedding);
        
        return { success: true, chunk };
      } catch (error) {
        console.error(`  ✗ Failed: ${chunk.source} - ${chunk.section}`);
        console.error(`    Error: ${error.message}`);
        return { success: false, chunk, error };
      }
    });
    
    const results = await Promise.all(promises);
    
    // Count successes and errors
    results.forEach(result => {
      if (result.success) {
        successCount++;
        console.log(`  ✓ ${result.chunk.source} - ${result.chunk.section} (${result.chunk.token_count} tokens)`);
      } else {
        errorCount++;
      }
    });
    
    // Delay between batches to avoid rate limits
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total: ${chunks.length}`);
  
  return { successCount, errorCount };
}

/**
 * Delete all chunks for a specific version
 */
async function deleteVersion(version) {
  console.log(`\nDeleting all chunks for version ${version}...`);
  
  const { data, error } = await supabase
    .from('brain_chunks')
    .delete()
    .eq('version', version);
  
  if (error) {
    console.error('Error deleting chunks:', error.message);
    throw error;
  }
  
  console.log(`✓ Deleted chunks for version ${version}`);
  return data;
}

/**
 * Get statistics about stored chunks
 */
async function getStats() {
  const { data, error } = await supabase
    .from('brain_chunks')
    .select('version, source, token_count');
  
  if (error) {
    console.error('Error fetching stats:', error.message);
    throw error;
  }
  
  const stats = {
    total: data.length,
    byVersion: {},
    bySource: {},
    totalTokens: 0,
  };
  
  data.forEach(chunk => {
    // By version
    if (!stats.byVersion[chunk.version]) {
      stats.byVersion[chunk.version] = 0;
    }
    stats.byVersion[chunk.version]++;
    
    // By source
    if (!stats.bySource[chunk.source]) {
      stats.bySource[chunk.source] = 0;
    }
    stats.bySource[chunk.source]++;
    
    // Total tokens
    stats.totalTokens += chunk.token_count;
  });
  
  return stats;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   BTRIX Brain Ingestion Script      ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OpenAI API key in .env file');
    console.error('   Required: OPENAI_API_KEY');
    process.exit(1);
  }
  
  console.log('✓ Environment variables loaded');
  console.log(`✓ Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`✓ OpenAI API Key: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
  
  if (command === 'ingest') {
    const dirPath = args[1] || path.join(__dirname, '../core');
    const version = args[2] || '1.0.0';
    
    console.log(`\nDirectory: ${dirPath}`);
    console.log(`Version: ${version}`);
    
    // Step 1: Chunk documents
    console.log('\n--- Step 1: Chunking documents ---');
    const chunks = chunkDirectory(dirPath, version);
    
    // Step 2: Ingest chunks
    console.log('\n--- Step 2: Generating embeddings and ingesting ---');
    await ingestChunks(chunks);
    
    // Step 3: Show stats
    console.log('\n--- Step 3: Database statistics ---');
    const stats = await getStats();
    console.log(`\nTotal chunks: ${stats.total}`);
    console.log(`Total tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`\nBy version:`);
    Object.entries(stats.byVersion).forEach(([version, count]) => {
      console.log(`  ${version}: ${count} chunks`);
    });
    console.log(`\nBy source:`);
    Object.entries(stats.bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} chunks`);
    });
    
  } else if (command === 'delete') {
    const version = args[1];
    
    if (!version) {
      console.error('❌ Usage: node ingest.js delete <version>');
      process.exit(1);
    }
    
    await deleteVersion(version);
    
  } else if (command === 'stats') {
    const stats = await getStats();
    console.log(`\nTotal chunks: ${stats.total}`);
    console.log(`Total tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`\nBy version:`);
    Object.entries(stats.byVersion).forEach(([version, count]) => {
      console.log(`  ${version}: ${count} chunks`);
    });
    console.log(`\nBy source:`);
    Object.entries(stats.bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} chunks`);
    });
    
  } else {
    console.log('Usage:');
    console.log('  node ingest.js ingest [directory] [version]');
    console.log('  node ingest.js delete <version>');
    console.log('  node ingest.js stats');
    console.log('\nExamples:');
    console.log('  node ingest.js ingest ../core 1.0.0');
    console.log('  node ingest.js delete 1.0.0');
    console.log('  node ingest.js stats');
    process.exit(1);
  }
  
  console.log('\n✅ Done!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export default {
  generateEmbedding,
  upsertChunk,
  ingestChunks,
  deleteVersion,
  getStats,
};
