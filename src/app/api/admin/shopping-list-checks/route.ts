import { NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingListChecks } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const isValidWeekStart = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

// GET /api/admin/shopping-list-checks?weekStart=YYYY-MM-DD
// Returns string[] of itemKeys checked for that week.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');
    if (!isValidWeekStart(weekStart)) {
      return NextResponse.json({ error: 'Missing or invalid weekStart (YYYY-MM-DD)' }, { status: 400 });
    }

    const rows = await db
      .select({ itemKey: shoppingListChecks.itemKey })
      .from(shoppingListChecks)
      .where(eq(shoppingListChecks.weekStart, weekStart));

    return NextResponse.json(rows.map((r) => r.itemKey));
  } catch (error) {
    console.error('Error fetching shopping list checks:', error);
    return NextResponse.json({ error: 'Failed to fetch checks' }, { status: 500 });
  }
}

// POST /api/admin/shopping-list-checks
// Body: { weekStart: 'YYYY-MM-DD', itemKey: string, checked: boolean }
export async function POST(request: Request) {
  try {
    const { weekStart, itemKey, checked } = await request.json();
    if (!isValidWeekStart(weekStart) || typeof itemKey !== 'string' || !itemKey) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (checked) {
      await db
        .insert(shoppingListChecks)
        .values({ weekStart, itemKey })
        .onConflictDoNothing();
    } else {
      await db
        .delete(shoppingListChecks)
        .where(and(eq(shoppingListChecks.weekStart, weekStart), eq(shoppingListChecks.itemKey, itemKey)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating shopping list check:', error);
    return NextResponse.json({ error: 'Failed to update check' }, { status: 500 });
  }
}

// DELETE /api/admin/shopping-list-checks?weekStart=YYYY-MM-DD
// Clears all checks for the given week.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');
    if (!isValidWeekStart(weekStart)) {
      return NextResponse.json({ error: 'Missing or invalid weekStart (YYYY-MM-DD)' }, { status: 400 });
    }

    await db.delete(shoppingListChecks).where(eq(shoppingListChecks.weekStart, weekStart));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing shopping list checks:', error);
    return NextResponse.json({ error: 'Failed to clear checks' }, { status: 500 });
  }
}
