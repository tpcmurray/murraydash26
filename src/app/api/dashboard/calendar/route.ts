import { NextResponse } from 'next/server';
import { getFamilyCalendarEvents } from '@/lib/google-calendar';

export async function GET() {
  try {
    const calendarData = await getFamilyCalendarEvents(3);
    return NextResponse.json(calendarData);
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
