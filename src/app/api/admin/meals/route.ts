import { NextResponse } from 'next/server';
import { db } from '@/db';
import { meals } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/meals - Get all meals
export async function GET() {
  try {
    const allMeals = await db.select().from(meals).orderBy(meals.name);
    return NextResponse.json(allMeals);
  } catch (error) {
    console.error('Error fetching meals:', error);
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 });
  }
}

// POST /api/admin/meals - Create a new meal
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, prepNotes } = body;

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const [newMeal] = await db
      .insert(meals)
      .values({
        name,
        category,
        prepNotes: prepNotes || null,
      })
      .returning();

    return NextResponse.json(newMeal, { status: 201 });
  } catch (error) {
    console.error('Error creating meal:', error);
    return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 });
  }
}

// PUT /api/admin/meals - Update a meal
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, prepNotes } = body;

    if (!id || !name || !category) {
      return NextResponse.json({ error: 'ID, name, and category are required' }, { status: 400 });
    }

    const [updatedMeal] = await db
      .update(meals)
      .set({
        name,
        category,
        prepNotes: prepNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(meals.id, id))
      .returning();

    if (!updatedMeal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }

    return NextResponse.json(updatedMeal);
  } catch (error) {
    console.error('Error updating meal:', error);
    return NextResponse.json({ error: 'Failed to update meal' }, { status: 500 });
  }
}

// DELETE /api/admin/meals - Delete a meal
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(meals).where(eq(meals.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal:', error);
    return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 });
  }
}
