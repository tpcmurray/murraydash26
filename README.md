# MurrayDash

A family information dashboard designed to run on a 1080p monitor in the Murray family's home foyer, powered by a Raspberry Pi.

![Dashboard Preview](docs/murraydash-wireframe.html)

## Overview

MurrayDash consists of two interfaces served from the same Next.js application:

- **Dashboard View** — A read-only, always-on, dark-mode display optimized for glanceable information. Unauthenticated, loaded by the Raspberry Pi's browser.
- **Admin Interface** — A spreadsheet-style data management UI for Terry and Nicole, behind Google OAuth. Accessed from a PC browser.

## Features

### Dashboard View

- **Today's Calendar** — Visual time-block grid showing events from Google Calendar for all family members
- **Clock & Date** — Large clock display with full date and day of week
- **Science Fact** — Random daily fact from science categories (astronomy, mathematics, physics, chemistry, biology)
- **Weather** — Embedded Weatheristic iframe
- **Countdowns** — Real-time countdown timers (daily, yearly, one-off)
- **Tonight's Dinner** — Current meal plan entry
- **Reminders** — Active reminders for today based on meal prep
- **Coming Up** — Calendar events for the next 2 days

### Admin Interface

- **Meals** — Manage meal library with categories (breakfast/lunch/dinner/snack)
- **Ingredients** — Track ingredients with storage type and department
- **Meal Plan** — Assign meals to dates and meal slots
- **Meal Ingredients** — Link ingredients to meals with amounts and units
- **Reminders** — Set prep reminders attached to meals
- **Countdowns** — Create countdown timers with recurrence options
- **Shopping List** — Auto-generated shopping list sorted by store department

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL |
| ORM | Drizzle |
| Auth | NextAuth.js with Google OAuth |
| Calendar API | Google Calendar API v3 |
| Styling | Tailwind CSS v4 |
| Client Device | Raspberry Pi (Chromium kiosk mode) |

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Google Cloud project with OAuth 2.0 credentials
- Google Calendar API enabled

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MurrayDash26
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file with the following:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:5432/murraydash

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Google Calendar (service account or OAuth)
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY=your-private-key
   GOOGLE_CALENDAR_ID=your-calendar-id
   ```

4. **Set up the database**
   ```bash
   # Generate and run migrations
   npm run db:generate
   npm run db:push

   # (Optional) Populate science facts
   # npm run db:seed-facts
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the dashboard**
   - Dashboard: http://localhost:3000
   - Admin: http://localhost:3000/admin

## Project Structure

```
MurrayDash26/
├── docs/                      # Documentation
│   ├── murraydash-tdd.md    # Technical design document
│   └── murraydash-wireframe.html
├── plans/                    # Project plans
│   └── murraydash-tasks.md
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/             # API routes
│   │   │   └── auth/        # NextAuth configuration
│   │   ├── admin/           # Admin interface pages
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Dashboard page
│   │   └── globals.css      # Global styles
│   ├── db/                  # Database configuration
│   │   ├── index.ts         # DB connection
│   │   └── schema.ts        # Drizzle schema
│   ├── types/               # TypeScript type definitions
│   ├── auth.ts              # NextAuth configuration
│   └── middleware.ts        # Auth middleware
├── drizzle.config.ts        # Drizzle configuration
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## API Routes

### Dashboard (Unauthenticated)

| Route | Purpose |
|-------|---------|
| `GET /api/dashboard/calendar` | Today's events and next 2 days |
| `GET /api/dashboard/meals` | Today's meal plan |
| `GET /api/dashboard/reminders` | Active reminders |
| `GET /api/dashboard/countdowns` | All countdowns |
| `GET /api/dashboard/science-fact` | Today's science fact |

### Admin (Authenticated)

| Route | Purpose |
|-------|---------|
| `GET/POST /api/admin/meals` | Meals CRUD |
| `GET/POST /api/admin/ingredients` | Ingredients CRUD |
| `GET/POST /api/admin/meal-ingredients` | Meal-ingredient links |
| `GET/POST /api/admin/meal-plan` | Meal plan entries |
| `GET/POST /api/admin/reminders` | Meal reminders |
| `GET/POST /api/admin/countdowns` | Countdowns |
| `GET /api/admin/shopping-list?days=7` | Generated shopping list |

## Deployment

The app is designed to deploy to AWS Lightsail alongside other family projects:

1. Set up PostgreSQL database on existing Lightsail instance
2. Configure Nginx reverse proxy
3. Deploy with `npm run build` and `npm start`
4. Set up Raspberry Pi with Chromium in kiosk mode

## License

Private — For Murray Family Use Only
