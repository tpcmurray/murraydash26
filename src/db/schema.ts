import { pgTable, uuid, text, timestamp, date, decimal, pgEnum, primaryKey, integer, customType } from 'drizzle-orm/pg-core';

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
export const categoryEnum = pgEnum('category', ['breakfast', 'lunch', 'dinner', 'snack']);
export const storageTypeEnum = pgEnum('storage_type', ['frozen', 'fridge', 'pantry']);
export const departmentEnum = pgEnum('department', [
  'produce', 'meat', 'dairy', 'bakery', 'frozen', 'canned', 'dry_goods', 'condiments', 'other'
]);
export const mealSlotEnum = pgEnum('meal_slot', ['breakfast', 'lunch', 'dinner']);
export const recurrenceEnum = pgEnum('recurrence', ['daily', 'weekly', 'monthly', 'yearly', 'once', 'weekdays']);
export const scienceCategoryEnum = pgEnum('science_category', ['astronomy', 'mathematics', 'physics', 'chemistry', 'biology']);
export const unitEnum = pgEnum('unit', ['g', 'kg', 'ml', 'L', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'pinch']);

// Meals table
export const meals = pgTable('meals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: categoryEnum('category').notNull(),
  prepNotes: text('prep_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Ingredients table
export const ingredients = pgTable('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  storageType: storageTypeEnum('storage_type').notNull(),
  department: departmentEnum('department').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Meal Ingredients junction table
export const mealIngredients = pgTable('meal_ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  mealId: uuid('meal_id').references(() => meals.id, { onDelete: 'cascade' }).notNull(),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id, { onDelete: 'restrict' }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  unit: unitEnum('unit').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Meal Plan Entries table
export const mealPlanEntries = pgTable('meal_plan_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull(),
  mealSlot: mealSlotEnum('meal_slot').notNull(),
  mealId: uuid('meal_id').references(() => meals.id, { onDelete: 'cascade' }).notNull(),
  // Override fields for temporary changes (e.g., company coming)
  overrideMealId: uuid('override_meal_id').references(() => meals.id, { onDelete: 'cascade' }),
  overrideNotes: text('override_notes'),
  overrideExpiresAt: timestamp('override_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Countdowns table
export const countdowns = pgTable('countdowns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  targetTime: text('target_time'), // HH:MM for daily/weekdays, NULL for yearly/once
  targetDate: date('target_date'), // NULL for daily/weekdays recurrence
  recurrence: recurrenceEnum('recurrence').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const scienceFacts = pgTable('science_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: scienceCategoryEnum('category').notNull(),
  factText: text('fact_text').notNull(),
  imageUrl: text('image_url'),                // original URL from sciensational.com
  imageFilename: text('image_filename'),      // local filename in data/images/
  imageData: bytea('image_data'),             // binary image stored in DB as backup
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

// Daily riddles
export const riddles = pgTable('riddles', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayOfYear: integer('day_of_year').notNull(),
  riddle: text('riddle').notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type exports for use in queries
export type Meal = typeof meals.$inferSelect;
export type NewMeal = typeof meals.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type MealIngredient = typeof mealIngredients.$inferSelect;
export type NewMealIngredient = typeof mealIngredients.$inferInsert;
export type MealPlanEntry = typeof mealPlanEntries.$inferSelect;
export type NewMealPlanEntry = typeof mealPlanEntries.$inferInsert;
export type Countdown = typeof countdowns.$inferSelect;
export type NewCountdown = typeof countdowns.$inferInsert;
export type ScienceFact = typeof scienceFacts.$inferSelect;
export type NewScienceFact = typeof scienceFacts.$inferInsert;
