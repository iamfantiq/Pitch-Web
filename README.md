# Modular Pitch — configurator & quote requests

Website for modular football pitches: customers pick a pitch, configure it (size, height, branding, fencing,
finish, turf, extras), see a live price and a 3D preview, add several pitches to a cart and request a quote.
The server recalculates every price, stores each configuration with its full bill of materials (BOM),
generates a PDF offer and emails it to the customer and to you.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · next-intl (EN/LV) · Zustand · React Three Fiber ·
Drizzle ORM + Postgres (embedded PGlite locally) · @react-pdf/renderer · Resend · Vitest · Playwright.

## Run locally

Requires Node.js 20.9+ and pnpm (`npm install -g pnpm`).

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

No accounts are needed locally: the database lives in `.data/pglite`, emails (with the PDF) are written to
`.data/outbox`, uploads go to `.data/uploads`. Delete `.data/` to start fresh.

| Command | What it does |
|---|---|
| `pnpm test` | Pricing/BOM unit tests (Vitest) — includes the check that standard configs reproduce catalog prices |
| `pnpm e2e` | End-to-end test: configure → cart → quote → PDF email (Playwright; builds and starts the app) |
| `pnpm typecheck` / `pnpm lint` | Type and lint checks |
| `pnpm db:generate` | Create a new SQL migration after editing `lib/db/schema.ts` |

## Changing prices and products

All numbers live in three files — no logic changes needed. Bump `pricing.version` when you change prices;
every quote stores the version it was priced with.

- **`config/products.ts`** — the five products: catalog price, board width, board/bar heights, goal size,
  size limits and board layout.
- **`config/pricing.ts`** — pricing mode, VAT, rounding, labour/overhead/margin, construction rules,
  **option prices** (branding €/m², turf €/m², nets, installation…) and **delivery zones**.
- **`config/materials.ts`** — material catalog: steel profiles (kg/m, €/kg), plywood sheet, hardware, nets,
  print, turf, finishing services.

### Pricing modes

- `mode: "calibration"` (current): custom configurations are priced as
  `catalog price × BOM cost(config) / BOM cost(standard)`. Only the *ratios* of unit costs matter, so
  placeholder costs are fine. The five standard configurations always equal the catalog prices.
- `mode: "cost"`: price = (materials + labour + finishing + overhead) × (1 + margin). Switch once real unit
  costs are entered in `config/materials.ts` and `config/pricing.ts`.

Options (branding, turf, nets, powder coating, extras, installation) are always priced from
`pricing.options`; delivery from `pricing.delivery` per quote.

## Deploy (Vercel)

1. Import the GitHub repository in Vercel (framework: Next.js, no build settings needed).
2. **Storage → Create Database → Neon** (free tier) and connect it to the project — this sets `DATABASE_URL`.
   Tables are created automatically on the first request.
3. **Storage → Create → Blob** and connect it — this sets `BLOB_READ_WRITE_TOKEN` (logo uploads).
4. Create a [Resend](https://resend.com) account, verify your sending domain, and add `RESEND_API_KEY`,
   `EMAIL_FROM` and `QUOTE_NOTIFY_EMAIL`.
5. Set `NEXT_PUBLIC_SITE_URL` to your domain. Optionally add Turnstile keys.
6. Redeploy. See `.env.example` for every variable.

## Project structure

```
config/          products, pricing, materials, options, site details — edit these
lib/pricing/     geometry → BOM → cost → price → quote totals (pure functions, unit-tested)
lib/quote/       quote request schema, server-side quote service, offer/spec text
lib/db/          Drizzle schema, migrations, Postgres/PGlite client
lib/pdf/         PDF offer (Inter font for Latvian diacritics)
lib/email/       email templates and sending (Resend or local outbox)
components/      UI: configurator, 3D scene, cart, quote form
app/[locale]/    pages (en, lv); app/api/ — quote and upload endpoints
messages/        translations (add a language: new JSON file + entry in i18n/routing.ts)
e2e/             Playwright tests
```

## Phase 2 — supplier orders

Every BOM line references a stable material ID (`config/materials.ts`), and each quote stores its items'
BOMs plus an aggregated material summary. Supplier purchase orders will map material IDs to suppliers and
aggregate accepted quotes — a new module on top of `lib/pricing/aggregate.ts`, not a rewrite.
