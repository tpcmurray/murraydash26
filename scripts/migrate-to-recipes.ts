import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://murraydash:murraydash2026!@localhost:5434/murraydash',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop old tables (order matters due to FKs)
    console.log('Dropping old tables...');
    await client.query('DROP TABLE IF EXISTS meal_ingredients CASCADE');
    await client.query('DROP TABLE IF EXISTS meal_plan_entries CASCADE');
    await client.query('DROP TABLE IF EXISTS meals CASCADE');
    await client.query('DROP TABLE IF EXISTS ingredients CASCADE');

    // Drop old enums
    console.log('Dropping old enums...');
    await client.query('DROP TYPE IF EXISTS category CASCADE');
    await client.query('DROP TYPE IF EXISTS storage_type CASCADE');
    await client.query('DROP TYPE IF EXISTS department CASCADE');
    await client.query('DROP TYPE IF EXISTS meal_slot CASCADE');

    // Create new enum
    console.log('Creating ingredient_category enum...');
    await client.query(`
      CREATE TYPE ingredient_category AS ENUM ('produce', 'bread', 'meat_fish', 'dairy', 'frozen', 'isle', 'pantry')
    `);

    // Create recipes table
    console.log('Creating recipes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        image BYTEA,
        image_content_type TEXT,
        servings INTEGER NOT NULL DEFAULT 4,
        ingredients TEXT NOT NULL DEFAULT '[]',
        sunday_prep TEXT,
        mise_en_place TEXT,
        cooking_instructions TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create meal_cycle table
    console.log('Creating meal_cycle table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS meal_cycle (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cycle_day INTEGER NOT NULL,
        recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create app_settings table
    console.log('Creating app_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Create dinner_override table
    console.log('Creating dinner_override table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dinner_override (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        override_notes TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed default settings
    console.log('Seeding default settings...');
    await client.query(`
      INSERT INTO app_settings (key, value) VALUES ('cycle_start_date', '2026-04-19')
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query(`
      INSERT INTO app_settings (key, value) VALUES ('cycle_length', '14')
      ON CONFLICT (key) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('Migration complete!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
