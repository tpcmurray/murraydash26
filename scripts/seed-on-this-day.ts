/**
 * Seed script: loads "On This Day" historical events from CSV into Postgres.
 *
 * Run: npx tsx scripts/seed-on-this-day.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { onThisDay } from '../src/db/schema';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in environment');
    process.exit(1);
  }

  const csvPath = join(process.cwd(), 'data', 'on-this-day.csv');
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.trim().split('\n').slice(1); // skip header

  console.log(`Loaded ${lines.length} events from CSV`);

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  // Clear existing rows (idempotent)
  console.log('Clearing existing on_this_day...');
  await db.delete(onThisDay);

  // Parse and insert in batches
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);
    const rows = batch.map((line) => {
      // Parse: Month,Day,Year,"Event text" (event may be quoted)
      const clean = line.replace(/\r$/, '');
      const match = clean.match(/^(\d+),(\d+),(\d+),(.+)$/);
      if (!match) throw new Error(`Invalid CSV line: ${clean}`);
      // Strip surrounding quotes if present
      const event = match[4].trim().replace(/^"(.*)"$/, '$1');
      return {
        month: parseInt(match[1]),
        day: parseInt(match[2]),
        year: parseInt(match[3]),
        event,
      };
    });

    await db.insert(onThisDay).values(rows);
    inserted += rows.length;
    console.log(`  Inserted ${inserted}/${lines.length}`);
  }

  console.log(`\nDone! ${inserted} events seeded.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
