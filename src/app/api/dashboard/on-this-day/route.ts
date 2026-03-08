import { NextResponse } from 'next/server';
import { db } from '@/db';
import { onThisDay } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const result = await db
      .select({
        year: onThisDay.year,
        event: onThisDay.event,
      })
      .from(onThisDay)
      .where(and(eq(onThisDay.month, month), eq(onThisDay.day, day)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ entry: null });
    }

    return NextResponse.json({ entry: result[0] });
  } catch (error) {
    console.error('Error fetching on-this-day:', error);
    return NextResponse.json({ error: 'Failed to fetch on-this-day' }, { status: 500 });
  }
}
