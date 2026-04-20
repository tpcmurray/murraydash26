"use client";

import { useEffect, useState } from "react";
import { RRule } from "rrule";

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

  const h = time.getHours();
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";

  return <div className="clock-time">{hour12}:{minutes} <span className="clock-ampm">{ampm}</span></div>;
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
  const [fact, setFact] = useState<{ category: string; text: string; imageUrl: string | null } | null>(null);

  useEffect(() => {
    async function fetchFact() {
      try {
        const res = await fetch('/api/dashboard/science-fact');
        const data = await res.json();
        if (data.fact) {
          setFact({ category: data.fact.category, text: data.fact.text, imageUrl: data.fact.imageUrl });
        }
      } catch (error) {
        console.error('Error fetching science fact:', error);
      }
    }
    fetchFact();

    // Check every minute if the date has changed (midnight rotation)
    let currentDate = new Date().toDateString();
    const interval = setInterval(() => {
      const now = new Date().toDateString();
      if (now !== currentDate) {
        currentDate = now;
        fetchFact();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!fact) {
    return (
      <div className="fact-card">
        <div className="fact-label">Science Fact</div>
        <div className="fact-text" style={{ opacity: 0.5 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="fact-card">
      <div className="fact-label">Science Fact — {fact.category}</div>
      <div className="fact-body">
        {fact.imageUrl && (
          <img src={fact.imageUrl} alt="" className="fact-image" />
        )}
        <div className="fact-text">{fact.text}</div>
      </div>
    </div>
  );
}

function OnThisDay() {
  const [entry, setEntry] = useState<{ year: number; event: string } | null>(null);

  useEffect(() => {
    async function fetchEntry() {
      try {
        const res = await fetch('/api/dashboard/on-this-day');
        const data = await res.json();
        setEntry(data.entry || null);
      } catch (error) {
        console.error('Error fetching on-this-day:', error);
      }
    }
    fetchEntry();

    // Check every minute for midnight rollover
    let currentDate = new Date().toDateString();
    const interval = setInterval(() => {
      const now = new Date().toDateString();
      if (now !== currentDate) {
        currentDate = now;
        fetchEntry();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!entry) return null;

  return (
    <div className="on-this-day-card">
      <div className="on-this-day-label">On this day in {entry.year}:</div>
      <div className="on-this-day-text">{entry.event}</div>
    </div>
  );
}

type RiddleData = {
  today: { riddle: string } | null;
  yesterday: { riddle: string; answer: string } | null;
};

function Riddle() {
  const [data, setData] = useState<RiddleData | null>(null);

  useEffect(() => {
    async function fetchRiddle() {
      try {
        const res = await fetch('/api/dashboard/riddle');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Error fetching riddle:', error);
      }
    }
    fetchRiddle();

    let currentDate = new Date().toDateString();
    const interval = setInterval(() => {
      const now = new Date().toDateString();
      if (now !== currentDate) {
        currentDate = now;
        fetchRiddle();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data?.today) return null;

  return (
    <div className="riddle-card">
      <div className="riddle-label">Riddle of the Day</div>
      <div className="riddle-text">{data.today.riddle}</div>
      {data.yesterday && (
        <div className="riddle-answer">
          <span className="riddle-answer-label">Yesterday&apos;s answer:</span> {data.yesterday.answer}
        </div>
      )}
    </div>
  );
}

interface CountdownData {
  id: string;
  name: string;
  targetTime: string; // HH:MM for daily, full datetime for others
  targetDate: string | null;
  recurrence: string;
}

function Countdowns() {
  const [countdowns, setCountdowns] = useState<CountdownData[]>([]);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    async function fetchCountdowns() {
      try {
        const res = await fetch('/api/dashboard/countdowns');
        const data = await res.json();
        setCountdowns(data.countdowns || []);
      } catch (error) {
        console.error('Error fetching countdowns:', error);
      }
    }
    fetchCountdowns();
    const poll = setInterval(fetchCountdowns, 5 * 60 * 1000);
    return () => clearInterval(poll);
  }, []);

  // Tick every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getCountdownInfo = (cd: CountdownData): { value: string; level: string } => {
    if (cd.recurrence === 'daily' || cd.recurrence === 'weekdays') {
      // targetTime is HH:MM — compute time until next occurrence today
      const [h, m] = cd.targetTime.split(':').map(Number);

      let target = new Date(now);
      target.setHours(h, m, 0, 0);

      if (cd.recurrence === 'weekdays') {
        const rule = new RRule({
          freq: RRule.WEEKLY,
          byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
          dtstart: target,
        });
        const nextOccurrence = rule.after(now, true);
        if (!nextOccurrence) return { value: '—', level: 'normal' };
        target = nextOccurrence;
      } else {
        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }
      }

      const diffMs = target.getTime() - now.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const remMin = diffMin % 60;
      const remSec = diffSec % 60;

      // Determine urgency level
      const level = diffMs < 5 * 60 * 1000 ? 'critical'
        : diffMs < 30 * 60 * 1000 ? 'urgent'
        : diffMs < 2 * 60 * 60 * 1000 ? 'warning'
        : 'normal';

      // Format display
      if (diffMs < 60 * 1000) {
        return { value: `${remSec}s`, level };
      }
      if (diffMs < 5 * 60 * 1000) {
        return { value: `${diffMin}m ${remSec}s`, level };
      }
      if (diffHours > 0) {
        return { value: `${diffHours}h ${remMin}m`, level };
      }
      return { value: `${diffMin} min`, level };
    }

    // yearly or once — targetDate is a date string
    if (!cd.targetDate) return { value: '—', level: 'normal' };

    let target: Date;
    if (cd.recurrence === 'yearly') {
      const [, month, day] = cd.targetDate.split('-').map(Number);
      target = new Date(now.getFullYear(), month - 1, day);
      if (target < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        target = new Date(now.getFullYear() + 1, month - 1, day);
      }
    } else {
      target = new Date(cd.targetDate + 'T00:00:00');
    }

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((target.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { value: 'passed', level: 'normal' };
    if (diffDays === 0) return { value: 'today!', level: 'urgent' };
    if (diffDays === 1) return { value: 'tomorrow', level: 'urgent' };
    return { value: `${diffDays} days`, level: 'normal' };
  };

  if (countdowns.length === 0) {
    return <div className="countdown-list" style={{ opacity: 0.5 }}>No countdowns</div>;
  }

  // Sort countdowns by time until next occurrence (closest first)
  const sortedCountdowns = [...countdowns].sort((a, b) => {
    const infoA = getCountdownInfo(a);
    const infoB = getCountdownInfo(b);
    // Get milliseconds until each countdown
    const getMs = (cd: CountdownData): number => {
      if (cd.recurrence === 'daily' || cd.recurrence === 'weekdays') {
        const [h, m] = cd.targetTime?.split(':').map(Number) || [0, 0];
        let target = new Date(now);
        target.setHours(h, m, 0, 0);
        if (cd.recurrence === 'weekdays') {
          const rule = new RRule({
            freq: RRule.WEEKLY,
            byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
            dtstart: target,
          });
          const next = rule.after(now, true);
          return next ? next.getTime() - now.getTime() : Infinity;
        }
        if (target <= now) target.setDate(target.getDate() + 1);
        return target.getTime() - now.getTime();
      }
      if (!cd.targetDate) return Infinity;
      let target: Date;
      if (cd.recurrence === 'yearly') {
        const [, month, day] = cd.targetDate.split('-').map(Number);
        target = new Date(now.getFullYear(), month - 1, day);
        if (target < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
          target = new Date(now.getFullYear() + 1, month - 1, day);
        }
      } else {
        target = new Date(cd.targetDate + 'T00:00:00');
      }
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return target.getTime() - todayStart.getTime();
    };
    return getMs(a) - getMs(b);
  });

  return (
    <div className="countdown-list">
      {sortedCountdowns.map(cd => {
        const { value, level } = getCountdownInfo(cd);
        return (
          <div key={cd.id} className="countdown-item">
            <span className="countdown-name">{cd.name}</span>
            <span className={`countdown-value ${level}`}>
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Dinner() {
  const [dinners, setDinners] = useState<{ date: string; name: string | null; isOverride: boolean; overrideNotes: string | null }[]>([]);

  useEffect(() => {
    async function fetchDinners() {
      try {
        const res = await fetch('/api/dashboard/meals');
        const data = await res.json();
        setDinners(data.dinners || []);
      } catch (error) {
        console.error('Error fetching dinners:', error);
      }
    }
    fetchDinners();
    const poll = setInterval(fetchDinners, 5 * 60 * 1000);
    return () => clearInterval(poll);
  }, []);

  const formatDayLabel = (dateStr: string, index: number): string => {
    if (index === 0) return 'Tonight';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  if (dinners.length === 0) {
    return <div className="dinner-list" style={{ opacity: 0.5 }}>No dinners planned</div>;
  }

  return (
    <div className="dinner-list">
      {dinners.map((d, i) => (
        <div key={d.date} className={`dinner-box ${i === 0 ? 'dinner-tonight' : ''}`}>
          <div className="dinner-day">{formatDayLabel(d.date, i)}</div>
          <div className={`dinner-meal ${!d.name ? 'dinner-none' : ''} ${d.isOverride ? 'dinner-override' : ''}`}>
            {d.name || '—'}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComingUp() {
  const [events, setEvents] = useState<{ id: string; day: string; event: string; calendarName: string; color: string }[]>([]);

  useEffect(() => {
    async function fetchComingUp() {
      try {
        const res = await fetch('/api/dashboard/coming-up');
        const data = await res.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching coming up:', error);
      }
    }
    fetchComingUp();
    const poll = setInterval(fetchComingUp, 5 * 60 * 1000);
    return () => clearInterval(poll);
  }, []);

  if (events.length === 0) {
    return <div className="upcoming-list" style={{ opacity: 0.5 }}>Nothing coming up</div>;
  }

  return (
    <div className="upcoming-list">
      {events.map(item => (
        <div key={item.id} className="upcoming-item">
          <span className="upcoming-day">{item.day}</span>
          <span className="upcoming-name" style={{ color: item.color }}>{item.calendarName}</span>
          <span className="upcoming-event">{item.event}</span>
        </div>
      ))}
    </div>
  );
}

function Weather() {
  return (
    <div className="weather-iframe-container">
      <iframe
        src="https://weatheristic.com/"
        className="weather-iframe"
        title="Weatheristic"
      />
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
  const [dayOffset, setDayOffset] = useState(0);

  const START_HOUR = 7;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  // The date we're viewing (use local date, not UTC)
  const viewDate = new Date();
  viewDate.setDate(viewDate.getDate() + dayOffset);
  const viewDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(viewDate.getDate()).padStart(2, '0')}`;

  // Fetch calendar events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/dashboard/calendar');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching calendar:', error);
        setEvents([]);
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

  // Filter events for the viewed date
  const todayEvents = events.filter(e => {
    if (e.allDay) {
      // All-day events use date strings like "2026-03-09"
      return e.start === viewDateStr || e.end === viewDateStr;
    }
    const eventDate = e.start.split('T')[0];
    return eventDate === viewDateStr;
  });

  // Get all-day events
  const allDayEvents = todayEvents.filter(e => e.allDay);

  // Get timed events
  const timedEvents = todayEvents.filter(e => !e.allDay);

  // Format time for event display (e.g., "2pm", "3:30pm")
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const h = d.getHours();
    const m = d.getMinutes();
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const suffix = h < 12 ? 'am' : 'pm';
    return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, '0')}${suffix}`;
  };

  // Format time range, collapsing shared am/pm (e.g., "2 – 4pm")
  const formatTimeRange = (startStr: string, endStr: string) => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const sH = s.getHours();
    const eH = e.getHours();
    const samePeriod = (sH < 12) === (eH < 12);
    if (samePeriod) {
      const sH12 = sH === 0 ? 12 : sH > 12 ? sH - 12 : sH;
      const sM = s.getMinutes();
      const startPart = sM === 0 ? `${sH12}` : `${sH12}:${sM.toString().padStart(2, '0')}`;
      return `${startPart} – ${formatTime(endStr)}`;
    }
    return `${formatTime(startStr)} – ${formatTime(endStr)}`;
  };

  // Calculate event position in the grid
  const getEventPosition = (event: CalendarEvent) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    const startHour = startDate.getHours();
    const startMin = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMin = endDate.getMinutes();
    
    const top = ((startHour - START_HOUR + startMin / 60) / TOTAL_HOURS) * 100;
    const rawHeight = ((endHour - startHour + (endMin - startMin) / 60) / TOTAL_HOURS) * 100;
    // Subtract a small gap so back-to-back events don't touch
    const gap = 0.3;
    return { top, height: Math.max(rawHeight - gap, 2) };
  };

  // Get column index for a calendar
  const getColumnIndex = (calendarId: string) => {
    const cols = ['terry', 'nicole', 'skylar', 'addison', 'family'];
    return cols.indexOf(calendarId);
  };

  if (loading) {
    return (
      <div className="panel calendar-panel" style={{ gridRow: '1 / 4' }}>
        <div className="panel-label">{dayOffset === 0 ? 'Today' : viewDate.toLocaleDateString('en-US', { weekday: 'long' })} — {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-500">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="panel calendar-panel" style={{ gridRow: '1 / 4' }}>
      <div className="panel-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{dayOffset === 0 ? 'Today' : viewDate.toLocaleDateString('en-US', { weekday: 'long' })} — {viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        <span style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setDayOffset(d => d - 1)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #444', borderRadius: '4px', color: '#888', padding: '2px 8px', fontSize: '14px' }}>◀</button>
          {dayOffset !== 0 && (
            <button onClick={() => setDayOffset(0)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #444', borderRadius: '4px', color: '#888', padding: '2px 8px', fontSize: '12px' }}>today</button>
          )}
          <button onClick={() => setDayOffset(d => d + 1)} style={{ cursor: 'pointer', background: 'none', border: '1px solid #444', borderRadius: '4px', color: '#888', padding: '2px 8px', fontSize: '14px' }}>▶</button>
        </span>
      </div>

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

      {/* Column headers */}
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
                <div className="cal-event-title">{event.summary}</div>
                <div className="cal-event-time">{formatTimeRange(event.start, event.end)}</div>
              </div>
            );
          })}
        </div>
        
        {/* Current time indicator — only on today */}
        {dayOffset === 0 && currentTimePct > 0 && (
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
      <Calendar />

      {/* ==================== CENTER ROW 1: TIME / DATE / FACT ==================== */}
      <div className="panel">
        <div className="panel-label">Time / Date</div>
        <div className="panel-content">
          <Clock />
          <DateDisplay />
          <ScienceFact />
          <OnThisDay />
          <Riddle />
        </div>
      </div>

      {/* ==================== RIGHT ROW 1: WEATHER ==================== */}
      <div className="panel">
        <div className="panel-label">Weather — Weatheristic</div>
        <div className="panel-content">
          <Weather />
        </div>
      </div>

      {/* ==================== CENTER+RIGHT ROW 2: DINNER ==================== */}
      <div className="panel dinner-panel">
        <div className="panel-label">Dinner</div>
        <div className="panel-content">
          <Dinner />
        </div>
      </div>

      {/* ==================== CENTER ROW 3: COUNTDOWNS ==================== */}
      <div className="panel countdowns-panel">
        <div className="panel-label">Countdowns</div>
        <div className="panel-content">
          <Countdowns />
        </div>
      </div>

      {/* ==================== RIGHT ROW 3: COMING UP ==================== */}
      <div className="panel coming-up-panel">
        <div className="panel-label">Coming Up</div>
        <div className="panel-content">
          <ComingUp />
        </div>
      </div>
    </div>
  );
}
