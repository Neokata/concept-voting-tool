# Concept Voting Tool — POC

A lightweight web app for running customer ideation sessions. Participants vote Yes/No on concepts (with a 30-Yes cap each), and the app surfaces the top 30 in real time.

Built as a POC for the Innovation Awesome team's business case. Data lives in the browser only — no backend.

## Try it

Live deployment: https://concept-voting-app.vercel.app

### Walkthrough

1. **Admin** (`/admin`): create a new session, pick a customer + date, select concepts. Optionally open it immediately. You'll get a 6-character join code.
2. **Join** (`/join`): enter the code, pick an alias, start voting. You can use a different browser or incognito window to simulate a second participant.
3. **Results** (`/results/[code]`): live top-30 results, filterable to "All concepts" or "My votes".
4. **Admin → Concepts**: manage the concept library, suppress concepts for specific customers, see how each concept has performed historically.

## Tech

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **localStorage** for persistence (single namespaced key, schema-versioned)
- **No backend** — all data is in the browser
- Cross-tab live updates via `storage` events
- 30 sample concepts and 3 sample customers seeded on first visit

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Build for production

```bash
npm run build
npm start
```

## Deploy

The project is already deployed via Vercel. To redeploy:

```bash
vercel --prod
```

## What's intentionally out of scope

- Multi-device real-time sync (would need a backend)
- Authentication / authorization (single-device trust model)
- PII handling (aliases only, per the business case)
- Mobile-first polish

## Project layout

```
app/
  page.tsx                 ← landing
  layout.tsx               ← root layout + nav
  join/                    ← participant joins by code + alias
  session/[code]/          ← voting screen
  results/[code]/          ← live top-30
  admin/
    page.tsx               ← session list with filters
    new/page.tsx           ← create a session
    concepts/page.tsx      ← concept library + CRUD
lib/
  types.ts                 ← data model
  store.ts                 ← localStorage wrapper + targeted mutations
  voting.ts                ← aggregation, top-30, sort/filter helpers
  seed.ts                  ← first-time seed data
  hooks.ts                 ← useStore() React hook
```

## Reset data

Visit `/admin` and click the red "Reset data…" button at the bottom. Wipes everything in the current browser.