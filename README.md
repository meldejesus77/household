# household

The **shell / dashboard app** for the family. Not a single-feature app — it's the tile grid at **household.wildwoodrose.org** that hosts every household sub-feature as a route inside one Next.js app.

- **Package name:** `household`
- **Repo:** `github.com/meldejesus77/household`
- **Deploy:** AWS Amplify → `household.wildwoodrose.org` (auto-deploys on push to `main`)
- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Prisma + PostgreSQL (Neon)

## Architectural rule

Per `../planning.md`: **one repo, one deployment, all features live here as routes.** Do not spin up a separate repo per feature — add a route under `app/` and a tile on the dashboard instead.

## Features (routes)

| Route | What it is | Data |
|---|---|---|
| `/` | Dashboard tile grid | — |
| `/jo-schedule` | Day schedule builder for Jo | `JoScheduleState` (JSONB, single row) |
| `/packing` | Packing lists for trips | `PackingState` (JSONB, single row) |
| `/budget` | **Planned** monthly household expenses — hardcoded defaults in `BudgetClient.tsx` with per-profile overrides | `BudgetSnapshot` (one row per profile) |
| `/retirement` | Retirement projections | (client-side only, no DB) |
| `/todo` | Shared family to-do list | `Todo` + `TodoSubItem` |
| `/lists` | Grocery / shopping / running lists | `ListsState` (JSONB, single row) |
| `/calendar` | Year-at-a-glance events + US federal & Catholic holidays | `CalendarState` (JSONB, single row) |
| `/health` | Health event log for Mel, Kathy, Jo | `HealthEvent` (append-only) |

## Two "budgets" — clarification

There are two separate budget things in this house. The `/budget` route here is **not** the same as `budget.wildwoodrose.org`.

| Thing | Where it lives | What it does |
|---|---|---|
| `/budget` **(inside this app)** | `app/budget/` in this repo | Planned monthly amounts (rent, groceries, subscriptions, activities). Hand-entered / edited. Data in Neon `BudgetSnapshot`. |
| `budget-standalone` **(separate site)** | `github.com/edgewood1/budget-standalone` → deployed to `budget.wildwoodrose.org` | Actual spend from Plaid bank feeds, categorized by Gemini AI, dashboarded via Firebase. Predates the household dashboard. |

The two are not connected today. If we ever wire them together, the standalone would feed *actuals* into a route here so planned-vs-actual lives in one place.

## Layout

```
household/
├── app/
│   ├── layout.tsx           top-level layout, mounts <HamburgerMenu>
│   ├── page.tsx             dashboard tile grid (edit here to add a feature tile)
│   ├── globals.css
│   ├── api/                 route handlers (GET/PUT/POST/DELETE per feature)
│   │   ├── budget/[profile]/
│   │   ├── calendar/
│   │   ├── health/
│   │   ├── jo-schedule/
│   │   ├── lists/
│   │   ├── packing/
│   │   └── todos/
│   └── {feature}/           one folder per feature route (page.tsx + <Feature>Client.tsx)
├── components/
│   ├── HamburgerMenu.tsx    global nav — edit here when adding a feature
│   └── Nav.tsx
├── lib/
│   ├── prisma.ts            shared Prisma client (uses DATABASE_URL)
│   └── holidays.ts          US federal + Catholic holidays for a given year
├── prisma/
│   └── schema.prisma        single schema; add a new model per feature as needed
├── AGENTS.md                ⚠️ read node_modules/next/dist/docs before writing Next.js code
└── next.config.ts
```

## Adding a new feature (checklist)

1. Add a Prisma model in `prisma/schema.prisma` (JSONB single-row store like `ListsState` if state is a blob; typed table like `Todo` if you need querying).
2. `npx prisma db push` (or generate a migration) to apply to Neon.
3. Create `app/api/<feature>/route.ts` — GET + PUT is enough for JSONB blob stores.
4. Create `app/<feature>/page.tsx` (server) that renders `app/<feature>/<Feature>Client.tsx` (client, `'use client'`).
5. Add a tile to `app/page.tsx` (`features` array).
6. Add a link to `components/HamburgerMenu.tsx` (`links` array).

## Dev

```bash
npm run dev            # next dev
npm run build          # prisma generate && next build
npm run lint
```

`.env` holds `DATABASE_URL` (Neon Postgres). `.env.local` for local overrides. Neither is committed.

## Related folders (in `apps-household/`)

| Folder | Relationship |
|---|---|
| `calendar-list.md`, `next-add/`, `todo-app-research/` | Spec / working notes for features being built into this app. Not deployed. |
| `planning.md` | Overall architecture doc for the household dashboard. Read before making structural changes. |
| `pending.md` | Punch list of outstanding housekeeping tasks (repo deletions, schema pushes, etc.). Check here for follow-ups. |

_Previously here: `retire77/` and `packing77/` — legacy standalone apps, deleted on 2026-08-29 once the in-app `/retirement` and `/packing` routes reached feature parity. Both GitHub repos (`edgewood1/retire77`, `meldejesus77/packing77`) have also been deleted._
