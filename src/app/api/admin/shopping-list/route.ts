import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealPlanEntries, mealIngredients, ingredients } from '@/db/schema';
import { eq, and, gte, sql, asc } from 'drizzle-orm';

// GET /api/admin/shopping-list - Get shopping list for next N days
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    // Calculate date range
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Query meal plan entries for the date range, join with meal ingredients
    // and aggregate by ingredient
    const result = await db
      .select({
        ingredientId: ingredients.id,
        ingredientName: ingredients.name,
        department: ingredients.department,
        unit: mealIngredients.unit,
        totalAmount: sql<number>`SUM(${mealIngredients.amount})`,
      })
      .from(mealPlanEntries)
      .innerJoin(mealIngredients, eq(mealPlanEntries.mealId, mealIngredients.mealId))
      .innerJoin(ingredients, eq(mealIngredients.ingredientId, ingredients.id))
      .where(
        and(
          gte(mealPlanEntries.date, startDate),
          sql`${mealPlanEntries.date} <= ${endDate}`
        )
      )
      .groupBy(ingredients.id, ingredients.name, ingredients.department, mealIngredients.unit)
      .orderBy(asc(ingredients.department), asc(ingredients.name));

    return NextResponse.json({ shoppingList: result });
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shopping list' },
      { status: 500 }
    );
  }
}
