import { NextResponse } from 'next/server';
import { getFamilyCalendarEvents } from '@/lib/google-calendar';

type FamilyEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  color: string;
};

// Returns raw event times; the dashboard filters to "after today" and formats
// in the browser's timezone, so the server's clock never shifts what is shown.
export async function GET() {
  try {
    const calendarData = await getFamilyCalendarEvents(3);
    const events = (calendarData as { events: FamilyEvent[] }).events;

    // The same Google event can appear on several family calendars; show it once
    const seen = new Set<string>();
    const upcoming = events
      .filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .map(e => ({
        id: e.id,
        summary: e.summary,
        start: e.start,
        allDay: e.allDay,
        calendarName: e.calendarName,
        color: e.color,
      }));

    return NextResponse.json({ events: upcoming });
  } catch (error) {
    console.error('Error fetching coming up events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coming up events' },
      { status: 500 }
    );
  }
}
