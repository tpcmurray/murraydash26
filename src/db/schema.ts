import { pgTable, uuid, text, timestamp, date, decimal, boolean, pgEnum, primaryKey, integer } from 'drizzle-orm/pg-core';

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
export const recurrenceEnum = pgEnum('recurrence', ['daily', 'weekly', 'monthly', 'yearly', 'once']);
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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Meal Reminders table
export const mealReminders = pgTable('meal_reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  mealId: uuid('meal_id').references(() => meals.id, { onDelete: 'cascade' }).notNull(),
  reminderText: text('reminder_text').notNull(),
  timingOffset: text('timing_offset').notNull(), // e.g., "-1 day", "-12 hours", "morning_of"
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Countdowns table
export const countdowns = pgTable('countdowns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  targetTime: text('target_time').notNull(), // HH:MM for daily, full datetime for others
  targetDate: date('target_date'), // NULL for daily recurrence
  recurrence: recurrenceEnum('recurrence').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Science Facts table
export const scienceFacts = pgTable('science_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: scienceCategoryEnum('category').notNull(),
  factText: text('fact_text').notNull(),
  imageUrl: text('image_url'),
  imageData: text('image_data'),
  sourceUrl: text('source_url'),
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
export type MealReminder = typeof mealReminders.$inferSelect;
export type NewMealReminder = typeof mealReminders.$inferInsert;
export type Countdown = typeof countdowns.$inferSelect;
export type NewCountdown = typeof countdowns.$inferInsert;
export type ScienceFact = typeof scienceFacts.$inferSelect;
export type NewScienceFact = typeof scienceFacts.$inferInsert;
