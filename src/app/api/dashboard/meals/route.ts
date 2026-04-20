import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealPlanEntries, meals } from '@/db/schema';
import { eq, and, isNotNull, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();

    // Build date strings for today + next 3 days
    const dates: string[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    // Clear any expired overrides
    await db
      .update(mealPlanEntries)
      .set({
        overrideMealId: null,
        overrideNotes: null,
        overrideExpiresAt: null,
      })
      .where(
        and(
          isNotNull(mealPlanEntries.overrideExpiresAt),
          sql`${mealPlanEntries.overrideExpiresAt} < NOW()`
        )
      );

    // Fetch dinners for all 4 days
    const result = await db
      .select({
        id: mealPlanEntries.id,
        date: mealPlanEntries.date,
        mealSlot: mealPlanEntries.mealSlot,
        mealId: mealPlanEntries.mealId,
        overrideMealId: mealPlanEntries.overrideMealId,
        overrideNotes: mealPlanEntries.overrideNotes,
        overrideExpiresAt: mealPlanEntries.overrideExpiresAt,
        mealName: meals.name,
        prepNotes: meals.prepNotes,
      })
      .from(mealPlanEntries)
      .innerJoin(meals, eq(mealPlanEntries.mealId, meals.id))
      .where(
        and(
          eq(mealPlanEntries.mealSlot, 'dinner'),
          inArray(mealPlanEntries.date, dates)
        )
      );

    // Process overrides
    const processedDinners = await Promise.all(
      result.map(async (row) => {
        let actualMealName = row.mealName;
        let isOverride = false;
        let overrideNotes = row.overrideNotes;

        if (row.overrideMealId) {
          isOverride = true;
          const overrideMeal = await db
            .select({ name: meals.name })
            .from(meals)
            .where(eq(meals.id, row.overrideMealId))
            .limit(1);
          if (overrideMeal.length > 0) {
            actualMealName = overrideMeal[0].name;
          }
        } else if (row.overrideNotes) {
          isOverride = true;
          actualMealName = row.overrideNotes;
          overrideNotes = null;
        }

        return {
          date: row.date,
          name: actualMealName,
          isOverride,
          overrideNotes,
        };
      })
    );

    // Build the 4-day dinner list, ordered by date
    const dinners = dates.map((dateStr) => {
      const entry = processedDinners.find((d) => d.date === dateStr);
      return {
        date: dateStr,
        name: entry?.name || null,
        isOverride: entry?.isOverride || false,
        overrideNotes: entry?.overrideNotes || null,
      };
    });

    return NextResponse.json({ dinners });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
  }
}
