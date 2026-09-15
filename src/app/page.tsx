"use client";

import { useEffect, useState } from "react";
import { RRule } from "rrule";

// ==================== SHARED ====================

const MEMBERS = [
  { id: "terry", name: "Terry", color: "#9ca3af" },
  { id: "nicole", name: "Nicole", color: "#22c55e" },
  { id: "skylar", name: "Skylar", color: "#f472b6" },
  { id: "addison", name: "Addison", color: "#60a5fa" },
  { id: "family", name: "Family", color: "#fbbf24" },
];

const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

// Local (browser timezone) YYYY-MM-DD for a Date
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "2pm", "3:30pm"
function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const h = d.getHours();
  const m = d.getMinutes();
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const suffix = h < 12 ? "am" : "pm";
  return m === 0 ? `${hour12}${suffix}` : `${hour12}:${m.toString().padStart(2, "0")}${suffix}`;
}

// "2 – 4pm" when both ends share am/pm, otherwise "11am – 1pm"
function formatTimeRange(startStr: string, endStr: string): string {
  const s = new Date(startStr);
  const e = new Date(endStr);
  const samePeriod = (s.getHours() < 12) === (e.getHours() < 12);
  if (samePeriod) {
    const sH = s.getHours();
    const sH12 = sH === 0 ? 12 : sH > 12 ? sH - 12 : sH;
    const sM = s.getMinutes();
    const startPart = sM === 0 ? `${sH12}` : `${sH12}:${sM.toString().padStart(2, "0")}`;
    return `${startPart} – ${formatTime(endStr)}`;
  }
  return `${formatTime(startStr)} – ${formatTime(endStr)}`;
}

// Runs fn on mount and again whenever the local calendar date rolls over
function useDailyRefresh(fn: () => void) {
  useEffect(() => {
    fn();
    let currentDate = new Date().toDateString();
    const interval = setInterval(() => {
      const now = new Date().toDateString();
      if (now !== currentDate) {
        currentDate = now;
        fn();
      }
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Runs fn on mount and every `ms` after
function usePolling(fn: () => void, ms: number) {
  useEffect(() => {
    fn();
    const interval = setInterval(fn, ms);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Pick a text size class so longer passages still fit their card
function funTextClass(text: string): string {
  if (text.length > 220) return "fun-text fun-text-xs";
  if (text.length > 160) return "fun-text fun-text-sm";
  return "fun-text";
}

// ==================== CLOCK ====================

function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setTime(new Date());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <section className="card clock-card">
        <div className="clock-time">--:--</div>
      </section>
    );
  }

  const h = time.getHours();
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";

  return (
    <section className="card clock-card">
      <div className="clock-time">
        {hour12}:{minutes}
        <span className="clock-ampm">{ampm}</span>
      </div>
      <div className="clock-weekday">{time.toLocaleDateString("en-US", { weekday: "long" })}</div>
      <div className="clock-date">{time.toLocaleDateString("en-US", { month: "long", day: "numeric" })}</div>
    </section>
  );
}

// ==================== WEATHER ====================

function Weather() {
  return (
    <section className="card weather-card">
      <div className="weather-frame">
        <iframe src="https://weatheristic.com/" className="weather-iframe" title="Weatheristic" />
      </div>
    </section>
  );
}

// ==================== SCIENCE FACT ====================

function ScienceFact() {
  const [fact, setFact] = useState<{ category: string; text: string; imageUrl: string | null } | null>(null);

  useDailyRefresh(async () => {
    try {
      const res = await fetch("/api/dashboard/science-fact");
      const data = await res.json();
      if (data.fact) {
        setFact({ category: data.fact.category, text: data.fact.text, imageUrl: data.fact.imageUrl });
      }
    } catch (error) {
      console.error("Error fetching science fact:", error);
    }
  });

  return (
    <section className="card fun-card">
      <div className="card-label fact-label">Science fact{fact ? ` · ${fact.category}` : ""}</div>
      <div className="fun-body">
        {fact?.imageUrl && <img src={fact.imageUrl} alt="" className="fact-image" />}
        <div className={fact ? funTextClass(fact.text) : "fun-text fun-muted"}>{fact ? fact.text : "Loading…"}</div>
      </div>
    </section>
  );
}

// ==================== ON THIS DAY ====================

function OnThisDay() {
  const [entry, setEntry] = useState<{ year: number; event: string } | null>(null);

  useDailyRefresh(async () => {
    try {
      const res = await fetch("/api/dashboard/on-this-day");
      const data = await res.json();
      setEntry(data.entry || null);
    } catch (error) {
      console.error("Error fetching on-this-day:", error);
    }
  });

  return (
    <section className="card fun-card">
      <div className="card-label otd-label">On this day{entry ? ` · ${entry.year}` : ""}</div>
      <div className={entry ? funTextClass(entry.event) : "fun-text fun-muted"}>{entry ? entry.event : "Loading…"}</div>
    </section>
  );
}

// ==================== RIDDLE ====================

type RiddleData = {
  today: { riddle: string } | null;
  yesterday: { riddle: string; answer: string } | null;
};

function Riddle() {
  const [data, setData] = useState<RiddleData | null>(null);

  useDailyRefresh(async () => {
    try {
      const res = await fetch("/api/dashboard/riddle");
      setData(await res.json());
    } catch (error) {
      console.error("Error fetching riddle:", error);
    }
  });

  return (
    <section className="card riddle-card">
      <div className="card-label riddle-label">Riddle of the day</div>
      <div className={data?.today ? "riddle-text" : "riddle-text fun-muted"}>{data?.today ? data.today.riddle : "Loading…"}</div>
      {data?.yesterday && (
        <>
          <div className="riddle-divider" />
          <div className="card-label riddle-yesterday-label">Yesterday</div>
          <div className="riddle-yesterday">{data.yesterday.riddle}</div>
          <div className="riddle-answer">{data.yesterday.answer}</div>
        </>
      )}
    </section>
  );
}

// ==================== DINNER ====================

interface DinnerEntry {
  date: string;
  name: string | null;
  isOverride: boolean;
  overrideNotes: string | null;
  imageUrl: string | null;
}

function Dinner() {
  const [dinners, setDinners] = useState<DinnerEntry[]>([]);

  usePolling(async () => {
    try {
      const res = await fetch("/api/dashboard/meals");
      const data = await res.json();
      setDinners(data.dinners || []);
    } catch (error) {
      console.error("Error fetching dinners:", error);
    }
  }, 5 * 60 * 1000);

  const tonight = dinners[0];
  const upcoming = dinners.slice(1, 4);

  const dayLabel = (d: DinnerEntry) => new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
  const nameClass = (d: DinnerEntry) => (d.isOverride ? "dinner-override" : d.name ? "" : "dinner-none");

  return (
    <>
      <section className="card dinner-tonight">
        {tonight?.imageUrl ? (
          <img src={tonight.imageUrl} alt="" className="dinner-tonight-image" />
        ) : (
          <div className="dinner-tonight-image dinner-image-empty" />
        )}
        <div className="dinner-tonight-text">
          <div className="card-label">Tonight</div>
          <div className={`dinner-tonight-name ${tonight ? nameClass(tonight) : "dinner-none"}`}>
            {tonight ? tonight.name || "Not planned yet" : "—"}
          </div>
        </div>
      </section>
      {upcoming.map((d) => (
        <section key={d.date} className="card dinner-tile">
          {d.imageUrl ? (
            <img src={d.imageUrl} alt="" className="dinner-tile-image" />
          ) : (
            <div className="dinner-tile-image dinner-image-empty" />
          )}
          <div className="card-label dinner-tile-day">{dayLabel(d)}</div>
          <div className={`dinner-tile-name ${nameClass(d)}`}>{d.name || "Not planned yet"}</div>
        </section>
      ))}
    </>
  );
}

// ==================== COUNTDOWNS ====================

interface CountdownData {
  id: string;
  name: string;
  targetTime: string; // HH:MM for daily/weekdays
  targetDate: string | null; // YYYY-MM-DD for yearly/once
  recurrence: string;
}

const FOCUS_WINDOW_MS = 15 * 60 * 1000;
const BLINK_WINDOW_MS = 60 * 1000;

// "12m 05s" or "42s" for the focus display, so the seconds are always ticking
function formatFocusValue(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

// Time remaining plus how to display it. `ms` is used for sorting.
function countdownInfo(cd: CountdownData, now: Date): { ms: number; value: string; level: string } {
  if (cd.recurrence === "daily" || cd.recurrence === "weekdays") {
    const [h, m] = (cd.targetTime || "0:0").split(":").map(Number);
    let target = new Date(now);
    target.setHours(h, m, 0, 0);

    if (cd.recurrence === "weekdays") {
      const rule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
        dtstart: target,
      });
      const next = rule.after(now, true);
      if (!next) return { ms: Infinity, value: "—", level: "normal" };
      target = next;
    } else if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const diffMs = target.getTime() - now.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    const remSec = diffSec % 60;

    const level =
      diffMs < 5 * 60 * 1000 ? "critical" : diffMs < 30 * 60 * 1000 ? "urgent" : diffMs < 2 * 60 * 60 * 1000 ? "warning" : "normal";

    let value: string;
    if (diffMs < 60 * 1000) value = `${remSec}s`;
    else if (diffMs < 5 * 60 * 1000) value = `${diffMin}m ${remSec}s`;
    else if (diffHours > 0) value = `${diffHours}h ${remMin}m`;
    else value = `${diffMin} min`;

    return { ms: diffMs, value, level };
  }

  if (!cd.targetDate) return { ms: Infinity, value: "—", level: "normal" };

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target: Date;
  if (cd.recurrence === "yearly") {
    const [, month, day] = cd.targetDate.split("-").map(Number);
    target = new Date(now.getFullYear(), month - 1, day);
    if (target < todayStart) target = new Date(now.getFullYear() + 1, month - 1, day);
  } else {
    target = new Date(cd.targetDate + "T00:00:00");
  }

  const ms = target.getTime() - todayStart.getTime();
  const diffDays = Math.ceil(ms / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { ms, value: "passed", level: "normal" };
  if (diffDays === 0) return { ms, value: "today!", level: "urgent" };
  if (diffDays === 1) return { ms, value: "tomorrow", level: "urgent" };
  return { ms, value: `${diffDays} days`, level: "normal" };
}

function Countdowns() {
  const [countdowns, setCountdowns] = useState<CountdownData[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  usePolling(async () => {
    try {
      const res = await fetch("/api/dashboard/countdowns");
      const data = await res.json();
      setCountdowns(data.countdowns || []);
    } catch (error) {
      console.error("Error fetching countdowns:", error);
    }
  }, 5 * 60 * 1000);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const rows = now
    ? countdowns
        .map((cd) => ({ cd, info: countdownInfo(cd, now) }))
        .sort((a, b) => a.info.ms - b.info.ms)
    : [];

  // A timed countdown inside the focus window takes over the whole card
  const focus = rows.find(
    (r) => (r.cd.recurrence === "daily" || r.cd.recurrence === "weekdays") && r.info.ms > 0 && r.info.ms <= FOCUS_WINDOW_MS
  );

  if (focus) {
    // 1 at the start of the window, 0 at the target: amber fades to a brighter red
    const t = Math.max(0, Math.min(1, focus.info.ms / FOCUS_WINDOW_MS));
    const hue = Math.round(40 * t);
    const sat = Math.round(70 + 20 * (1 - t));
    const light = Math.round(22 + 12 * (1 - t));
    const blink = focus.info.ms < BLINK_WINDOW_MS;

    return (
      <section
        className={`card countdowns-card countdowns-focus${blink ? " countdowns-blink" : ""}`}
        style={{ backgroundColor: `hsl(${hue} ${sat}% ${light}%)` }}
      >
        <div className="card-label focus-label">Countdown</div>
        <div className="focus-name">{focus.cd.name}</div>
        <div className="focus-value">{formatFocusValue(focus.info.ms)}</div>
      </section>
    );
  }

  return (
    <section className="card countdowns-card">
      <div className="card-label">Countdowns</div>
      {rows.length === 0 ? (
        <div className="list-empty">No countdowns</div>
      ) : (
        <div className="countdown-list">
          {rows.map(({ cd, info }) => (
            <div key={cd.id} className="countdown-item">
              <span className="countdown-name">{cd.name}</span>
              <span className={`countdown-value ${info.level}`}>{info.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ==================== COMING UP ====================

interface UpcomingEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime, or YYYY-MM-DD when allDay
  allDay: boolean;
  calendarName: string;
  color: string;
}

function ComingUp() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);

  usePolling(async () => {
    try {
      const res = await fetch("/api/dashboard/coming-up");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching coming up:", error);
    }
  }, 5 * 60 * 1000);

  // Only events after today, judged in the browser's timezone
  const todayStr = localDateStr(new Date());
  const upcoming = events
    .map((e) => {
      const startDate = e.allDay ? new Date(e.start + "T00:00:00") : new Date(e.start);
      return { ...e, dateStr: localDateStr(startDate), startDate };
    })
    .filter((e) => e.dateStr > todayStr)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5);

  return (
    <section className="card coming-up-card">
      <div className="card-label">Coming up</div>
      {upcoming.length === 0 ? (
        <div className="list-empty">Nothing coming up</div>
      ) : (
        <div className="upcoming-list">
          {upcoming.map((e) => (
            <div key={e.id} className="upcoming-item">
              <span className="upcoming-day">{e.startDate.toLocaleDateString("en-US", { weekday: "short" })}</span>
              <span className="upcoming-who" style={{ color: e.color }}>
                {e.calendarName}
              </span>
              <span className="upcoming-event">
                {e.summary}
                {!e.allDay && <span className="upcoming-time">{formatTime(e.start)}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ==================== CALENDAR ====================

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

function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  // Set on the client only, so server and first client render match
  const [todayStr, setTodayStr] = useState<string | null>(null);
  const [nowPct, setNowPct] = useState<number | null>(null);

  usePolling(async () => {
    try {
      const response = await fetch("/api/dashboard/calendar");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching calendar:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, 5 * 60 * 1000);

  // Track the local date and the position of the "now" line
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTodayStr(localDateStr(now));
      const hours = now.getHours() + now.getMinutes() / 60;
      setNowPct(hours >= START_HOUR && hours <= END_HOUR ? ((hours - START_HOUR) / TOTAL_HOURS) * 100 : null);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  const todayEvents = todayStr
    ? events.filter((e) => {
        // All-day events carry date strings; Google's end date is exclusive
        if (e.allDay) return e.start <= todayStr && todayStr < e.end;
        return localDateStr(new Date(e.start)) === todayStr;
      })
    : [];
  const allDayEvents = todayEvents.filter((e) => e.allDay);
  const timedEvents = todayEvents.filter((e) => !e.allDay);

  const getEventPosition = (event: CalendarEvent) => {
    const s = new Date(event.start);
    const e = new Date(event.end);
    const top = ((s.getHours() - START_HOUR + s.getMinutes() / 60) / TOTAL_HOURS) * 100;
    const rawHeight = ((e.getHours() - s.getHours() + (e.getMinutes() - s.getMinutes()) / 60) / TOTAL_HOURS) * 100;
    const gap = 0.3; // keep back-to-back events from touching
    return { top, height: Math.max(rawHeight - gap, 2) };
  };

  return (
    <section className="card calendar-card">
      <div className="calendar-head">
        <div className="card-label">Today</div>
        <div className="allday-list">
          {allDayEvents.length > 0 ? (
            allDayEvents.map((event) => (
              <span key={event.id} className="allday-chip" style={{ backgroundColor: event.color }}>
                {event.summary}
              </span>
            ))
          ) : (
            <span className="allday-empty">No all-day events</span>
          )}
        </div>
      </div>

      <div className="col-headers">
        {MEMBERS.map((m) => (
          <div key={m.id} className="col-header" style={{ color: m.color }}>
            {m.name}
          </div>
        ))}
      </div>

      <div className="time-grid">
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
          const hour = START_HOUR + i;
          return (
            <div key={hour} className="hour-line" style={{ top: `${(i / TOTAL_HOURS) * 100}%` }}>
              <span className="hour-label">{hour === 12 ? "12pm" : hour < 12 ? `${hour}am` : `${hour - 12}pm`}</span>
              <div className="hour-rule" />
            </div>
          );
        })}

        <div className="col-area">
          {MEMBERS.map((m) => (
            <div key={m.id} className="col">
              <div className="col-watermark" style={{ color: m.color }}>
                {m.name}
              </div>
            </div>
          ))}
        </div>

        <div className="events-area">
          {timedEvents.map((event) => {
            const colIdx = MEMBERS.findIndex((m) => m.id === event.calendarId);
            if (colIdx === -1) return null;
            const { top, height } = getEventPosition(event);
            return (
              <div
                key={event.id}
                className="cal-event"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  left: `${colIdx * 20 + 0.6}%`,
                  width: "18.8%",
                  backgroundColor: event.color,
                }}
              >
                <div className="cal-event-title">{event.summary}</div>
                <div className="cal-event-time">{formatTimeRange(event.start, event.end)}</div>
              </div>
            );
          })}
        </div>

        {nowPct !== null && (
          <div className="now-line" style={{ top: `${nowPct}%` }}>
            <div className="now-dot" />
          </div>
        )}

        {loading && <div className="calendar-loading">Loading calendar…</div>}
      </div>
    </section>
  );
}

// ==================== PAGE ====================

export default function Home() {
  return (
    <div className="dashboard">
      <Calendar />

      <div className="right-col">
        <div className="row-top">
          <Clock />
          <Weather />
        </div>

        <div className="row-fun">
          <div className="fun-stack">
            <ScienceFact />
            <OnThisDay />
          </div>
          <Riddle />
        </div>

        <div className="row-dinner">
          <Dinner />
        </div>

        <div className="row-bottom">
          <Countdowns />
          <ComingUp />
        </div>
      </div>
    </div>
  );
}
