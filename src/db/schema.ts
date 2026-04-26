import { pgTable, uuid, text, timestamp, date, pgEnum, primaryKey, integer, customType, unique } from 'drizzle-orm/pg-core';

// Custom type for bytea (binary data for images)
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    if (Buffer.isBuffer(value)) return value;
    if (typeof value === 'string') return Buffer.from(value, 'hex');
    return Buffer.from(value as any);
  },
});

// NextAuth tables required by DrizzleAdapter
export const users = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified'),
  image: text('image'),
});

export const accounts = pgTable(
  'account',
  {
    userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: uuid('userId').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires').notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Enums
export const ingredientCategoryEnum = pgEnum('ingredient_category', [
  'produce', 'bread', 'meat_fish', 'dairy', 'frozen', 'isle', 'pantry'
]);
export const unitEnum = pgEnum('unit', ['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'pinch']);
export const recurrenceEnum = pgEnum('recurrence', ['daily', 'weekly', 'monthly', 'yearly', 'once', 'weekdays']);
export const scienceCategoryEnum = pgEnum('science_category', ['astronomy', 'mathematics', 'physics', 'chemistry', 'biology']);

// Recipe ingredient type (stored as JSON in recipes.ingredients)
export type RecipeIngredient = {
  name: string;
  amount: number;
  unit: string;
  category: 'produce' | 'bread' | 'meat_fish' | 'dairy' | 'frozen' | 'isle' | 'pantry';
};

// Recipes table
export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  image: bytea('image'),
  imageContentType: text('image_content_type'),
  servings: integer('servings').notNull().default(4),
  ingredients: text('ingredients').notNull().default('[]'), // JSON string of RecipeIngredient[]
  sundayPrep: text('sunday_prep'),
  miseEnPlace: text('mise_en_place'),
  cookingInstructions: text('cooking_instructions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Meal cycle table (rotating schedule)
export const mealCycle = pgTable('meal_cycle', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleDay: integer('cycle_day').notNull(), // 1-based (1 to cycle_length)
  recipeId: uuid('recipe_id').references(() => recipes.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// App settings (key-value store for cycle config etc.)
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Dinner override (single-row table for tonight's override)
export const dinnerOverride = pgTable('dinner_override', {
  id: uuid('id').primaryKey().defaultRandom(),
  overrideNotes: text('override_notes').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Countdowns table
export const countdowns = pgTable('countdowns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  targetTime: text('target_time'),
  targetDate: date('target_date'),
  recurrence: recurrenceEnum('recurrence').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const scienceFacts = pgTable('science_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: scienceCategoryEnum('category').notNull(),
  factText: text('fact_text').notNull(),
  imageUrl: text('image_url'),
  imageFilename: text('image_filename'),
  imageData: bytea('image_data'),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// On This Day historical facts
export const onThisDay = pgTable('on_this_day', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: integer('month').notNull(),
  day: integer('day').notNull(),
  year: integer('year').notNull(),
  event: text('event').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Shopping list checks (per-week persistence of which items have been checked off)
export const shoppingListChecks = pgTable(
  'shopping_list_checks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    weekStart: date('week_start').notNull(),
    itemKey: text('item_key').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    weekItemUnique: unique('shopping_list_checks_week_item_unique').on(t.weekStart, t.itemKey),
  }),
);

// Shopping list custom items (one-off additions like dish detergent, scoped per week)
export const shoppingListCustomItems = pgTable('shopping_list_custom_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  weekStart: date('week_start').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull().default('isle'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Daily riddles
export const riddles = pgTable('riddles', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayOfYear: integer('day_of_year').notNull(),
  riddle: text('riddle').notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type exports
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type MealCycleEntry = typeof mealCycle.$inferSelect;
export type NewMealCycleEntry = typeof mealCycle.$inferInsert;
export type Countdown = typeof countdowns.$inferSelect;
export type NewCountdown = typeof countdowns.$inferInsert;
export type ScienceFact = typeof scienceFacts.$inferSelect;
export type NewScienceFact = typeof scienceFacts.$inferInsert;
