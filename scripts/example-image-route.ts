/**
 * Example Next.js API route: GET /api/dashboard/science-fact/image/[id]
 * 
 * Serves the image binary stored in the science_facts.image_data column.
 * 
 * Place at: src/app/api/dashboard/science-fact/image/[id]/route.ts
 */

import { db } from '@/db';
import { scienceFacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const [fact] = await db
    .select({
      imageData: scienceFacts.imageData,
      imageFilename: scienceFacts.imageFilename,
    })
    .from(scienceFacts)
    .where(eq(scienceFacts.id, params.id))
    .limit(1);

  if (!fact?.imageData) {
    return new NextResponse(null, { status: 404 });
  }

  // Infer content type from filename
  const filename = fact.imageFilename || '';
  let contentType = 'image/jpeg';
  if (filename.endsWith('.png')) contentType = 'image/png';
  else if (filename.endsWith('.gif')) contentType = 'image/gif';
  else if (filename.endsWith('.webp')) contentType = 'image/webp';

  return new NextResponse(new Uint8Array(fact.imageData), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // cache for 24h
    },
  });
}
