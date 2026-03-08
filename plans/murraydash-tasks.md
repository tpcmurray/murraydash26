# MurrayDash — Phases and Tasks

A vibe-coded family information dashboard with a read-only dark-mode display and an admin interface for data management.

---

## Phase 1: Project Foundation

**Objective:** Set up the Next.js project with all dependencies and configuration.

- [x] Initialize Next.js project with App Router in the MurrayDash directory
- [x] Install dependencies: Drizzle ORM, NextAuth.js, Tailwind CSS, PostgreSQL driver
- [x] Configure Tailwind CSS for dark-mode-only theme
- [x] Set up TypeScript with strict mode
- [x] Configure project structure: `/app/dashboard`, `/app/admin`, `/app/api`
- [x] Create basic layout components and shared UI primitives
- [x] Set up environment variable template (.env.example) with all required keys

---

## Phase 2: Database and Schema

**Objective:** Create PostgreSQL database and define all tables with Drizzle ORM.

- [x] Set up PostgreSQL database on existing Lightsail instance
- [x] Create Drizzle configuration for PostgreSQL connection
- [x] Define schema files:
  - [x] `meals` table
  - [x] `ingredients` table
  - [x] `meal_ingredients` junction table
  - [x] `meal_plan_entries` table
  - [x] `meal_reminders` table
  - [x] `countdowns` table
  - [x] `science_facts` table
- [x] Run database migrations to create all tables
- [x] Create seed data for testing (sample meals, ingredients, countdowns)

---

## Phase 3: Authentication

**Objective:** Implement Google OAuth for admin access using NextAuth.js.

- [x] Configure NextAuth.js with Google OAuth provider
- [x] Create auth options with session callbacks
- [x] Set up Google Cloud project and get OAuth credentials
- [x] Create middleware to protect `/admin` routes
- [x] Allow unauthenticated access to `/` (dashboard)
- [x] Add user authorization check (Terry and Nicole only)
- [x] Test authentication flow

---

## Phase 4: Dashboard — Core Layout and Clock

**Objective:** Build the foundational dashboard layout with real-time clock display.

- [x] Create main dashboard page at `/app/page.tsx`
- [x] Implement 3-column grid layout (48%/24%/28%)
- [x] Build fixed 1920×1080 dark-mode container
- [x] Implement live clock component (HH:MM, updates every second)
- [x] Display full date and day of week
- [x] Style with dark mode colors (background #0a0a0a, text #ffffff)

---

## Phase 5: Dashboard — Calendar Panel

**Objective:** Build the left-column calendar display with Google Calendar integration.

- [x] Set up Google Calendar API client with service account or OAuth
- [x] Create `/api/dashboard/calendar` endpoint with 5-minute caching
- [x] Build calendar grid component:
  - [x] Y-axis: hours 7am–10pm
  - [x] X-axis: 5 columns (Terry, Nicole, Skylar, Addison, Family)
  - [x] Color-code each person's column
- [x] Implement all-day events strip at top
- [x] Handle overlapping events (split column width)
- [x] Add red current-time indicator line with dot
- [x] Display header: "Today — Thursday, March 5"

---

## Dashboard — Science Facts

**Objective:** Display daily rotating science facts.

- [x] Create `/api/dashboard/science-fact` endpoint
- [x] Implement date-seeded random selection query
- [x] Build science fact card component with accent bar
- [x] Add midnight rotation logic (client-side check on load)

---

## Phase 7: Dashboard — Countdowns

**Objective:** Build countdown timer displays with real-time ticking.

- [x] Create `/api/dashboard/countdowns` endpoint
- [x] Build countdown list component:
  - [x] Daily countdowns (tick down in minutes)
  - [x] Yearly/one-off countdowns (display days)
  - [x] Amber highlight for < 2 hours remaining
- [x] Implement client-side JS for real-time updates (every second)

---

## Phase 8: Dashboard — Meals and Reminders

**Objective:** Display tonight's dinner and today's reminders.

- [x] Create `/api/dashboard/meals` endpoint for today's meal plan
- [x] Build "Tonight's Dinner" component (centered text display)
- [x] Create `/api/dashboard/reminders` endpoint
- [x] Build reminders list component:
  - [x] Show active reminders for today
  - [x] Apply amber highlight for urgent reminders
- [x] Implement timing offset logic (-1 day, -12 hours, morning of)

---

## Phase 9: Dashboard — Coming Up and Weather

**Objective:** Build the right-column weather iframe and coming up list.

- [x] Create `/api/dashboard/coming-up` endpoint (next 2 days)
- [x] Build "Coming Up" component:
  - [x] Day abbreviation, event name, time
  - [x] Exclude today's events
- [x] Add Weatheristic iframe embed in right column
- [x] Adjust zoom level to fit panel (or use dedicated route later)

---

## Phase 10: Admin Interface — Core Structure

**Objective:** Build the tab-based admin layout with authentication.

- [ ] Create `/app/admin/page.tsx` as admin landing
- [ ] Implement tab navigation (Meals, Ingredients, Meal Plan, Reminders, Countdowns)
- [ ] Create reusable spreadsheet-style grid component
- [ ] Add auth guard to all admin routes
- [ ] Style for functionality (no design polish needed)

---

## Phase 11: Admin Interface — Data Management Tabs

**Objective:** Implement CRUD operations for all data entities.

### Meals Tab
- [ ] Build meals grid: Name, Category, Prep Notes
- [ ] Add create/edit/delete functionality
- [ ] Click meal to open ingredient list and reminders

### Ingredients Tab
- [ ] Build ingredients grid: Name, Storage Type, Department
- [ ] Add CRUD functionality

### Meal Plan Tab
- [ ] Build meal plan grid: Date, Meal Slot, Meal
- [ ] Support variable duration (14, 21, days)
- [ ] Add CRUD for date/meal assignments

### Meal Ingredients Tab
- [ ] Build meal-ingredients junction grid
- [ ] Columns: Meal, Ingredient, Amount, Unit
- [ ] Add CRUD for ingredient links

### Reminders Tab
- [ ] Build reminders grid: Meal, Reminder Text, Timing Offset, Active
- [ ] Add CRUD for reminder management

### Countdowns Tab
- [ ] Build countdowns grid: Name, Target DateTime, Recurrence Type
- [ ] Add CRUD for countdown management

---

## Phase 12: Shopping List Generator

**Objective:** Build auto-generated shopping list view.

- [ ] Create `/app` page
- [/admin/shopping-list ] Add "Next ___ days" dropdown (default 7)
- [ ] Implement aggregation query:
  - [ ] Sum ingredient amounts
  - [ ] Group by ingredient
  - [ ] Sort by store department
- [ ] Make printable and mobile-friendly
- [ ] Create `/api/admin/shopping-list` endpoint

---

## Phase 13: Science Facts Scraper

**Objective:** Populate science_facts table with scraped data.

- [ ] Create one-time scraper script
- [ ] Scrape 5 categories: astronomy, mathematics, physics, chemistry, biology
- [ ] Handle pagination through category pages
- [ ] Extract fact text, image URL, category
- [ ] Download and store images as BYTEA
- [ ] Store source URLs for attribution
- [ ] Run script to populate database

---

## Phase 14: Deployment

**Objective:** Deploy to AWS Lightsail alongside existing services.

- [ ] Configure Nginx reverse proxy for MurrayDash
- [ ] Set up domain (subdirectory or subdomain)
- [ ] Configure environment variables on production
- [ ] Run database migrations on production
- [ ] Run science facts scraper on production
- [ ] Test dashboard on Raspberry Pi browser
- [ ] Verify all components load correctly

---

## Phase 15: Post-Deployment Verification

**Objective:** Verify all features work in production.

- [ ] Test clock and countdown ticking (client-side JS)
- [ ] Test calendar refresh (5-minute polling)
- [ ] Test weather iframe loads
- [ ] Test admin CRUD operations
- [ ] Test shopping list generation
- [ ] Verify dark mode displays correctly
- [ ] Monitor Raspberry Pi stability over 24 hours

---

## Out of Scope (Future Phases)

- Weatheristic dedicated dashboard mode
- Nicole and kids feedback integration
- LLM-powered reminders
- Photo rotation widget
- School closure alerts
- Night mode
