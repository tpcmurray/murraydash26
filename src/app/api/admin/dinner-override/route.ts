import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dinnerOverride } from '@/db/schema';
import { sql } from 'drizzle-orm';

// POST /api/admin/dinner-override - Set tonight's dinner override
export async function POST(request: Request) {
  try {
    const { overrideNotes } = await request.json();
    if (!overrideNotes) {
      return NextResponse.json({ error: 'Missing overrideNotes' }, { status: 400 });
    }

    // Clear all existing overrides first
    await db.delete(dinnerOverride);

    // Calculate midnight tonight
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);

    const result = await db
      .insert(dinnerOverride)
      .values({
        overrideNotes,
        expiresAt: midnight,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error setting dinner override:', error);
    return NextResponse.json({ error: 'Failed to set override' }, { status: 500 });
  }
}

// GET /api/admin/dinner-override - Get active override (if any)
export async function GET() {
  try {
    // Clear expired overrides
    await db.delete(dinnerOverride).where(sql`${dinnerOverride.expiresAt} < NOW()`);

    const result = await db.select().from(dinnerOverride).limit(1);
    return NextResponse.json(result[0] || null);
  } catch (error) {
    console.error('Error fetching dinner override:', error);
    return NextResponse.json({ error: 'Failed to fetch override' }, { status: 500 });
  }
}

// DELETE /api/admin/dinner-override - Clear the override
export async function DELETE() {
  try {
    await db.delete(dinnerOverride);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing dinner override:', error);
    return NextResponse.json({ error: 'Failed to clear override' }, { status: 500 });
  }
}
