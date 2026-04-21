import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mealCycle, recipes, appSettings } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getUpcomingSundayRange, getCycleDaysForDateRange, formatDateStr, parseLocalDate } from '@/lib/cycle';
import type { RecipeIngredient } from '@/db/schema';

const CATEGORY_ORDER: string[] = ['produce', 'bread', 'meat_fish', 'dairy', 'frozen', 'isle', 'pantry'];

// GET /api/admin/shopping-list - Shopping list for upcoming Sunday-Saturday
export async function GET() {
  try {
    // Load cycle settings
    const settings = await db.select().from(appSettings);
    const settingsMap: Record<string, string> = {};
    for (const s of settings) settingsMap[s.key] = s.value;

    const cycleStartDate = parseLocalDate(settingsMap['cycle_start_date'] || '2026-04-19');
    const cycleLength = parseInt(settingsMap['cycle_length'] || '14');

    const now = new Date();
    const { sunday, saturday } = getUpcomingSundayRange(now);

    // Get cycle days for the Sunday-Saturday range
    const cycleDays = getCycleDaysForDateRange(sunday, saturday, cycleStartDate, cycleLength);
    const uniqueCycleDays = [...new Set(cycleDays)];

    // Get all recipes assigned to those cycle days
    const cycleEntries = await db
      .select({
        cycleDay: mealCycle.cycleDay,
        recipeId: mealCycle.recipeId,
      })
      .from(mealCycle)
      .where(inArray(mealCycle.cycleDay, uniqueCycleDays));

    // Count how many times each recipe appears in the week
    const recipeCount: Record<string, number> = {};
    for (const dayNum of cycleDays) {
      const entries = cycleEntries.filter((e) => e.cycleDay === dayNum);
      for (const entry of entries) {
        recipeCount[entry.recipeId] = (recipeCount[entry.recipeId] || 0) + 1;
      }
    }

    const recipeIds = Object.keys(recipeCount);
    if (recipeIds.length === 0) {
      return NextResponse.json({
        shoppingList: [],
        dateRange: { start: formatDateStr(sunday), end: formatDateStr(saturday) },
      });
    }

    // Fetch recipe ingredients and titles
    const recipeRows = await db
      .select({ id: recipes.id, title: recipes.title, ingredients: recipes.ingredients })
      .from(recipes)
      .where(inArray(recipes.id, recipeIds));

    // Aggregate ingredients across all recipes (accounting for repeats)
    const aggregated: Record<string, { name: string; amount: number; unit: string; category: string; meals: Set<string> }> = {};

    for (const recipe of recipeRows) {
      const ingredientsList: RecipeIngredient[] = JSON.parse(recipe.ingredients || '[]');
      const count = recipeCount[recipe.id] || 1;

      for (const ing of ingredientsList) {
        const key = `${ing.name.toLowerCase()}|${ing.unit}`;
        if (aggregated[key]) {
          aggregated[key].amount += ing.amount * count;
          aggregated[key].meals.add(recipe.title);
        } else {
          aggregated[key] = {
            name: ing.name,
            amount: ing.amount * count,
            unit: ing.unit,
            category: ing.category,
            meals: new Set([recipe.title]),
          };
        }
      }
    }

    // Sort by category order, then by name
    const shoppingList = Object.values(aggregated)
      .map(({ meals, ...rest }) => ({ ...rest, meals: [...meals] }))
      .sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category);
        const catB = CATEGORY_ORDER.indexOf(b.category);
        if (catA !== catB) return catA - catB;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      shoppingList,
      dateRange: { start: formatDateStr(sunday), end: formatDateStr(saturday) },
    });
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    return NextResponse.json({ error: 'Failed to fetch shopping list' }, { status: 500 });
  }
}
