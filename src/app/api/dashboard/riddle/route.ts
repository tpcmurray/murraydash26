import { NextResponse } from 'next/server';
import { db } from '@/db';
import { riddles } from '@/db/schema';
import { eq } from 'drizzle-orm';

function getDayOfYear(date: Date): number {
  // Use UTC to avoid DST issues
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export async function GET() {
  try {
    const now = new Date();
    const todayDOY = getDayOfYear(now);

    // Yesterday's day-of-year (wrap around for Jan 1)
    let yesterdayDOY: number;
    if (todayDOY === 1) {
      yesterdayDOY = isLeapYear(now.getFullYear() - 1) ? 366 : 365;
    } else {
      yesterdayDOY = todayDOY - 1;
    }

    const [todayResult, yesterdayResult] = await Promise.all([
      db.select({ riddle: riddles.riddle })
        .from(riddles)
        .where(eq(riddles.dayOfYear, todayDOY))
        .limit(1),
      db.select({ riddle: riddles.riddle, answer: riddles.answer })
        .from(riddles)
        .where(eq(riddles.dayOfYear, yesterdayDOY))
        .limit(1),
    ]);

    return NextResponse.json({
      today: todayResult.length > 0 ? { riddle: todayResult[0].riddle } : null,
      yesterday: yesterdayResult.length > 0
        ? { riddle: yesterdayResult[0].riddle, answer: yesterdayResult[0].answer }
        : null,
    });
  } catch (error) {
    console.error('Error fetching riddle:', error);
    return NextResponse.json({ error: 'Failed to fetch riddle' }, { status: 500 });
  }
}
