/**
 * Seed script: loads meals, ingredients, meal ingredients, and meal plan entries into Postgres.
 * 
 * Place this at: scripts/seed-meals.ts
 * Place your data at: data/meals.json
 * 
 * Run: npx tsx scripts/seed-meals.ts
 * 
 * Prerequisites:
 *   - Your .env.local must have DATABASE_URL set
 *   - The meal-related tables must exist (run drizzle-kit push first)
 *   - The data/ folder must contain your meals.json file
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { meals, ingredients, mealIngredients, mealPlanEntries } from '../src/db/schema';
import { config } from 'dotenv';
config({ path: '.env.local' });

interface MealData {
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prepNotes?: string;
  ingredients?: {
    name: string;
    storageType: 'frozen' | 'fridge' | 'pantry';
    department: 'produce' | 'meat' | 'dairy' | 'bakery' | 'frozen' | 'canned' | 'dry_goods' | 'condiments' | 'other';
    amount: number;
    unit: 'g' | 'kg' | 'ml' | 'L' | 'tsp' | 'tbsp' | 'cup' | 'oz' | 'lb' | 'piece' | 'pinch';
  }[];
}

interface MealPlanData {
  date: string; // YYYY-MM-DD format
  mealSlot: 'breakfast' | 'lunch' | 'dinner';
  mealName: string;
}

interface SeedData {
  meals: MealData[];
  mealPlan?: MealPlanData[];
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  const DATA_DIR = join(process.cwd(), 'data');
  const JSON_PATH = join(DATA_DIR, 'meals.json');

  if (!existsSync(JSON_PATH)) {
    console.error(`❌ ${JSON_PATH} not found. Create the file with your meal data.`);
    console.log('\nExpected JSON format:');
    console.log(JSON.stringify({
      meals: [
        {
          name: "Pancakes",
          category: "breakfast",
          prepNotes: "Flip when bubbles form",
          ingredients: [
            { name: "Flour", storageType: "pantry", department: "dry_goods", amount: 2, unit: "cup" }
          ]
        }
      ],
      mealPlan: [
        { date: "2026-03-08", mealSlot: "breakfast", mealName: "Pancakes" }
      ]
    }, null, 2));
    process.exit(1);
  }

  // Load seed data
  const data: SeedData = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  console.log(`📂 Loaded ${data.meals.length} meals from JSON`);

  // Connect to database
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // Clear existing data (in reverse order due to foreign keys)
    console.log('🗑  Clearing existing meal plan entries...');
    await db.delete(mealPlanEntries);
    
    console.log('🗑  Clearing existing meal ingredients...');
    await db.delete(mealIngredients);
    
    console.log('🗑  Clearing existing ingredients...');
    await db.delete(ingredients);
    
    console.log('🗑  Clearing existing meals...');
    await db.delete(meals);

    // Create a map to track ingredient IDs by name
    const ingredientIdMap = new Map<string, string>();
    const mealIdMap = new Map<string, string>();

    // Step 1: Insert all unique ingredients first
    console.log('\n📝 Inserting ingredients...');
    const ingredientSet = new Map<string, { storageType: string; department: string }>();
    
    for (const meal of data.meals) {
      if (meal.ingredients) {
        for (const ing of meal.ingredients) {
          ingredientSet.set(ing.name, { 
            storageType: ing.storageType, 
            department: ing.department 
          });
        }
      }
    }

    const ingredientEntries = Array.from(ingredientSet.entries());
    console.log(`   Found ${ingredientEntries.length} unique ingredients`);

    for (const [name, props] of ingredientEntries) {
      const [inserted] = await db.insert(ingredients).values({
        name,
        storageType: props.storageType as 'frozen' | 'fridge' | 'pantry',
        department: props.department as 'produce' | 'meat' | 'dairy' | 'bakery' | 'frozen' | 'canned' | 'dry_goods' | 'condiments' | 'other',
      }).returning({ id: ingredients.id });
      ingredientIdMap.set(name, inserted.id);
    }
    console.log(`   ✓ Inserted ${ingredientEntries.length} ingredients`);

    // Step 2: Insert meals
    console.log('\n📝 Inserting meals...');
    for (const meal of data.meals) {
      const [inserted] = await db.insert(meals).values({
        name: meal.name,
        category: meal.category,
        prepNotes: meal.prepNotes || null,
      }).returning({ id: meals.id });
      mealIdMap.set(meal.name, inserted.id);
    }
    console.log(`   ✓ Inserted ${data.meals.length} meals`);

    // Step 3: Insert meal ingredients (junction table)
    console.log('\n📝 Inserting meal ingredients...');
    let mealIngredientCount = 0;
    for (const meal of data.meals) {
      if (meal.ingredients) {
        const mealId = mealIdMap.get(meal.name);
        if (!mealId) continue;

        for (const ing of meal.ingredients) {
          const ingredientId = ingredientIdMap.get(ing.name);
          if (!ingredientId) continue;

          await db.insert(mealIngredients).values({
            mealId,
            ingredientId,
            amount: ing.amount.toString(),
            unit: ing.unit,
          });
          mealIngredientCount++;
        }
      }
    }
    console.log(`   ✓ Inserted ${mealIngredientCount} meal ingredients`);

    // Step 4: Insert meal plan entries (if provided)
    if (data.mealPlan && data.mealPlan.length > 0) {
      console.log('\n📝 Inserting meal plan entries...');
      for (const entry of data.mealPlan) {
        const mealId = mealIdMap.get(entry.mealName);
        if (!mealId) {
          console.warn(`   ⚠ Meal "${entry.mealName}" not found, skipping meal plan entry`);
          continue;
        }

        await db.insert(mealPlanEntries).values({
          date: entry.date,
          mealSlot: entry.mealSlot,
          mealId,
        });
      }
      console.log(`   ✓ Inserted ${data.mealPlan.length} meal plan entries`);
    }

    console.log('\n✅ Seeding complete!');
    console.log(`   Meals: ${data.meals.length}`);
    console.log(`   Ingredients: ${ingredientEntries.length}`);
    console.log(`   Meal Ingredients: ${mealIngredientCount}`);
    if (data.mealPlan) {
      console.log(`   Meal Plan Entries: ${data.mealPlan.length}`);
    }

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
