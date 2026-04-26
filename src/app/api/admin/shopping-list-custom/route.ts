import { NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingListCustomItems } from '@/db/schema';
import { asc, eq } from 'drizzle-orm';

const isValidWeekStart = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

const VALID_CATEGORIES = ['produce', 'bread', 'meat_fish', 'dairy', 'frozen', 'isle', 'pantry'];

// GET /api/admin/shopping-list-custom?weekStart=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');
    if (!isValidWeekStart(weekStart)) {
      return NextResponse.json({ error: 'Missing or invalid weekStart' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(shoppingListCustomItems)
      .where(eq(shoppingListCustomItems.weekStart, weekStart))
      .orderBy(asc(shoppingListCustomItems.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching custom items:', error);
    return NextResponse.json({ error: 'Failed to fetch custom items' }, { status: 500 });
  }
}

// POST /api/admin/shopping-list-custom
// Body: { weekStart, name, category }
export async function POST(request: Request) {
  try {
    const { weekStart, name, category } = await request.json();
    if (!isValidWeekStart(weekStart) || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const cat = VALID_CATEGORIES.includes(category) ? category : 'isle';

    const result = await db
      .insert(shoppingListCustomItems)
      .values({ weekStart, name: name.trim(), category: cat })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating custom item:', error);
    return NextResponse.json({ error: 'Failed to create custom item' }, { status: 500 });
  }
}

// DELETE /api/admin/shopping-list-custom?id=...      (remove single item)
// DELETE /api/admin/shopping-list-custom?weekStart=YYYY-MM-DD  (clear all for week)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const weekStart = searchParams.get('weekStart');

    if (id) {
      await db.delete(shoppingListCustomItems).where(eq(shoppingListCustomItems.id, id));
      return NextResponse.json({ success: true });
    }
    if (isValidWeekStart(weekStart)) {
      await db.delete(shoppingListCustomItems).where(eq(shoppingListCustomItems.weekStart, weekStart));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Missing id or weekStart' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting custom item:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
