import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealCycle, recipes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/admin/meal-cycle - Get all cycle entries with recipe titles
export async function GET() {
  try {
    const result = await db
      .select({
        id: mealCycle.id,
        cycleDay: mealCycle.cycleDay,
        recipeId: mealCycle.recipeId,
        recipeTitle: recipes.title,
        createdAt: mealCycle.createdAt,
      })
      .from(mealCycle)
      .innerJoin(recipes, eq(mealCycle.recipeId, recipes.id))
      .orderBy(asc(mealCycle.cycleDay));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching meal cycle:', error);
    return NextResponse.json({ error: 'Failed to fetch meal cycle' }, { status: 500 });
  }
}

// POST /api/admin/meal-cycle - Assign a recipe to a cycle day
export async function POST(request: Request) {
  try {
    const { cycleDay, recipeId } = await request.json();
    const result = await db
      .insert(mealCycle)
      .values({ cycleDay, recipeId })
      .returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating cycle entry:', error);
    return NextResponse.json({ error: 'Failed to create cycle entry' }, { status: 500 });
  }
}

// PUT /api/admin/meal-cycle - Update a cycle entry
export async function PUT(request: Request) {
  try {
    const { id, cycleDay, recipeId } = await request.json();
    const result = await db
      .update(mealCycle)
      .set({ cycleDay, recipeId })
      .where(eq(mealCycle.id, id))
      .returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating cycle entry:', error);
    return NextResponse.json({ error: 'Failed to update cycle entry' }, { status: 500 });
  }
}

// DELETE /api/admin/meal-cycle?id=... - Remove a cycle entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    await db.delete(mealCycle).where(eq(mealCycle.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cycle entry:', error);
    return NextResponse.json({ error: 'Failed to delete cycle entry' }, { status: 500 });
  }
}
