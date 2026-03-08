import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealReminders, meals } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/reminders - Get all reminders with meal names
export async function GET() {
  try {
    const result = await db
      .select({
        id: mealReminders.id,
        mealId: mealReminders.mealId,
        reminderText: mealReminders.reminderText,
        timingOffset: mealReminders.timingOffset,
        active: mealReminders.active,
        mealName: meals.name,
        createdAt: mealReminders.createdAt,
        updatedAt: mealReminders.updatedAt,
      })
      .from(mealReminders)
      .leftJoin(meals, eq(mealReminders.mealId, meals.id));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

// POST /api/admin/reminders - Create a new reminder
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mealId, reminderText, timingOffset, active } = body;

    if (!mealId || !reminderText || !timingOffset) {
      return NextResponse.json({ error: 'Meal, reminder text, and timing offset are required' }, { status: 400 });
    }

    const [newReminder] = await db
      .insert(mealReminders)
      .values({
        mealId,
        reminderText,
        timingOffset,
        active: active ?? true,
      })
      .returning();

    return NextResponse.json(newReminder, { status: 201 });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}

// PUT /api/admin/reminders - Update a reminder
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, mealId, reminderText, timingOffset, active } = body;

    if (!id || !mealId || !reminderText || !timingOffset) {
      return NextResponse.json({ error: 'ID, meal, reminder text, and timing offset are required' }, { status: 400 });
    }

    const [updatedReminder] = await db
      .update(mealReminders)
      .set({
        mealId,
        reminderText,
        timingOffset,
        active: active ?? true,
        updatedAt: new Date(),
      })
      .where(eq(mealReminders.id, id))
      .returning();

    if (!updatedReminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

// DELETE /api/admin/reminders - Delete a reminder
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(mealReminders).where(eq(mealReminders.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}
