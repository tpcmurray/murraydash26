import { NextResponse } from 'next/server';
import { getFamilyCalendarEvents } from '@/lib/google-calendar';

export async function GET() {
  try {
    const calendarData = await getFamilyCalendarEvents(3);
    const events = (calendarData as { events: Array<{ id: string; summary: string; start: string; end: string; allDay: boolean; calendarId: string; calendarName: string; color: string }> }).events;

    // Get today's date string to exclude today's events
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const upcomingEvents = events
      .filter(e => {
        const eventDate = e.allDay ? e.start : e.start.split('T')[0];
        return eventDate > todayStr;
      })
      .map(e => {
        const eventDate = new Date(e.allDay ? e.start + 'T00:00:00' : e.start);
        const dayAbbr = eventDate.toLocaleDateString('en-US', { weekday: 'short' });

        let timeStr = '';
        if (!e.allDay) {
          const h = eventDate.getHours();
          const m = eventDate.getMinutes();
          const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
          const suffix = h < 12 ? 'am' : 'pm';
          timeStr = m === 0 ? ` ${hour12}${suffix}` : ` ${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
        }

        return {
          id: e.id,
          day: dayAbbr,
          event: e.summary + timeStr,
          date: e.allDay ? e.start : e.start.split('T')[0],
          calendarName: e.calendarName,
          color: e.color,
        };
      });

    return NextResponse.json({ events: upcomingEvents });
  } catch (error) {
    console.error('Error fetching coming up events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coming up events' },
      { status: 500 }
    );
  }
}
