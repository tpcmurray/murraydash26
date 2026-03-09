/**
 * Seed script: loads riddles from JSON into Postgres.
 *
 * Run: npx tsx scripts/seed-riddles.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { riddles } from '../src/db/schema';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set in environment');
    process.exit(1);
  }

  const jsonPath = join(process.cwd(), 'data', 'riddles.json');
  const data: { day: number; riddle: string; answer: string }[] = JSON.parse(
    readFileSync(jsonPath, 'utf-8')
  );

  console.log(`Loaded ${data.length} riddles from JSON`);

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  console.log('Clearing existing riddles...');
  await db.delete(riddles);

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const rows = batch.map((item) => ({
      dayOfYear: item.day,
      riddle: item.riddle,
      answer: item.answer,
    }));

    await db.insert(riddles).values(rows);
    inserted += rows.length;
    console.log(`  Inserted ${inserted}/${data.length}`);
  }

  console.log(`\nDone! ${inserted} riddles seeded.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
