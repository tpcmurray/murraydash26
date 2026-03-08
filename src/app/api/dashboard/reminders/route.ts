import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealPlanEntries, mealReminders, meals } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Get tomorrow's date
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    // Get meal plan entries for today and tomorrow (reminders can fire ahead of time)
    const entries = await db
      .select({
        entryId: mealPlanEntries.id,
        date: mealPlanEntries.date,
        mealSlot: mealPlanEntries.mealSlot,
        mealId: mealPlanEntries.mealId,
        mealName: meals.name,
      })
      .from(mealPlanEntries)
      .innerJoin(meals, eq(mealPlanEntries.mealId, meals.id))
      .where(
        sql`${mealPlanEntries.date} >= ${todayStr} AND ${mealPlanEntries.date} <= ${tomorrowStr}`
      );

    if (entries.length === 0) {
      return NextResponse.json({ reminders: [] });
    }

    // Get all active reminders for these meals
    const mealIds = [...new Set(entries.map(e => e.mealId))];
    const reminders = await db
      .select({
        id: mealReminders.id,
        mealId: mealReminders.mealId,
        reminderText: mealReminders.reminderText,
        timingOffset: mealReminders.timingOffset,
        active: mealReminders.active,
      })
      .from(mealReminders)
      .where(
        and(
          eq(mealReminders.active, true),
          sql`${mealReminders.mealId} IN (${sql.join(mealIds.map(id => sql`${id}`), sql`, `)})`
        )
      );

    // Filter reminders based on timing offset relative to meal date
    const activeReminders: Array<{
      id: string;
      text: string;
      mealName: string;
      urgent: boolean;
    }> = [];

    for (const reminder of reminders) {
      const matchingEntries = entries.filter(e => e.mealId === reminder.mealId);

      for (const entry of matchingEntries) {
        const mealDate = new Date(entry.date + 'T00:00:00');
        const offset = reminder.timingOffset;
        let shouldShow = false;
        let urgent = false;

        if (offset === 'morning_of') {
          // Show on the morning of the meal date
          shouldShow = entry.date === todayStr;
          urgent = true;
        } else if (offset === '-1 day' || offset === '-1day') {
          // Show the day before the meal
          shouldShow = entry.date === tomorrowStr;
        } else if (offset === '-2 days' || offset === '-2days') {
          // Show 2 days before
          const twoDaysOut = new Date(now);
          twoDaysOut.setDate(twoDaysOut.getDate() + 2);
          const twoDaysStr = `${twoDaysOut.getFullYear()}-${String(twoDaysOut.getMonth() + 1).padStart(2, '0')}-${String(twoDaysOut.getDate()).padStart(2, '0')}`;
          shouldShow = entry.date === twoDaysStr;
        } else if (offset === '-12 hours' || offset === '-12hours') {
          // Show within 12 hours of meal (assume dinner at 6pm)
          const mealTime = new Date(mealDate);
          mealTime.setHours(18, 0, 0, 0);
          const diffHours = (mealTime.getTime() - now.getTime()) / (1000 * 60 * 60);
          shouldShow = diffHours <= 12 && diffHours >= 0;
          urgent = diffHours <= 4;
        } else if (offset === 'day_of' || offset === 'same_day') {
          shouldShow = entry.date === todayStr;
          urgent = true;
        }

        if (shouldShow) {
          activeReminders.push({
            id: reminder.id,
            text: reminder.reminderText,
            mealName: entry.mealName,
            urgent,
          });
        }
      }
    }

    return NextResponse.json({ reminders: activeReminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}
