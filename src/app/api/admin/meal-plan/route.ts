import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealPlanEntries, meals } from '@/db/schema';
import { eq, asc, and, sql } from 'drizzle-orm';

// GET /api/admin/meal-plan - Get all meal plan entries with meal names
export async function GET() {
  try {
    // First, clear any expired overrides
    await db
      .update(mealPlanEntries)
      .set({
        overrideMealId: null,
        overrideNotes: null,
        overrideExpiresAt: null,
      })
      .where(
        sql`${mealPlanEntries.overrideExpiresAt} IS NOT NULL AND ${mealPlanEntries.overrideExpiresAt} < NOW()`
      );

    const entries = await db
      .select({
        id: mealPlanEntries.id,
        date: mealPlanEntries.date,
        mealSlot: mealPlanEntries.mealSlot,
        mealId: mealPlanEntries.mealId,
        overrideMealId: mealPlanEntries.overrideMealId,
        overrideNotes: mealPlanEntries.overrideNotes,
        overrideExpiresAt: mealPlanEntries.overrideExpiresAt,
        mealName: meals.name,
        createdAt: mealPlanEntries.createdAt,
        updatedAt: mealPlanEntries.updatedAt,
      })
      .from(mealPlanEntries)
      .leftJoin(meals, eq(mealPlanEntries.mealId, meals.id))
      .orderBy(asc(mealPlanEntries.date), asc(mealPlanEntries.mealSlot));
    
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching meal plan entries:', error);
    return NextResponse.json({ error: 'Failed to fetch meal plan entries' }, { status: 500 });
  }
}

// POST /api/admin/meal-plan - Create a new meal plan entry (or multiple for duration)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, mealSlot, mealId, duration } = body;

    if (!date || !mealSlot || !mealId) {
      return NextResponse.json({ error: 'Date, meal slot, and meal are required' }, { status: 400 });
    }

    const durationDays = duration ? parseInt(duration) : 1;
    const entries = [];

    for (let i = 0; i < durationDays; i++) {
      const entryDate = new Date(date);
      entryDate.setDate(entryDate.getDate() + i);
      const dateStr = entryDate.toISOString().split('T')[0];

      const [newEntry] = await db
        .insert(mealPlanEntries)
        .values({
          date: dateStr,
          mealSlot,
          mealId,
        })
        .returning();

      entries.push(newEntry);
    }

    return NextResponse.json(entries, { status: 201 });
  } catch (error) {
    console.error('Error creating meal plan entry:', error);
    return NextResponse.json({ error: 'Failed to create meal plan entry' }, { status: 500 });
  }
}

// PUT /api/admin/meal-plan - Update a meal plan entry OR set an override
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { action, overrideText, id, date, mealSlot, mealId } = body;

    // Set tonight's dinner override (free-text)
    if (action === 'setTonightOverride') {
      if (!overrideText) {
        return NextResponse.json({ error: 'Override text is required' }, { status: 400 });
      }
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

      const todayDinners = await db
        .select({ id: mealPlanEntries.id })
        .from(mealPlanEntries)
        .where(and(eq(mealPlanEntries.date, todayStr), eq(mealPlanEntries.mealSlot, 'dinner')))
        .limit(1);

      if (todayDinners.length === 0) {
        return NextResponse.json({ error: 'No dinner entry found for today' }, { status: 404 });
      }

      const [updatedEntry] = await db
        .update(mealPlanEntries)
        .set({
          overrideMealId: null,
          overrideNotes: overrideText,
          overrideExpiresAt: midnight,
          updatedAt: new Date(),
        })
        .where(eq(mealPlanEntries.id, todayDinners[0].id))
        .returning();

      return NextResponse.json(updatedEntry);
    }

    // Clear tonight's dinner override
    if (action === 'clearTonightOverride') {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const todayDinners = await db
        .select({ id: mealPlanEntries.id })
        .from(mealPlanEntries)
        .where(and(eq(mealPlanEntries.date, todayStr), eq(mealPlanEntries.mealSlot, 'dinner')))
        .limit(1);

      if (todayDinners.length === 0) {
        return NextResponse.json({ error: 'No dinner entry found for today' }, { status: 404 });
      }

      const [updatedEntry] = await db
        .update(mealPlanEntries)
        .set({
          overrideMealId: null,
          overrideNotes: null,
          overrideExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(mealPlanEntries.id, todayDinners[0].id))
        .returning();

      return NextResponse.json(updatedEntry);
    }

    // Regular update (no override)
    if (!id || !date || !mealSlot || !mealId) {
      return NextResponse.json({ error: 'ID, date, meal slot, and meal are required' }, { status: 400 });
    }

    const [updatedEntry] = await db
      .update(mealPlanEntries)
      .set({
        date,
        mealSlot,
        mealId,
        updatedAt: new Date(),
      })
      .where(eq(mealPlanEntries.id, id))
      .returning();

    if (!updatedEntry) {
      return NextResponse.json({ error: 'Meal plan entry not found' }, { status: 404 });
    }

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error('Error updating meal plan entry:', error);
    return NextResponse.json({ error: 'Failed to update meal plan entry' }, { status: 500 });
  }
}

// DELETE /api/admin/meal-plan - Delete a meal plan entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(mealPlanEntries).where(eq(mealPlanEntries.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal plan entry:', error);
    return NextResponse.json({ error: 'Failed to delete meal plan entry' }, { status: 500 });
  }
}
