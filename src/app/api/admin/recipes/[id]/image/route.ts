import { NextResponse } from 'next/server';
import { db } from '@/db';
import { recipes } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/recipes/[id]/image - Return recipe image as binary
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .select({ image: recipes.image, imageContentType: recipes.imageContentType })
      .from(recipes)
      .where(eq(recipes.id, id))
      .limit(1);

    if (!result.length || !result[0].image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return new NextResponse(result[0].image as unknown as BodyInit, {
      headers: {
        'Content-Type': result[0].imageContentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching recipe image:', error);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
