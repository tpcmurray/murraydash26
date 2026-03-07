import { google } from 'googleapis';

// Calendar member configuration
export interface CalendarMember {
  id: string;
  name: string;
  color: string;
  email: string;
}

// Configure the family calendar members
export const CALENDAR_MEMBERS: CalendarMember[] = [
  { id: 'terry', name: 'Terry', color: '#9ca3af', email: process.env.GOOGLE_CALENDAR_TERRY_EMAIL || 'terrymurray@gmail.com' },
  { id: 'nicole', name: 'Nicole', color: '#22c55e', email: process.env.GOOGLE_CALENDAR_NICOLE_EMAIL || 'nicole.murray@gmail.com' },
  { id: 'skylar', name: 'Skylar', color: '#f472b6', email: process.env.GOOGLE_CALENDAR_SKYLAR_EMAIL || '' },
  { id: 'addison', name: 'Addison', color: '#60a5fa', email: process.env.GOOGLE_CALENDAR_ADDISON_EMAIL || '' },
  { id: 'family', name: 'Family', color: '#fbbf24', email: process.env.GOOGLE_CALENDAR_FAMILY_EMAIL || '' },
];

// Simple in-memory cache for calendar events
const cache = {
  data: null as unknown,
  timestamp: 0,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
};

// Create authenticated calendar client using GoogleAuth
async function getCalendarClient() {
  const { JWT } = await import('google-auth-library');
  
  const jwtClient = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || undefined,
    key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  const calendar = google.calendar({ version: 'v3', auth: jwtClient });
  return calendar;
}

// Fetch events from a specific calendar
async function getCalendarEvents(
  calendarId: string,
  timeMin: Date,
  timeMax: Date
) {
  const calendar = await getCalendarClient();
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });
  
  return response.data.items || [];
}

// Fetch all family calendar events for a date range (with caching)
export async function getFamilyCalendarEvents(days: number = 3) {
  const now = new Date();
  
  // Check cache
  if (cache.data && (now.getTime() - cache.timestamp) < cache.CACHE_TTL) {
    return cache.data;
  }
  
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(startOfDay);
  endDate.setDate(endDate.getDate() + days);
  
  const allEvents: Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
    allDay: boolean;
    calendarId: string;
    calendarName: string;
    color: string;
  }> = [];
  
  // Fetch events from each family member's calendar
  for (const member of CALENDAR_MEMBERS) {
    if (!member.email) continue;
    
    try {
      const events = await getCalendarEvents(member.email, startOfDay, endDate);
      
      for (const event of events) {
        const start = event.start?.dateTime || event.start?.date || '';
        const end = event.end?.dateTime || event.end?.date || '';
        
        allEvents.push({
          id: event.id || Math.random().toString(36),
          summary: event.summary || 'Untitled',
          start,
          end,
          allDay: !!event.start?.date,
          calendarId: member.id,
          calendarName: member.name,
          color: member.color,
        });
      }
    } catch (error) {
      console.error(`Error fetching calendar for ${member.name}:`, error);
    }
  }
  
  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  
  const result = {
    events: allEvents,
    startDate: startOfDay.toISOString(),
    endDate: endDate.toISOString(),
  };
  
  // Update cache
  cache.data = result;
  cache.timestamp = now.getTime();
  
  return result;
}

// Get all-day events for today
export function getAllDayEvents(events: Array<{
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  color: string;
  summary: string;
}>) {
  return events.filter(e => e.allDay);
}

// Get timed events for today
export function getTimedEvents(events: Array<{
  allDay: boolean;
  start: string;
  end: string;
  calendarId: string;
  calendarName: string;
  color: string;
  summary: string;
}>) {
  return events.filter(e => !e.allDay);
}

// Clear the cache (useful for testing or manual refresh)
export function clearCalendarCache() {
  cache.data = null;
  cache.timestamp = 0;
}
