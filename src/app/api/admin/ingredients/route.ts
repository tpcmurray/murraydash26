import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ingredients } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/ingredients - Get all ingredients
export async function GET() {
  try {
    const allIngredients = await db.select().from(ingredients).orderBy(ingredients.name);
    return NextResponse.json(allIngredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 });
  }
}

// POST /api/admin/ingredients - Create a new ingredient
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, storageType, department } = body;

    if (!name || !storageType || !department) {
      return NextResponse.json({ error: 'Name, storage type, and department are required' }, { status: 400 });
    }

    const [newIngredient] = await db
      .insert(ingredients)
      .values({
        name,
        storageType,
        department,
      })
      .returning();

    return NextResponse.json(newIngredient, { status: 201 });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 });
  }
}

// PUT /api/admin/ingredients - Update an ingredient
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, storageType, department } = body;

    if (!id || !name || !storageType || !department) {
      return NextResponse.json({ error: 'ID, name, storage type, and department are required' }, { status: 400 });
    }

    const [updatedIngredient] = await db
      .update(ingredients)
      .set({
        name,
        storageType,
        department,
        updatedAt: new Date(),
      })
      .where(eq(ingredients.id, id))
      .returning();

    if (!updatedIngredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 });
    }

    return NextResponse.json(updatedIngredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 });
  }
}

// DELETE /api/admin/ingredients - Delete an ingredient
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(ingredients).where(eq(ingredients.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    return NextResponse.json({ error: 'Failed to delete ingredient' }, { status: 500 });
  }
}
