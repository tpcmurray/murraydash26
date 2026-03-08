/**
 * Add this to your existing Drizzle schema file (e.g., src/db/schema.ts)
 * alongside your other MurrayDash tables.
 */

import { pgTable, uuid, text, timestamp, customType } from 'drizzle-orm/pg-core';

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

export const scienceFacts = pgTable('science_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),       // astronomy | mathematics | physics | chemistry | biology
  factText: text('fact_text').notNull(),
  imageUrl: text('image_url'),                // original URL from sciensational.com
  imageFilename: text('image_filename'),      // local filename in data/images/
  imageData: bytea('image_data'),             // binary image stored in DB as backup
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
