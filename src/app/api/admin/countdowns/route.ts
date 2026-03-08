import { NextResponse } from 'next/server';
import { db } from '@/db';
import { countdowns } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/countdowns - Get all countdowns
export async function GET() {
  try {
    const allCountdowns = await db.select().from(countdowns).orderBy(countdowns.targetDate);
    return NextResponse.json(allCountdowns);
  } catch (error) {
    console.error('Error fetching countdowns:', error);
    return NextResponse.json({ error: 'Failed to fetch countdowns' }, { status: 500 });
  }
}

// POST /api/admin/countdowns - Create a new countdown
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, targetTime, targetDate, recurrence } = body;

    if (!name || !targetTime || !recurrence) {
      return NextResponse.json({ error: 'Name, target time, and recurrence are required' }, { status: 400 });
    }

    const [newCountdown] = await db
      .insert(countdowns)
      .values({
        name,
        targetTime,
        targetDate: targetDate || null,
        recurrence,
      })
      .returning();

    return NextResponse.json(newCountdown, { status: 201 });
  } catch (error) {
    console.error('Error creating countdown:', error);
    return NextResponse.json({ error: 'Failed to create countdown' }, { status: 500 });
  }
}

// PUT /api/admin/countdowns - Update a countdown
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, targetTime, targetDate, recurrence } = body;

    if (!id || !name || !targetTime || !recurrence) {
      return NextResponse.json({ error: 'ID, name, target time, and recurrence are required' }, { status: 400 });
    }

    const [updatedCountdown] = await db
      .update(countdowns)
      .set({
        name,
        targetTime,
        targetDate: targetDate || null,
        recurrence,
        updatedAt: new Date(),
      })
      .where(eq(countdowns.id, id))
      .returning();

    if (!updatedCountdown) {
      return NextResponse.json({ error: 'Countdown not found' }, { status: 404 });
    }

    return NextResponse.json(updatedCountdown);
  } catch (error) {
    console.error('Error updating countdown:', error);
    return NextResponse.json({ error: 'Failed to update countdown' }, { status: 500 });
  }
}

// DELETE /api/admin/countdowns - Delete a countdown
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(countdowns).where(eq(countdowns.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting countdown:', error);
    return NextResponse.json({ error: 'Failed to delete countdown' }, { status: 500 });
  }
}
