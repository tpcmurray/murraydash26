import { NextResponse } from 'next/server';
import { db } from '@/db';
import { scienceFacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await db
      .select({
        imageData: scienceFacts.imageData,
        imageUrl: scienceFacts.imageUrl,
      })
      .from(scienceFacts)
      .where(eq(scienceFacts.id, id))
      .limit(1);

    if (result.length === 0 || !result[0].imageData) {
      // Redirect to original URL if no stored image
      if (result.length > 0 && result[0].imageUrl) {
        return NextResponse.redirect(result[0].imageUrl);
      }
      return new NextResponse('Not found', { status: 404 });
    }

    const imageData = result[0].imageData;
    return new NextResponse(new Uint8Array(imageData), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error serving science fact image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
