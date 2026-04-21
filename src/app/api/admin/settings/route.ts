import { NextResponse } from 'next/server';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/admin/settings - Get all settings or a specific key
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const result = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .limit(1);
      return NextResponse.json(result[0] || null);
    }

    const result = await db.select().from(appSettings);
    // Return as key-value object
    const settings: Record<string, string> = {};
    for (const row of result) {
      settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/admin/settings - Upsert a setting
export async function PUT(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    // Upsert: insert or update on conflict
    await db
      .insert(appSettings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: String(value) },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
