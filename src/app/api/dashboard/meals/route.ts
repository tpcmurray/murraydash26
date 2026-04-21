import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealCycle, recipes, appSettings, dinnerOverride } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getCycleDay, getNextNCycleDays, formatDateStr, parseLocalDate } from '@/lib/cycle';

export async function GET() {
  try {
    // Load cycle settings
    const settings = await db.select().from(appSettings);
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    const cycleStartDate = parseLocalDate(settingsMap['cycle_start_date'] || '2026-04-19');
    const cycleLength = parseInt(settingsMap['cycle_length'] || '14');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate today's cycle day and next 3
    const todayCycleDay = getCycleDay(today, cycleStartDate, cycleLength);
    const cycleDays = getNextNCycleDays(todayCycleDay, 4, cycleLength);

    // Build actual calendar dates for each of the 4 days
    const dates: string[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      dates.push(formatDateStr(d));
    }

    // Query meal cycle entries for these cycle days
    const cycleEntries = await db
      .select({
        cycleDay: mealCycle.cycleDay,
        recipeId: mealCycle.recipeId,
        recipeTitle: recipes.title,
        imageContentType: recipes.imageContentType,
      })
      .from(mealCycle)
      .innerJoin(recipes, eq(mealCycle.recipeId, recipes.id))
      .where(inArray(mealCycle.cycleDay, cycleDays));

    // Build a map of cycleDay -> recipe info
    const cycleDayMap: Record<number, { title: string; recipeId: string; hasImage: boolean }> = {};
    for (const entry of cycleEntries) {
      cycleDayMap[entry.cycleDay] = {
        title: entry.recipeTitle,
        recipeId: entry.recipeId,
        hasImage: !!entry.imageContentType,
      };
    }

    // Check for active dinner override
    await db.delete(dinnerOverride).where(sql`${dinnerOverride.expiresAt} < NOW()`);
    const activeOverride = await db.select().from(dinnerOverride).limit(1);
    const hasOverride = activeOverride.length > 0;

    // Build the 4-day dinner list
    const dinners = cycleDays.map((cycleDay, index) => {
      const isToday = index === 0;
      const isOverride = isToday && hasOverride;
      const recipe = cycleDayMap[cycleDay];

      return {
        date: dates[index],
        name: isOverride ? activeOverride[0].overrideNotes : (recipe?.title || null),
        isOverride,
        overrideNotes: isOverride ? activeOverride[0].overrideNotes : null,
        imageUrl: (!isOverride && recipe?.hasImage) ? `/api/admin/recipes/${recipe.recipeId}/image` : null,
      };
    });

    return NextResponse.json({ dinners });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
  }
}
