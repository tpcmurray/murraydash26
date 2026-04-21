import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recipes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

// GET /api/admin/recipes - List all recipes (omit image binary)
export async function GET() {
  try {
    const result = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        servings: recipes.servings,
        ingredients: recipes.ingredients,
        sundayPrep: recipes.sundayPrep,
        miseEnPlace: recipes.miseEnPlace,
        cookingInstructions: recipes.cookingInstructions,
        imageContentType: recipes.imageContentType,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
      })
      .from(recipes)
      .orderBy(asc(recipes.title));

    const mapped = result.map((r) => ({
      ...r,
      hasImage: !!r.imageContentType,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

// POST /api/admin/recipes - Create a recipe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, servings, ingredients, sundayPrep, miseEnPlace, cookingInstructions, imageBase64, imageContentType } = body;

    const insertData: Record<string, unknown> = {
      title,
      servings: servings || 4,
      ingredients: typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients || []),
      sundayPrep: sundayPrep || null,
      miseEnPlace: miseEnPlace || null,
      cookingInstructions: cookingInstructions || null,
    };

    if (imageBase64 && imageContentType) {
      insertData.image = Buffer.from(imageBase64, 'base64');
      insertData.imageContentType = imageContentType;
    }

    const result = await db.insert(recipes).values(insertData as any).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}

// PUT /api/admin/recipes - Update a recipe
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, servings, ingredients, sundayPrep, miseEnPlace, cookingInstructions, imageBase64, imageContentType, removeImage } = body;

    const updateData: Record<string, unknown> = {
      title,
      servings,
      ingredients: typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients || []),
      sundayPrep: sundayPrep || null,
      miseEnPlace: miseEnPlace || null,
      cookingInstructions: cookingInstructions || null,
      updatedAt: new Date(),
    };

    if (removeImage) {
      updateData.image = null;
      updateData.imageContentType = null;
    } else if (imageBase64 && imageContentType) {
      updateData.image = Buffer.from(imageBase64, 'base64');
      updateData.imageContentType = imageContentType;
    }

    const result = await db
      .update(recipes)
      .set(updateData as any)
      .where(eq(recipes.id, id))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

// DELETE /api/admin/recipes?id=... - Delete a recipe
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    await db.delete(recipes).where(eq(recipes.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
