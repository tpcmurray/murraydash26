"use client";

import { useEffect, useState } from "react";

// Clock component that updates every second
function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return <div className="clock-time">--:--</div>;

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");

  return <div className="clock-time">{hours}:{minutes}</div>;
}

// Full date display component
function DateDisplay() {
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: "long", 
        month: "long", 
        day: "numeric" 
      };
      setDate(now.toLocaleDateString("en-US", options));
    };
    
    updateDate();
    const interval = setInterval(updateDate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return <div className="clock-date">{date}</div>;
}

// Science Fact placeholder component
function ScienceFact() {
  // TODO: Fetch from API - /api/dashboard/science-fact
  const fact = {
    category: "Astronomy",
    text: "Mercury is the fastest planet in the Solar System, with a speed of about 45 km/second around the Sun."
  };

  return (
    <div className="fact-card">
      <div className="fact-label">Science Fact</div>
      <div className="fact-text">{fact.text}</div>
    </div>
  );
}

// Countdowns placeholder component
function Countdowns() {
  // TODO: Fetch from API - /api/dashboard/countdowns
  const countdowns = [
    { name: "School bus", value: "42 min", urgent: true },
    { name: "Skylar birthday", value: "14 days", urgent: false },
    { name: "Easter", value: "28 days", urgent: false },
    { name: "Summer break", value: "97 days", urgent: false },
  ];

  return (
    <div className="countdown-list">
      {countdowns.map((item, i) => (
        <div key={i} className="countdown-item">
          <span className="countdown-name">{item.name}</span>
          <span className={`countdown-value ${item.urgent ? "urgent" : ""}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// Tonight's Dinner placeholder component
function TonightsDinner() {
  // TODO: Fetch from API - /api/dashboard/meals
  return (
    <div className="dinner-content">
      <div className="dinner-name">Spaghetti</div>
      <div className="dinner-sub">& Garlic Bread</div>
    </div>
  );
}

// Reminders placeholder component
function Reminders() {
  // TODO: Fetch from API - /api/dashboard/reminders
  const reminders = [
    { text: "Take out frozen ground beef", urgent: true },
    { text: "Skylar: library books", urgent: false },
  ];

  return (
    <div className="reminder-list">
      {reminders.map((item, i) => (
        <div key={i} className={`reminder-item ${item.urgent ? "urgent" : "normal"}`}>
          <span className="reminder-bullet">●</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

// Coming Up placeholder component
function ComingUp() {
  // TODO: Fetch from API - /api/dashboard/coming-up
  const events = [
    { day: "Fri", event: "Basketball 3:30pm" },
    { day: "Fri", event: "Hip Hop Dance 5:15pm" },
    { day: "Sat", event: "Nasdaq Pay" },
    { day: "Sun", event: "Grocery run" },
  ];

  return (
    <div className="upcoming-list">
      {events.map((item, i) => (
        <div key={i} className="upcoming-item">
          <span className="upcoming-day">{item.day}</span>
          <span className="upcoming-event">{item.event}</span>
        </div>
      ))}
    </div>
  );
}

// Weather placeholder component
function Weather() {
  return (
    <div className="weather-iframe-placeholder">
      [Weatheristic iframe]
    </div>
  );
}

// Calendar data types
interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  color: string;
}

// Calendar placeholder component
function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentTimePct, setCurrentTimePct] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const START_HOUR = 7;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  // Fetch calendar events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/dashboard/calendar');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching calendar:', error);
        // Fallback demo data
        setEvents([
          { id: '1', summary: 'Annual Online Auction', start: '', end: '', allDay: true, calendarId: 'family', calendarName: 'Family', color: '#fbbf24' },
          { id: '2', summary: 'Standup', start: '2024-03-07T09:00:00', end: '2024-03-07T09:30:00', allDay: false, calendarId: 'terry', calendarName: 'Terry', color: '#9ca3af' },
          { id: '3', summary: 'Focus Block', start: '2024-03-07T10:00:00', end: '2024-03-07T12:00:00', allDay: false, calendarId: 'terry', calendarName: 'Terry', color: '#9ca3af' },
          { id: '4', summary: 'School', start: '2024-03-07T08:30:00', end: '2024-03-07T14:30:00', allDay: false, calendarId: 'skylar', calendarName: 'Skylar', color: '#f472b6' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
    
    // Poll every 5 minutes
    const pollInterval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(pollInterval);
  }, []);

  // Update current time indicator every minute
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      if (hours >= START_HOUR && hours <= END_HOUR) {
        const pct = ((hours - START_HOUR + minutes / 60) / TOTAL_HOURS) * 100;
        setCurrentTimePct(pct);
      }
    };
    
    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get today's date string for comparison
  const todayStr = new Date().toISOString().split('T')[0];

  // Filter events for today
  const todayEvents = events.filter(e => {
    const eventDate = e.start.split('T')[0];
    return eventDate === todayStr || (e.allDay && e.start.includes(todayStr.slice(0, 7)));
  });

  // Get all-day events
  const allDayEvents = todayEvents.filter(e => e.allDay);

  // Get timed events
  const timedEvents = todayEvents.filter(e => !e.allDay);

  // Calculate event position in the grid
  const getEventPosition = (event: CalendarEvent) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    const startHour = startDate.getHours();
    const startMin = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMin = endDate.getMinutes();
    
    const top = ((startHour - START_HOUR + startMin / 60) / TOTAL_HOURS) * 100;
    const height = ((endHour - startHour + (endMin - startMin) / 60) / TOTAL_HOURS) * 100;
    
    return { top, height: Math.max(height, 2) };
  };

  // Get column index for a calendar
  const getColumnIndex = (calendarId: string) => {
    const cols = ['terry', 'nicole', 'skylar', 'addison', 'family'];
    return cols.indexOf(calendarId);
  };

  if (loading) {
    return (
      <div className="calendar-panel">
        <div className="panel-label">Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-500">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-panel">
      <div className="panel-label">Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      
      {/* All-day events strip */}
      <div className="allday-strip">
        <div className="allday-label">ALL DAY</div>
        {allDayEvents.length > 0 ? (
          allDayEvents.map(event => (
            <div 
              key={event.id} 
              className="allday-event"
              style={{ backgroundColor: event.color }}
            >
              {event.summary}
            </div>
          ))
        ) : (
          <div className="allday-event" style={{ opacity: 0.5 }}>No all-day events</div>
        )}
      </div>

      // Column headers
      <div className="col-headers">
        <div className="col-header" style={{ color: '#9ca3af' }}>Terry</div>
        <div className="col-header" style={{ color: '#22c55e' }}>Nicole</div>
        <div className="col-header" style={{ color: '#f472b6' }}>Skylar</div>
        <div className="col-header" style={{ color: '#60a5fa' }}>Addison</div>
        <div className="col-header" style={{ color: '#fbbf24' }}>Family</div>
      </div>

      {/* Time grid with hour lines */}
      <div className="time-grid">
        {/* Hour lines */}
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
          const hour = START_HOUR + i;
          const pct = (i / TOTAL_HOURS) * 100;
          return (
            <div key={hour} className="hour-line" style={{ top: `${pct}%` }}>
              <span className="hour-label">
                {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
              </span>
              <div className="hour-rule"></div>
            </div>
          );
        })}
        
        {/* Events area */}
        <div className="events-area">
          {timedEvents.map(event => {
            const colIdx = getColumnIndex(event.calendarId);
            if (colIdx === -1) return null;
            
            const { top, height } = getEventPosition(event);
            const left = (colIdx * 20) + 2;
            const width = 18;
            
            return (
              <div
                key={event.id}
                className="cal-event"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: event.color,
                }}
              >
                {event.summary}
              </div>
            );
          })}
        </div>
        
        {/* Current time indicator */}
        {currentTimePct > 0 && (
          <div className="time-indicator" style={{ top: `${currentTimePct}%` }}>
            <div className="time-indicator-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="dashboard">
      {/* ==================== LEFT: CALENDAR (rows 1-3) ==================== */}
      <div className="panel calendar-panel" style={{ gridRow: "1 / 4" }}>
        <Calendar />
      </div>

      {/* ==================== CENTER ROW 1: TIME / DATE / FACT ==================== */}
      <div className="panel">
        <div className="panel-label">Time / Date</div>
        <div className="panel-content">
          <Clock />
          <DateDisplay />
          <ScienceFact />
        </div>
      </div>

      {/* ==================== RIGHT ROW 1: WEATHER ==================== */}
      <div className="panel">
        <div className="panel-label">Weather — Weatheristic</div>
        <div className="panel-content">
          <Weather />
        </div>
      </div>

      {/* ==================== CENTER ROW 2: COUNTDOWNS ==================== */}
      <div className="panel">
        <div className="panel-label">Countdowns</div>
        <div className="panel-content">
          <Countdowns />
        </div>
      </div>

      {/* ==================== RIGHT ROW 2: DINNER ==================== */}
      <div className="panel">
        <div className="panel-label">Tonight's Dinner</div>
        <div className="panel-content">
          <TonightsDinner />
        </div>
      </div>

      {/* ==================== CENTER ROW 3: REMINDERS ==================== */}
      <div className="panel">
        <div className="panel-label">Reminders</div>
        <div className="panel-content">
          <Reminders />
        </div>
      </div>

      {/* ==================== RIGHT ROW 3: COMING UP ==================== */}
      <div className="panel">
        <div className="panel-label">Coming Up</div>
        <div className="panel-content">
          <ComingUp />
        </div>
      </div>
    </div>
  );
}
