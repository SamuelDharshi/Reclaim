# Reclaim — Revenue Recovery Control Tower

An autonomous revenue recovery control tower for Razorpay merchants. It watches money leaking from
failed payments, abandoned checkouts, failed mandates, and overdue B2B invoices; diagnoses root causes
using Razorpay's real error taxonomy; decides recovery actions through a guardrail engine; executes via
Razorpay's REST API; and audits every decision in a tamper-evident, hash-chained ledger.

## The loop

```
Signal Ingestion → Root-Cause Diagnosis → Guardrail Policy Check → Execution → Audit Ledger
```

1. **Ingestion** (`/api/ingest/batch`) — pulls failed payments, abandoned orders, and halted
   subscriptions from Razorpay's real test-mode API.
2. **Diagnosis** (`/api/diagnose`) — a transparent rules table (not a black-box model) maps
   `error.source` / `error.step` / `error.reason` to a root-cause category and proposed action.
3. **Guardrails** (`/api/guardrails`) — every proposed action is checked against spend caps, retry
   limits, customer cooldowns, and NPCI mandate-retry limits *before* it's allowed to fire. A blocked
   action is a correct outcome, not an error, and is logged as one.
4. **Execution** (`/api/execute`) — approved actions call the real Razorpay API (e.g.
   `POST /payment_links`). Execution failures (rate limits, network errors) are distinguished from
   guardrail stops — a failed API call leaves the case `executing` for retry, it does not get
   mislabeled as `stopped`.
5. **Audit Ledger** (`/api/ledger/[eventId]`) — every decision, pass or fail, is written as a
   SHA-256 hash-chained row (`hash = sha256(prevHash + eventId + actor + decision + timestamp)`).
   `POST /api/ledger/[eventId]` recomputes the whole chain and reports whether it's intact.

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed      # creates real Razorpay test-mode objects + synthetic events
npm run dev
```

Then open `http://localhost:3000` and click **Run Batch** — it calls the real ingestion → diagnosis →
guardrails → execution chain against your Razorpay test-mode account.

### Environment

- `.env` — `DATABASE_URL` only, read by the Prisma CLI (`prisma migrate`, `prisma studio`, seed script).
- `.env.local` — Razorpay keys and app config, read by the Next.js server at runtime. Never commit this
  file (already git-ignored).

```
DATABASE_URL="file:./dev.db"
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## Screens

- **`/`** — Control Tower Home: live at-risk/recovered totals, a money-flow Sankey diagram derived from
  real event aggregates, per-surface tiles, and the Run Batch control.
- **`/cases`** — Kanban board mirroring backend state (`Detected → Diagnosed → Executing → Recovered →
  Stopped/Escalated`). Read-only by design — these states are agent-reported, not editable.
- **`/cases/[id]`** — Case detail with the full audit ledger, hash-chain verification, and a banner
  explaining *why* a stopped or escalated case landed where it did.
- **`/guardrails`** — Editable policy: max attempts, cooldown, spend cap, escalation threshold, DND. NPCI
  mandate-retry windows are shown but not editable (compliance, not configuration).
- **`/analytics`** — Recovery rate by category, average time to recovery, guardrail block reasons, all
  computed from the database — no estimates.

## What's real, what isn't

- Every rupee shown traces back to a `RevenueEvent` row created from an actual Razorpay API response
  (or a clearly-labeled synthetic seed record, since a fresh test account has no failed-payment history).
- Every payment link is a real `POST /payment_links` call against Razorpay test mode.
- Every audit entry's hash is computed, not decorative — `/api/ledger/[eventId]` (POST) recomputes and
  verifies the whole chain.
- **Known limitation:** the guardrail engine's max-attempts/cooldown rules are enforced per-intervention,
  but the current loop creates at most one intervention per event (an event either resolves or sits in
  `executing` for retry). Those specific rules are correctly implemented but won't visibly fire against
  this single-attempt seed dataset — the spend-cap escalation and execution-failure retry path do fire
  and are visible in the demo data.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Prisma/SQLite · Zustand · Recharts · Framer Motion ·
Razorpay REST API (test mode).
