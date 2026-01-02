/**
 * BTRIX Brain Chunker
 * Splits markdown documents into overlapping chunks with metadata
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Chunking configuration
const CONFIG = {
  minTokens: 600,
  maxTokens: 900,
  overlapTokens: 100,
  estimatedCharsPerToken: 4, // Rough estimate: 1 token ≈ 4 characters
};

/**
 * Estimate token count from text
 */
function estimateTokens(text) {
  return Math.ceil(text.length / CONFIG.estimatedCharsPerToken);
}

/**
 * Generate SHA256 hash of content
 */
function generateHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extract tags from content based on keywords
 */
function extractTags(content, source) {
  const tags = [];
  
  // Source-based tags
  if (source.includes('PACKS')) tags.push('packs', 'pricing');
  if (source.includes('AGENTS')) tags.push('agents', 'add-ons');
  if (source.includes('LIMITS')) tags.push('limits', 'boundaries');
  if (source.includes('FAQ')) tags.push('faq', 'questions');
  if (source.includes('CORE')) tags.push('core', 'overview');
  
  // Content-based tags
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('essential')) tags.push('essential');
  if (lowerContent.includes('pro')) tags.push('pro');
  if (lowerContent.includes('enterprise') || lowerContent.includes('custom')) tags.push('enterprise');
  
  if (lowerContent.includes('sales agent')) tags.push('sales-agent');
  if (lowerContent.includes('marketing agent')) tags.push('marketing-agent');
  if (lowerContent.includes('finance agent')) tags.push('finance-agent');
  if (lowerContent.includes('inventory agent')) tags.push('inventory-agent');
  if (lowerContent.includes('social media agent')) tags.push('social-media-agent');
  if (lowerContent.includes('design agent')) tags.push('design-agent');
  if (lowerContent.includes('video agent')) tags.push('video-agent');
  
  if (lowerContent.includes('price') || lowerContent.includes('cost') || lowerContent.includes('€')) {
    tags.push('pricing');
  }
  
  if (lowerContent.includes('support') || lowerContent.includes('24/7')) {
    tags.push('support');
  }
  
  if (lowerContent.includes('demo') || lowerContent.includes('schedule')) {
    tags.push('demo');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Split text into sentences (rough approximation)
 */
function splitIntoSentences(text) {
  // Split by period, question mark, exclamation, or newline
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(s => s.trim().length > 0);
}

/**
 * Parse markdown to extract sections
 */
function parseMarkdown(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    // Check if line is a heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join('\n').trim(),
        });
      }
      
      // Start new section
      currentSection = headingMatch[2].trim();
      currentContent = [line]; // Include heading in content
    } else {
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentSection) {
    sections.push({
      title: currentSection,
      content: currentContent.join('\n').trim(),
    });
  }
  
  return sections;
}

/**
 * Chunk a section into overlapping pieces
 */
function chunkSection(sectionContent, minChars, maxChars, overlapChars) {
  const sentences = splitIntoSentences(sectionContent);
  const chunks = [];
  let currentChunk = [];
  let currentLength = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLength = sentence.length;
    
    // If adding this sentence exceeds max, save current chunk
    if (currentLength + sentenceLength > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      
      // Create overlap by keeping last few sentences
      const overlapSentences = [];
      let overlapLength = 0;
      
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const s = currentChunk[j];
        if (overlapLength + s.length <= overlapChars) {
          overlapSentences.unshift(s);
          overlapLength += s.length;
        } else {
          break;
        }
      }
      
      currentChunk = overlapSentences;
      currentLength = overlapLength;
    }
    
    currentChunk.push(sentence);
    currentLength += sentenceLength;
    
    // If we've reached minimum length and this is a natural break, consider saving
    if (currentLength >= minChars && (i === sentences.length - 1 || currentLength >= maxChars * 0.8)) {
      // Continue to next sentence unless we're at the end or very close to max
    }
  }
  
  // Save remaining chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  
  return chunks;
}

/**
 * Chunk a markdown document
 */
export function chunkDocument(filePath, version = '1.0.0') {
  const content = fs.readFileSync(filePath, 'utf-8');
  const source = path.basename(filePath);
  const sections = parseMarkdown(content);
  
  const allChunks = [];
  
  for (const section of sections) {
    const minChars = CONFIG.minTokens * CONFIG.estimatedCharsPerToken;
    const maxChars = CONFIG.maxTokens * CONFIG.estimatedCharsPerToken;
    const overlapChars = CONFIG.overlapTokens * CONFIG.estimatedCharsPerToken;
    
    const sectionChunks = chunkSection(section.content, minChars, maxChars, overlapChars);
    
    for (const chunkContent of sectionChunks) {
      const tokenCount = estimateTokens(chunkContent);
      const contentHash = generateHash(chunkContent);
      const tags = extractTags(chunkContent, source);
      
      allChunks.push({
        content: chunkContent,
        source,
        section: section.title,
        tags,
        version,
        content_hash: contentHash,
        token_count: tokenCount,
      });
    }
  }
  
  return allChunks;
}

/**
 * Chunk all documents in a directory
 */
export function chunkDirectory(dirPath, version = '1.0.0') {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
  const allChunks = [];
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    console.log(`Chunking ${file}...`);
    
    const chunks = chunkDocument(filePath, version);
    allChunks.push(...chunks);
    
    console.log(`  → ${chunks.length} chunks created`);
  }
  
  return allChunks;
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node chunker.js <directory> [version]');
    console.log('Example: node chunker.js ../core 1.0.0');
    process.exit(1);
  }
  
  const dirPath = args[0];
  const version = args[1] || '1.0.0';
  
  console.log(`\nBTRIX Brain Chunker`);
  console.log(`===================`);
  console.log(`Directory: ${dirPath}`);
  console.log(`Version: ${version}`);
  console.log(`Config: ${CONFIG.minTokens}-${CONFIG.maxTokens} tokens, ${CONFIG.overlapTokens} overlap\n`);
  
  const chunks = chunkDirectory(dirPath, version);
  
  console.log(`\n✅ Total chunks created: ${chunks.length}`);
  console.log(`\nSample chunk:`);
  console.log(`Source: ${chunks[0].source}`);
  console.log(`Section: ${chunks[0].section}`);
  console.log(`Tags: ${chunks[0].tags.join(', ')}`);
  console.log(`Tokens: ${chunks[0].token_count}`);
  console.log(`Content: ${chunks[0].content.substring(0, 200)}...\n`);
  
  // Save to JSON for inspection
  const outputPath = path.join(dirPath, '../chunks_output.json');
  fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2));
  console.log(`Chunks saved to: ${outputPath}`);
}

export default {
  chunkDocument,
  chunkDirectory,
  estimateTokens,
  generateHash,
  extractTags,
};
