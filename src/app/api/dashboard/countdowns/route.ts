import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';

export async function GET() {
  try {
    const result = await db
      .select({
        id: countdowns.id,
        name: countdowns.name,
        targetTime: countdowns.targetTime,
        targetDate: countdowns.targetDate,
        recurrence: countdowns.recurrence,
      })
      .from(countdowns);

    return NextResponse.json({ countdowns: result });
  } catch (error) {
    console.error('Error fetching countdowns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countdowns' },
      { status: 500 }
    );
  }
}
