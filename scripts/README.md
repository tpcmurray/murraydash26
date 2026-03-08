# MurrayDash Science Facts — Scraper & Seed Guide

## Overview

This scrapes all science facts from [sciensational.com](https://www.sciensational.com/) 
and loads them into your MurrayDash Postgres database. It's a one-time process.

## Files

| File | Purpose |
|------|---------|
| `scrape.mjs` | Scraper script — fetches facts + images from sciensational.com |
| `schema-science-facts.ts` | Drizzle schema — merge into your main schema file |
| `seed-science-facts.ts` | Seed script — loads JSON + images into Postgres |
| `example-api-route.ts` | Example: daily fact API endpoint |
| `example-image-route.ts` | Example: serve images from bytea column |

## Workflow

### Step 1: Run the scraper

```bash
# From the scraper directory (wherever you put these files)
npm install cheerio
node scrape.mjs
```

This creates:
- `data/science-facts.json` — all facts as JSON
- `data/images/` — downloaded images (e.g., `astronomy-001.jpg`)

**Review the output.** The scraper tries multiple DOM selectors since we
couldn't inspect the raw HTML directly. If it finds 0 facts for a category,
you may need to adjust the selectors in `scrapeCategoryPage()`. Open a 
category page in your browser, inspect the DOM, and update the 
`contentSelectors` array accordingly.

### Step 2: Review and clean the data

Open `data/science-facts.json` and sanity check:
- Fact text should be clean (no "Submitted by" or "sciensational.com" leftovers)
- Each fact should have an `imageFilename` pointing to a real file in `data/images/`
- Categories should be correct

### Step 3: Add the schema to your project

Merge the contents of `schema-science-facts.ts` into your Drizzle schema file
(likely `src/db/schema.ts`). Then push the schema:

```bash
npx drizzle-kit push
```

### Step 4: Copy data into your project

```bash
# From your MurrayDash project root
cp -r /path/to/scraper/data ./data
```

### Step 5: Run the seed script

Copy `seed-science-facts.ts` to `scripts/seed-science-facts.ts` in your
MurrayDash project. Adjust the schema import path if needed, then run:

```bash
npx tsx scripts/seed-science-facts.ts
```

This reads the JSON, loads each image as binary from disk, and inserts
everything into the `science_facts` table.

### Step 6: Wire up the API

Use `example-api-route.ts` and `example-image-route.ts` as starting points
for serving facts to the dashboard. The daily fact query uses:

```sql
SELECT * FROM science_facts 
ORDER BY md5(id::text || '2026-03-07') 
LIMIT 1;
```

This gives a deterministic "random" fact per day — same fact all day,
changes at midnight.

## Image Storage Strategy

Images are stored two ways:
1. **On disk** as files in `data/images/` (used during development/seeding)
2. **In Postgres** as `bytea` in the `image_data` column (used in production)

The bytea approach means your images survive even if sciensational.com goes
down, and you don't need to manage a separate file-serving setup. The tradeoff
is slightly larger DB size — but for ~200-300 small images, it's negligible.

The image-serving API route reads from bytea and returns the binary with
appropriate content-type headers and a 24-hour cache directive.

## Troubleshooting

**Scraper finds 0 facts:** The DOM selectors need adjusting. Open a category
page in browser DevTools, find the container that holds the fact entries, and
update the `contentSelectors` array in `scrape.mjs`.

**Images fail to download:** Some images may be lazy-loaded or served from a
CDN. Check if the `<img>` tags use `data-src` instead of `src`. The scraper
checks both, but the site might use a different attribute.

**Seed script fails on bytea:** Make sure your Drizzle custom type for bytea
matches the one in `schema-science-facts.ts`. If you're using a different
Postgres driver (e.g., postgres.js instead of pg), the Buffer handling may
differ.
