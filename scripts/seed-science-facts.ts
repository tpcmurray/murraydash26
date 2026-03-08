/**
 * Seed script: loads science facts from the scraped JSON + images into Postgres.
 * 
 * Place this at: scripts/seed-science-facts.ts
 * Place the scraper output at: data/science-facts.json and data/images/
 * 
 * Run: npx tsx scripts/seed-science-facts.ts
 * 
 * Prerequisites:
 *   - Your .env.local must have DATABASE_URL set
 *   - The science_facts table must exist (run drizzle-kit push first)
 *   - The data/ folder must contain the scraper output
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { scienceFacts } from '../src/db/schema'; // adjust path to your schema
import { config } from 'dotenv';
config({ path: '.env.local' });

interface ScrapedFact {
  id: string;
  category: string;
  factText: string;
  imageFilename: string | null;
  imageUrl: string | null;
  sourceUrl: string;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  const DATA_DIR = join(process.cwd(), 'data');
  const JSON_PATH = join(DATA_DIR, 'science-facts.json');
  const IMAGE_DIR = join(DATA_DIR, 'images');

  if (!existsSync(JSON_PATH)) {
    console.error(`❌ ${JSON_PATH} not found. Run the scraper first.`);
    process.exit(1);
  }

  // Load scraped data
  const facts: ScrapedFact[] = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  console.log(`📂 Loaded ${facts.length} facts from JSON`);

  // Connect to database
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  // Clear existing facts (idempotent re-seeding)
  console.log('🗑  Clearing existing science_facts...');
  await db.delete(scienceFacts);

  // Insert facts in batches of 20
  const BATCH_SIZE = 20;
  let inserted = 0;
  let imagesLoaded = 0;

  for (let i = 0; i < facts.length; i += BATCH_SIZE) {
    const batch = facts.slice(i, i + BATCH_SIZE);

    const rows = batch.map((fact) => {
      // Try to load the image file as binary
      let imageData: Buffer | null = null;
      if (fact.imageFilename) {
        const imagePath = join(IMAGE_DIR, fact.imageFilename);
        if (existsSync(imagePath)) {
          imageData = readFileSync(imagePath);
          imagesLoaded++;
        }
      }

      return {
        id: fact.id,
        category: fact.category as 'astronomy' | 'mathematics' | 'physics' | 'chemistry' | 'biology',
        factText: fact.factText,
        imageUrl: fact.imageUrl,
        imageFilename: fact.imageFilename,
        imageData,
        sourceUrl: fact.sourceUrl,
      };
    });

    await db.insert(scienceFacts).values(rows);
    inserted += rows.length;
    console.log(`  ✓ Inserted ${inserted}/${facts.length} facts`);
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Facts inserted: ${inserted}`);
  console.log(`   Images loaded: ${imagesLoaded}`);
  console.log(`   Missing images: ${inserted - imagesLoaded}`);

  // Print category breakdown
  console.log('\nBy category:');
  const categories = [...new Set(facts.map((f) => f.category))];
  for (const cat of categories) {
    const count = facts.filter((f) => f.category === cat).length;
    console.log(`   ${cat}: ${count}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
