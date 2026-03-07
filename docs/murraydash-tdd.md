# MurrayDash — Technical Design Document

## 1. Overview

MurrayDash is a family information dashboard designed to run on a 1080p monitor in the Murray family's home foyer, powered by a Raspberry Pi. It consists of two interfaces served from the same Next.js application:

- **Dashboard View** — A read-only, always-on, dark-mode display optimized for glanceable information. Unauthenticated, loaded by the Pi's browser.
- **Admin Interface** — A simple spreadsheet-style data management UI for Terry and Nicole, behind Google OAuth. Accessed from a PC browser.

The app is served from an existing AWS Lightsail instance alongside Weatheristic and terrymurray.com.

## 2. Dashboard Layout

The dashboard uses a fixed 1920×1080 dark-mode layout. No responsive breakpoints needed — this targets one screen.

### Grid Structure

Three-column layout:

| Column | Width | Content |
|--------|-------|---------|
| Left (hero) | ~48% | Today's Calendar (full height) |
| Center | ~24% | Time/Date/Science Fact, Countdowns, Reminders |
| Right | ~28% | Weather (Weatheristic iframe), Tonight's Dinner, Coming Up |

The 6 smaller panels form a 2×3 grid in the center and right columns. The calendar spans all 3 rows on the left.

### Dashboard Sections

**1. Today's Calendar (left column, full height)**

- Pulls events from Google Calendar API (read-only, single OAuth connection to Terry's account, which has visibility into all 4 calendars plus the Family calendar).
- Visual time-block grid: Y-axis = hours (7am–10pm), X-axis = 5 columns (Terry, Nicole, Skylar, Addison, Family).
- Each person's column is color-coded.
- All-day events strip at the top of the calendar area (similar to Google Calendar's treatment).
- Overlapping events within a single person's column split the column width (half each), same as Google Calendar.
- Red current-time indicator line with dot, positioned based on real time.
- The calendar header displays the full date: "Today — Thursday, March 5".

**2. Time / Date / Science Fact (center column, row 1)**

- Large clock display (HH:MM), updates every second via client-side JS.
- Full date and day of week below the clock.
- Below that, a small "Science Fact" card showing one random fact per day, rotated at midnight. Fact includes a short text blurb and a colored accent bar.

**3. Weather (right column, row 1)**

- Embedded iframe pointing to https://weatheristic.com/.
- Initial approach: embed the full site at a zoom level that fits the panel. If this proves unwieldy, refactor to a dedicated "dashboard mode" route in Weatheristic.

**4. Countdowns (center column, row 2)**

- List of countdown timers. Each countdown has a name, target datetime, and recurrence type (daily, yearly, once).
- Daily countdowns (e.g., "School bus — 42 min") tick down in real-time via client-side JS.
- Yearly and one-off countdowns display in days.
- Urgent/imminent countdowns (< 2 hours) are visually highlighted (amber).
- All countdowns managed manually in the admin interface.

**5. Tonight's Dinner (right column, row 2)**

- Displays the meal name and subtitle for today's dinner slot from the meal plan.
- Simple centered text display.

**6. Reminders (center column, row 3)**

- List of active reminders for today.
- Reminders are attached to meals (e.g., "Take out frozen ground beef" triggered by tomorrow's spaghetti meal using frozen ingredients).
- Each reminder has a text, an urgency flag, and a timing offset relative to the meal date (e.g., "-1 day", "-12 hours", "morning of").
- Urgent reminders highlighted in amber.

**7. Coming Up (right column, row 3)**

- Simple list of calendar events for the next 2 days (excluding today).
- Shows day abbreviation, event name, and time.
- Pulled from the same Google Calendar API connection.

### Refresh Strategy

- **Clock and countdown ticking**: Client-side JavaScript, updating every second. No server calls.
- **Calendar, meals, reminders, coming-up events**: Component-level polling every 5 minutes.
- **Science fact**: Fetched on page load, rotated at midnight (client-side check).
- **No full-page refresh**. Each section manages its own update cycle.

### Display Behavior

- Always dark mode. No light mode, no dim mode, no night mode.
- Runs 24/7 on the Pi. No sleep or screen-off behavior (handled at OS/monitor level if needed).

## 3. Admin Interface

A simple, functional data management UI behind Google OAuth (Terry and Nicole only). No design polish needed — this is a tool, not a showpiece.

### Structure

Tab-based layout with spreadsheet-style editable grids (think editable data tables, not drag-and-drop). Tabs:

**Meals Tab**

- Grid of all meals in the library.
- Columns: Name, Category (breakfast/lunch/dinner/snack), Prep Notes.
- CRUD: add, edit, delete meals.
- Clicking a meal opens its ingredient list and associated reminders for editing.

**Ingredients Tab**

- Grid of all ingredients in the system.
- Columns: Name, Storage Type (frozen/fridge/pantry), Department (produce, meat, dairy, bakery, frozen, canned, dry goods, condiments, etc.).
- Department is used for sorting the shopping list by store layout.
- CRUD: add, edit, delete.

**Meal Plan Tab**

- Grid showing the current meal plan.
- Columns: Date, Meal Slot (breakfast/lunch/dinner), Meal (FK to meals library).
- Rows for however many days are in the plan (14, 21, etc. — not fixed to a specific duration).
- Add/edit/delete assignments.

**Meal Ingredients Tab** (or inline within Meals)

- Links meals to ingredients with amounts and units.
- Columns: Meal, Ingredient, Amount, Unit.

**Reminders Tab**

- Grid of reminders attached to meals.
- Columns: Meal, Reminder Text, Timing Offset (e.g., "-1 day", "morning of"), Active (boolean).

**Countdowns Tab**

- Grid of all countdowns.
- Columns: Name, Target DateTime, Recurrence Type (daily/yearly/once).

**Shopping List Page**

- Auto-generated view, not a manually edited grid.
- Dropdown: "Next ___ days" defaulting to 7, excluding today.
- Aggregates all ingredients from meal plan entries within the selected range.
- Groups ingredients by amount (summed) and sorts by store department.
- Printable/mobile-friendly for use at the store on Sunday.

## 4. Database Schema

PostgreSQL, new database on the existing Lightsail Postgres instance.

### Tables

```
meals
  id            UUID PK
  name          TEXT NOT NULL
  category      TEXT NOT NULL  -- breakfast | lunch | dinner | snack
  prep_notes    TEXT
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

ingredients
  id            UUID PK
  name          TEXT NOT NULL
  storage_type  TEXT NOT NULL  -- frozen | fridge | pantry
  department    TEXT NOT NULL  -- produce | meat | dairy | bakery | frozen | canned | dry_goods | condiments | other
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

meal_ingredients
  id            UUID PK
  meal_id       UUID FK -> meals.id ON DELETE CASCADE
  ingredient_id UUID FK -> ingredients.id ON DELETE RESTRICT
  amount        DECIMAL NOT NULL
  unit          TEXT NOT NULL  -- g | kg | ml | L | tsp | tbsp | cup | oz | lb | piece | pinch
  created_at    TIMESTAMP

meal_plan_entries
  id            UUID PK
  date          DATE NOT NULL
  meal_slot     TEXT NOT NULL  -- breakfast | lunch | dinner
  meal_id       UUID FK -> meals.id ON DELETE CASCADE
  created_at    TIMESTAMP
  updated_at    TIMESTAMP
  UNIQUE(date, meal_slot)

meal_reminders
  id            UUID PK
  meal_id       UUID FK -> meals.id ON DELETE CASCADE
  reminder_text TEXT NOT NULL
  timing_offset TEXT NOT NULL  -- e.g., "-1 day", "-12 hours", "morning_of"
  active        BOOLEAN DEFAULT true
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

countdowns
  id            UUID PK
  name          TEXT NOT NULL
  target_time   TEXT NOT NULL      -- HH:MM for daily, full datetime for others
  target_date   DATE               -- NULL for daily recurrence
  recurrence    TEXT NOT NULL       -- daily | yearly | once
  created_at    TIMESTAMP
  updated_at    TIMESTAMP

science_facts
  id            UUID PK
  category      TEXT NOT NULL  -- astronomy | mathematics | physics | chemistry | biology
  fact_text     TEXT NOT NULL
  image_url     TEXT           -- original URL from sciensational.com
  image_data    BYTEA          -- stored locally in case source goes down
  source_url    TEXT
  created_at    TIMESTAMP
```

### Key Queries

- **Shopping list**: Aggregate `meal_ingredients` for all `meal_plan_entries` where `date` is between tomorrow and tomorrow + N days, JOIN `ingredients` for department, GROUP BY ingredient, SUM amounts, ORDER BY department sort priority.
- **Today's reminders**: Find all `meal_plan_entries` for today and the next day, JOIN `meal_reminders` on meal_id, filter by timing_offset logic relative to the meal's date.
- **Daily science fact**: Select a random fact seeded by the current date (e.g., `ORDER BY md5(id::text || current_date::text) LIMIT 1`) so it's consistent throughout the day but changes at midnight.

## 5. Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js (App Router) |
| Database | PostgreSQL (existing Lightsail instance, new DB) |
| ORM | Drizzle |
| Auth | NextAuth.js with Google OAuth provider |
| Calendar API | Google Calendar API v3 (read-only, OAuth service connection) |
| Styling | Tailwind CSS (dark mode) |
| Hosting | AWS Lightsail (existing instance) |
| Client device | Raspberry Pi running Chromium in kiosk mode |

## 6. Google Calendar Integration

- Single OAuth connection using Terry's Google account.
- Read-only access to all calendars visible from that account (4 personal + 1 family calendar).
- Scopes: `https://www.googleapis.com/auth/calendar.readonly`
- Server-side API calls from Next.js API routes, not client-side.
- Calendar data cached server-side with 5-minute TTL.
- API routes serve the cached data to the dashboard components.

## 7. Science Facts Scraper

One-time script to populate the `science_facts` table.

### Source Structure

- Base URL: `https://www.sciensational.com/`
- 5 categories: astronomy, mathematics (maths.html), physics, chemistry, biology.
- Each category page has ~20 facts, paginated via `category-facts-pg2.html`, `category-facts-pg3.html`, etc.
- "Next" link at the bottom of each page; follow until no more pages.
- Each fact: image element + text blurb with a bolded key term.

### Scrape Strategy

- For each category, start at the first page and follow pagination links.
- Extract: fact text (strip "Submitted by" attribution), image URL, category.
- Download and store images as BYTEA in the database (insurance against source disappearing).
- Store source URL for attribution.
- Run once. Rerun manually if new facts are desired.

## 8. API Routes

### Dashboard (unauthenticated)

- `GET /api/dashboard/calendar` — Today's events and next 2 days from Google Calendar API.
- `GET /api/dashboard/meals` — Today's meal plan entries.
- `GET /api/dashboard/reminders` — Active reminders relevant to today.
- `GET /api/dashboard/countdowns` — All countdowns.
- `GET /api/dashboard/science-fact` — Today's random science fact.

### Admin (authenticated — Google OAuth)

- `GET/POST/PUT/DELETE /api/admin/meals` — Meals CRUD.
- `GET/POST/PUT/DELETE /api/admin/ingredients` — Ingredients CRUD.
- `GET/POST/PUT/DELETE /api/admin/meal-ingredients` — Meal-ingredient links CRUD.
- `GET/POST/PUT/DELETE /api/admin/meal-plan` — Meal plan entries CRUD.
- `GET/POST/PUT/DELETE /api/admin/reminders` — Meal reminders CRUD.
- `GET/POST/PUT/DELETE /api/admin/countdowns` — Countdowns CRUD.
- `GET /api/admin/shopping-list?days=7` — Generated shopping list.

## 9. Pages / Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `/` | No | Dashboard (foyer display) |
| `/admin` | Google OAuth | Admin landing, tab-based data management |
| `/admin/shopping-list` | Google OAuth | Shopping list generator |

## 10. Deployment

- Same Lightsail instance as Weatheristic and terrymurray.com.
- New PostgreSQL database on the existing Postgres server.
- Next.js app deployed behind existing reverse proxy (Nginx or similar).
- Raspberry Pi runs Chromium in kiosk mode pointing at the dashboard URL.
- Domain: TBD (e.g., `murraydash.yourdomain.com` or a subdirectory).

## 11. Future Considerations (Out of Scope for v1)

- **Weatheristic dashboard mode**: Dedicated route in Weatheristic optimized for the iframe panel size.
- **Nicole and kids feedback**: Layout and content changes after the family uses v1.
- **LLM-powered reminders**: Auto-generate thaw/prep reminders based on ingredient storage types instead of manual entry.
- **Photo rotation widget**: Family photo slideshow panel if a section feels underused.
- **School closure alerts**: Scrape or API integration for snow day notifications.
- **Night mode**: Dim or minimal display during sleeping hours if the always-on screen becomes an issue.
