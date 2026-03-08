import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealIngredients, meals, ingredients } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/meal-ingredients - Get all meal ingredients with names
export async function GET() {
  try {
    const result = await db
      .select({
        id: mealIngredients.id,
        mealId: mealIngredients.mealId,
        ingredientId: mealIngredients.ingredientId,
        amount: mealIngredients.amount,
        unit: mealIngredients.unit,
        mealName: meals.name,
        ingredientName: ingredients.name,
        createdAt: mealIngredients.createdAt,
      })
      .from(mealIngredients)
      .leftJoin(meals, eq(mealIngredients.mealId, meals.id))
      .leftJoin(ingredients, eq(mealIngredients.ingredientId, ingredients.id));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching meal ingredients:', error);
    return NextResponse.json({ error: 'Failed to fetch meal ingredients' }, { status: 500 });
  }
}

// POST /api/admin/meal-ingredients - Create a new meal ingredient
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mealId, ingredientId, amount, unit } = body;

    if (!mealId || !ingredientId || !amount || !unit) {
      return NextResponse.json({ error: 'Meal, ingredient, amount, and unit are required' }, { status: 400 });
    }

    const [newMealIngredient] = await db
      .insert(mealIngredients)
      .values({
        mealId,
        ingredientId,
        amount,
        unit,
      })
      .returning();

    return NextResponse.json(newMealIngredient, { status: 201 });
  } catch (error) {
    console.error('Error creating meal ingredient:', error);
    return NextResponse.json({ error: 'Failed to create meal ingredient' }, { status: 500 });
  }
}

// PUT /api/admin/meal-ingredients - Update a meal ingredient
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, mealId, ingredientId, amount, unit } = body;

    if (!id || !mealId || !ingredientId || !amount || !unit) {
      return NextResponse.json({ error: 'ID, meal, ingredient, amount, and unit are required' }, { status: 400 });
    }

    const [updatedMealIngredient] = await db
      .update(mealIngredients)
      .set({
        mealId,
        ingredientId,
        amount,
        unit,
        createdAt: new Date(),
      })
      .where(eq(mealIngredients.id, id))
      .returning();

    if (!updatedMealIngredient) {
      return NextResponse.json({ error: 'Meal ingredient not found' }, { status: 404 });
    }

    return NextResponse.json(updatedMealIngredient);
  } catch (error) {
    console.error('Error updating meal ingredient:', error);
    return NextResponse.json({ error: 'Failed to update meal ingredient' }, { status: 500 });
  }
}

// DELETE /api/admin/meal-ingredients - Delete a meal ingredient
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(mealIngredients).where(eq(mealIngredients.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal ingredient:', error);
    return NextResponse.json({ error: 'Failed to delete meal ingredient' }, { status: 500 });
  }
}
