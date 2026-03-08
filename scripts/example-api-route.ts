/**
 * Example Next.js API route: GET /api/dashboard/science-fact
 * 
 * Returns one random science fact, deterministic per day.
 * The md5 hash of (id + today's date) creates a stable daily ordering
 * so every client sees the same fact all day, and it changes at midnight.
 * 
 * Place at: src/app/api/dashboard/science-fact/route.ts
 */

import { db } from '@/db'; // adjust to your drizzle instance path
import { scienceFacts } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const [fact] = await db
    .select({
      id: scienceFacts.id,
      category: scienceFacts.category,
      factText: scienceFacts.factText,
      imageFilename: scienceFacts.imageFilename,
    })
    .from(scienceFacts)
    .orderBy(sql`md5(${scienceFacts.id}::text || ${today})`)
    .limit(1);

  if (!fact) {
    return NextResponse.json({ fact: null }, { status: 200 });
  }

  return NextResponse.json({
    fact: {
      id: fact.id,
      category: fact.category,
      text: fact.factText,
      // Serve image from a static route or a separate image-serving endpoint
      imageUrl: fact.imageFilename
        ? `/api/dashboard/science-fact/image/${fact.id}`
        : null,
    },
  });
}
