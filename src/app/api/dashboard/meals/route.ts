import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealPlanEntries, meals } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // First, clear any expired overrides (past their expiry time)
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

    // Now fetch today's meals, using overrideMealId if set
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
      .where(eq(mealPlanEntries.date, todayStr));

    // Process results - if there's an override, fetch that meal's info instead
    const processedMeals = await Promise.all(
      result.map(async (row) => {
        let actualMealName = row.mealName;
        let actualPrepNotes = row.prepNotes;
        let isOverride = false;
        let overrideNotes = row.overrideNotes;

        if (row.overrideMealId) {
          isOverride = true;
          const overrideMeal = await db
            .select({ name: meals.name, prepNotes: meals.prepNotes })
            .from(meals)
            .where(eq(meals.id, row.overrideMealId))
            .limit(1);

          if (overrideMeal.length > 0) {
            actualMealName = overrideMeal[0].name;
            actualPrepNotes = overrideMeal[0].prepNotes;
          }
        } else if (row.overrideNotes) {
          // Text-only override (free-text meal name stored in overrideNotes)
          isOverride = true;
          actualMealName = row.overrideNotes;
          actualPrepNotes = null;
          overrideNotes = null;
        }

        return {
          id: row.id,
          date: row.date,
          mealSlot: row.mealSlot,
          mealId: row.mealId,
          mealName: actualMealName,
          prepNotes: actualPrepNotes,
          isOverride,
          overrideNotes,
          overrideExpiresAt: row.overrideExpiresAt,
        };
      })
    );

    // Find tonight's dinner specifically
    const dinner = processedMeals.find(r => r.mealSlot === 'dinner');

    return NextResponse.json({
      meals: processedMeals,
      dinner: dinner
        ? { 
            name: dinner.mealName, 
            prepNotes: dinner.prepNotes,
            isOverride: dinner.isOverride,
            overrideNotes: dinner.overrideNotes,
            overrideExpiresAt: dinner.overrideExpiresAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meals' },
      { status: 500 }
    );
  }
}
