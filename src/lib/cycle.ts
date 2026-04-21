/**
 * Cycle-based meal schedule utilities.
 * The cycle is a repeating N-day rotation (default 14) starting from a reference date.
 * Cycle days are 1-based (1 to cycleLength).
 */

/** Get the cycle day number (1-based) for a given date. */
export function getCycleDay(today: Date, cycleStartDate: Date, cycleLength: number): number {
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const startUTC = Date.UTC(cycleStartDate.getFullYear(), cycleStartDate.getMonth(), cycleStartDate.getDate());
  const diffDays = Math.floor((todayUTC - startUTC) / (1000 * 60 * 60 * 24));
  return ((diffDays % cycleLength) + cycleLength) % cycleLength + 1;
}

/** Get an array of N consecutive cycle day numbers starting from a given cycle day. */
export function getNextNCycleDays(startCycleDay: number, n: number, cycleLength: number): number[] {
  const days: number[] = [];
  for (let i = 0; i < n; i++) {
    days.push(((startCycleDay - 1 + i) % cycleLength) + 1);
  }
  return days;
}

/** Get the upcoming Sunday-Saturday date range for grocery shopping. */
export function getUpcomingSundayRange(today: Date): { sunday: Date; saturday: Date } {
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  let sunday: Date;
  if (dayOfWeek === 0) {
    // Today is Sunday
    sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  } else {
    // Next Sunday
    sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (7 - dayOfWeek));
  }
  const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6);
  return { sunday, saturday };
}

/** Map a date range to cycle day numbers. Returns array of cycle days for each date in range. */
export function getCycleDaysForDateRange(
  startDate: Date,
  endDate: Date,
  cycleStartDate: Date,
  cycleLength: number,
): number[] {
  const days: number[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  while (current <= end) {
    days.push(getCycleDay(current, cycleStartDate, cycleLength));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Format a date as YYYY-MM-DD string. */
export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Parse a YYYY-MM-DD string as a local-timezone date.
 * new Date('2026-04-19') parses as UTC midnight, which shifts the day in
 * non-UTC timezones.  This avoids that by splitting the string.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
