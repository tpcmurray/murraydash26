import { NextResponse } from 'next/server';
import { db } from '@/db';
import { scienceFacts } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Select a random fact seeded by the current date, so it's consistent
    // throughout the day but changes at midnight.
    // Uses md5(id || current_date) as a deterministic sort key.
    const result = await db
      .select({
        id: scienceFacts.id,
        category: scienceFacts.category,
        factText: scienceFacts.factText,
        imageUrl: scienceFacts.imageUrl,
        imageFilename: scienceFacts.imageFilename,
        sourceUrl: scienceFacts.sourceUrl,
      })
      .from(scienceFacts)
      .orderBy(sql`md5(${scienceFacts.id}::text || current_date::text)`)
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({
        fact: null,
        message: 'No science facts available',
      });
    }

    const fact = result[0];
    return NextResponse.json({
      fact: {
        id: fact.id,
        category: fact.category,
        text: fact.factText,
        imageUrl: fact.imageFilename
          ? `/api/dashboard/science-fact/image/${fact.id}`
          : fact.imageUrl,
        sourceUrl: fact.sourceUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching science fact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch science fact' },
      { status: 500 }
    );
  }
}
