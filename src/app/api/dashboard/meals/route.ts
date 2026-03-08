import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealPlanEntries, meals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const result = await db
      .select({
        id: mealPlanEntries.id,
        date: mealPlanEntries.date,
        mealSlot: mealPlanEntries.mealSlot,
        mealName: meals.name,
        prepNotes: meals.prepNotes,
      })
      .from(mealPlanEntries)
      .innerJoin(meals, eq(mealPlanEntries.mealId, meals.id))
      .where(eq(mealPlanEntries.date, todayStr));

    // Find tonight's dinner specifically
    const dinner = result.find(r => r.mealSlot === 'dinner');

    return NextResponse.json({
      meals: result,
      dinner: dinner
        ? { name: dinner.mealName, prepNotes: dinner.prepNotes }
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
