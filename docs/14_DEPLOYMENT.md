# 14. Deployment Guide — ThumbIntel

| | |
|---|---|
| **Status** | `published` |
| **Owner** | DevOps (platform team) |
| **Applies to** | local dev, preview/staging, production |
| **Last updated** | 2026-08-31 |
| **Sibling docs** | `00_SHARED_CONTEXT.md`, `04_ARCHITECTURE.md`, `06_API.md` |

This document is the single source of truth for deploying and operating **ThumbIntel**, the
YouTube-thumbnail analysis + recreation SaaS. Every environment variable, command, workflow and
runbook below is locked. If a decision appears to contradict `00_SHARED_CONTEXT.md` (sections 1–19),
the shared context wins — raise it in the platform channel, do not "fix" it silently.

Scope: local development, production provisioning, CI/CD, environments, operations, rollback, and
troubleshooting. What this doc is **not**: business logic, scoring-model math, editor canvas
internals — those live in `06_API.md` and the architecture doc.

---

## 1. Overview & Topology

### 1.1 Deployment surfaces

| Surface | Host | Runs | Notes |
|---|---|---|---|
| Web app (Next.js 15 App Router) | **Vercel** | Serverless functions, ISR, edge/Node runtimes | Single Vercel project, env-per-branch (sec. 7) |
| PostgreSQL (OLTP) | **Neon** | Serverless Postgres, autoscaling, PITR | Pooled URL at runtime, `DIRECT_URL` for migrations |
| Object storage + presigned URLs | **Cloudflare R2** | Thumbnail uploads, OCR temp files, exported designs | Zero egress fees; public reads via custom domain CDN |
| Background jobs | **Inngest** | Step functions, schedules (cron), debounce/rate-limit | Event key + signing key per environment |
| AI vision (primary) | **Anthropic Claude** | Vision analysis, typography/style detection | Server-side key only; model tier drives cost |
| OCR fallback | **Tesseract.js** | Runs inside Inngest job (Node worker) | Bundled worker/core/lang assets — see sec. 5.9.4 |
| Payments | **Stripe** | Checkout, subscriptions, webhooks | `/api/webhooks/stripe` |
| Email | **Resend** | Transactional email (signups, export-ready, failure) | Verified sender domain required |
| Product analytics | **PostHog** | Client telemetry + server-side events | `NEXT_PUBLIC_` keys are read-only |
| Error tracking | **Sentry** | Errors + release maps + alerts | DSN per env; source maps via `SENTRY_AUTH_TOKEN` |
| Rate limiting (optional) | **Upstash Redis** | Token-bucket on AI endpoints | See sec. 5.10 |
| Repo + CI/CD | **GitHub Actions** | Lint → test → build → migrate → deploy | Secrets in repo/org Actions |

### 1.2 Runtime topology (ASCII)

```text
                          ┌────────────────────────────── VERCEL ──────────────────────────────┐
   Browser (canvas        │  Edge/Node: Next.js 15 App Router                                 │
   editor, React-Konva)   │                                                                    │
        │                 │   /app/**   server components           /api/**   route handlers   │
        │  HTTPS          │      │                                       │                     │
        └───────────────► │   Auth.js v5 (JWT) ───────────► Neon (DATABASE_URL, pooled)        │
                          │      │                                 ──► DIRECT_URL (migrate only)│
                          │   R2 presigned PUT/GET ◄───────► R2 (uploads, exports)             │
                          │      │                                   ▲                         │
                          │   /api/inngest ◄──────── Inngest Cloud ──┘ (polls, cron, steps)    │
                          │      │                                   │                         │
                          │   /api/webhooks/stripe ◄── Stripe ───────┘ webhook events          │
                          │      │                                                                │
                          │   Resend  ·  PostHog  ·  Sentry  ·  Upstash (rate limit)             │
                          └───────────────────────────────────────────────────────────────────────┘
   AI path (server-side only):  /api/analyze ──► Inngest job ──► Anthropic Claude Vision
                                                       └─ fallback ─► Tesseract.js (bundled worker)
```

### 1.3 Environments

| Env | Vercel branch | Domain | DB branch | Purpose |
|---|---|---|---|---|
| `preview` | every PR / branch | `<branch>.thumbintel.app` | Neon branch `preview-<pr>` | isolated test of schema + behavior |
| `staging` | `main` (pre-production check) | `staging.thumbintel.com` | Neon branch `staging` | final verification, E2E gate, seed data |
| `production` | `production` branch / promote | `thumbintel.com` | Neon main branch | live traffic |

See section 7 for the promotion flow.

---

## 2. Prerequisites

### 2.1 Tool versions (locked)

| Tool | Min | Recommended | Why |
|---|---|---|---|
| Node.js | `>=20.19.0` | **22 LTS** (`v22.x`) | Next.js 15 requirement; 22 is current LTS |
| pnpm | `>=9.0.0` | **10.x** | Package manager (single-repo, locked in shared context sec. 5). pnpm 10 blocks undeclared build scripts — handled in sec. 3.3 |
| Git | `>=2.40` | latest | Workflow |
| Docker | — | optional | Local Neon/Redis only if you avoid remote; not required |
| Playwright browsers | — | installed via `pnpm exec playwright install chromium` | E2E + screenshot diffs |

Verify:

```bash
node --version   # v22.x
pnpm --version   # 10.x
git --version
```

Install pnpm via Corepack (recommended) or standalone:

```bash
corepack enable
corepack prepare pnpm@latest-10 --activate
```

### 2.2 Accounts & access notes

| Service | Account | Who creates it | Key artifacts | Access notes |
|---|---|---|---|---|
| **GitHub** | Org `thumbintel` | DevOps | Repo + Actions secrets | CI writes to Vercel/Neon via tokens — never shared keys |
| **Vercel** | Team `thumbintel` | DevOps | Project, env vars, domains | Owners + DevOps; members limited to project scope |
| **Neon** | Project `thumbintel-prod` | DevOps | Pooled `DATABASE_URL`, `DIRECT_URL` | Branch per env; connection limits enforced via pooled URL |
| **Cloudflare** | Account (R2) | DevOps | Account ID, R2 API token, custom domain | Token scoped to the R2 bucket only (sec. 5.2) |
| **Anthropic** | Console org | DevOps | `ANTHROPIC_API_KEY` | Server-side only; spend quota + model-tier guardrails (sec. 8.4) |
| **Inngest** | Cloud account | DevOps | Event key + signing key per env | Create a **separate Inngest environment per Vercel env** (sec. 5.3) |
| **Stripe** | Account | DevOps | Secret key, publishable key, webhook secret | Test mode + live mode are separate sets |
| **Resend** | Account | DevOps | API key, verified sender domain | DNS records (SPF/DKIM) must be added for `thumbintel.com` |
| **PostHog** | Project `thumbintel` | DevOps | `NEXT_PUBLIC_POSTHOG_KEY` + host | Public key is client-safe; server key for backend events |
| **Sentry** | Org `thumbintel` | DevOps | DSN per project/env, auth token | Token only used in CI to upload source maps |
| **Upstash** (optional) | Account | DevOps | REST URL + token | Only if rate limiting is enabled (sec. 5.10) |

Team access model: every owner/DevOps member gets write access to the git repo and the Vercel,
Neon, Cloudflare, Inngest, and Sentry dashboards. Secrets never enter git — they live in Vercel
env vars (per environment), Neon, and GitHub Actions secrets.

---

## 3. Local Development

### 3.1 Clone / init

```bash
git clone git@github.com:thumbintel/thumbintel.git
cd thumbintel
git checkout -b feat/my-feature      # work on a branch, not main
```

### 3.2 Install dependencies

```bash
pnpm install
# pnpm 10 blocks packages with postinstall scripts (prisma engines, sharp, playwright):
pnpm approve-builds                 # review the list, approve prisma + sharp
pnpm exec playwright install chromium   # first time only (E2E + visual regression)
```

### 3.3 Environment file

```bash
cp .env.example .env
# now edit .env and fill every value — see section 4 for the full .env.example and
# where to obtain each value. All values are local-only; never commit .env.
```

If you use Docker for local services instead of remote ones:

```bash
docker compose up -d   # optional: local postgres (Neon-compatible) + local redis — see docker-compose.dev.yml
```

### 3.4 Database: migrate + seed

```bash
pnpm prisma migrate dev --name init    # creates/updates the local DB and generates the client
pnpm prisma db seed                    # inserts personas, tiers, scoring weights, demo data
```

- `migrate dev` requires the **direct** URL (`DIRECT_URL`). Locally both `DATABASE_URL` and
  `DIRECT_URL` point at the same local Postgres, so either works — but keep the split anyway so
  your local config mirrors production.
- To re-create the local DB from scratch: `pnpm prisma migrate reset --force`.

### 3.5 Run the app

```bash
pnpm dev                     # Next.js dev server → http://localhost:3000
```

### 3.6 Run the Inngest dev server

In a second terminal:

```bash
pnpm inngest dev             # Inngest CLI dev server → http://localhost:8288
```

`pnpm inngest dev` is an alias for `npx inngest-cli@latest dev`. The dev server:

- discovers functions from the app's `inngest/` directory (via `inngest.json` / framework auto-detect),
- **does not** require `INNGEST_EVENT_KEY` (it uses a local guest key) — production keys are only
  needed in deployed environments,
- drives the local `/api/inngest` handler. To point the app's `serve()` at it, set
  `INNGEST_BASE_URL=http://localhost:8288` in `.env`. The dev server UI is at
  http://localhost:8288 — use it to trigger functions manually and inspect step results.

> Both servers must run for local job development: `pnpm dev` (app) and `pnpm inngest dev` (jobs).

### 3.7 Tests

```bash
pnpm lint                                  # ESLint (Next + TS)
pnpm typecheck                             # tsc --noEmit, strict mode
pnpm format                                # Prettier (writes)
pnpm format:check                          # Prettier (CI-safe read-only)
pnpm test                                  # Vitest unit tests (scoring engine, utils, zod schemas)
pnpm test:api                              # API route tests with MSW (server-side mock of Anthropic/R2)
pnpm test:e2e                              # Playwright (Chromium), reads TEST_* env vars (sec. 4)
pnpm build                                 # production build (next build) — must pass locally
pnpm start                                 # serve the production build → http://localhost:3000
```

Test script reference (`package.json`):

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:api": "vitest run --project api",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "build": "next build",
    "start": "next start -p 3000",
    "inngest": "inngest-cli"
  }
}
```

### 3.8 Local production build

```bash
pnpm build            # must succeed with zero type errors (strict) and a clean lint pass
pnpm start            # serves the built app on :3000
# smoke-test: /api/health returns { status: "ok", db: "up" } (see 5.7.3)
```

---

## 4. Environment Variables

### 4.1 The complete `.env.example`

This is authoritative and locked. Every variable is listed. `(client)` = `NEXT_PUBLIC_*`,
visible to the browser; **all other variables are server-only** — prefixing an existing var with
`NEXT_PUBLIC_` is a security regression (shared context sec. 3: "server-side secrets only").

```env
# ─────────────────────────────────────────────────────────────────────────────
# ThumbIntel — .env.example
# Copy to .env (local) and to Vercel env vars per environment (production / preview / development).
# Secret values: server-only unless marked (client). NEVER commit .env.
# ─────────────────────────────────────────────────────────────────────────────

# ── App ────────────────────────────────────────────────────────────────────────
# Canonical public origin, no trailing slash. Used for absolute links in emails,
# OG images, and webhook URL construction. (client) — must be public for links.
NEXT_PUBLIC_APP_URL=http://localhost:3000
# ─────────────────────────────────────────────────────────────────────────────
# ── Auth.js v5 (JWT) ───────────────────────────────────────────────────────────
# Signing secret for Auth.js JWT. GENERATE, don't invent:
#   npx auth@latest secret            (writes a strong value)
#   or: openssl rand -base64 32
# Server-only. Rotate by re-issuing the token and updating EVERY environment at
# once — mismatches cause "malformed JWT" / silent sign-out (see sec. 9.4).
AUTH_SECRET=
# Trust the Vercel proxy for HTTPS detection. true in ALL deployed envs.
AUTH_TRUST_HOST=true
# Canonical URL for OAuth redirects/callbacks. Vercel sets this automatically
# per deployment; override only if you host the app outside Vercel.
# AUTH_URL=
# ─────────────────────────────────────────────────────────────────────────────
# ── Database — Neon PostgreSQL ────────────────────────────────────────────────
# RUNTIME pooled connection string. In Neon this is the branch URL with:
#   host  = <branch>-pooler.<region>.aws.neon.tech   (PgBouncer pooler)
#   query = ?sslmode=require&connection_limit=10
# Server-only. The pooled (pgbouncer) endpoint multiplexes serverless connections
# and prevents connection exhaustion (sec. 9.8). NEVER use this for migrations.
DATABASE_URL=
# MIGRATION / MAINTENANCE direct connection string. Same branch, but the
# NON-pooler host (no "-pooler"), sslmode=require. Used ONLY by:
#   prisma migrate dev|deploy, prisma db seed, prisma db pull, scripts/*/backup.mjs
# Direct connections are exempt from the pooler's limit but still counted against
# the branch — keep maintenance short-lived.
DIRECT_URL=
# Prisma migrate shadow database (optional, local dev only). Can be a second
# database on the same local Postgres or a Neon branch.
# SHADOW_DATABASE_URL=
# ─────────────────────────────────────────────────────────────────────────────
# ── Cloudflare R2 ─────────────────────────────────────────────────────────────
# R2 account id (R2 dashboard → account settings). Server-only.
R2_ACCOUNT_ID=
# R2 API token with the exact permissions in sec. 5.2.2 (read/write this bucket only).
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
# S3-compatible endpoint. If you use a CUSTOM DOMAIN for the API endpoint:
#   https://<custom-api-domain>            (recommended — see 5.2.4)
# otherwise the default:
#   https://<account-id>.r2.cloudflarestorage.com
R2_ENDPOINT=
# Bucket name. Keep one bucket per environment: thumbintel-prod / thumbintel-staging / thumbintel-preview.
R2_BUCKET_NAME=
# (client) Public base URL for READABLE thumbnails/exports served via the custom
# CDN domain (e.g. https://cdn.thumbintel.com). Used in <img src>, editor background,
# og:image. Never points at the S3 endpoint (that is a private API URL).
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=
# Server-only variant used to construct presigned PUT/GET URLs (may differ from
# the public URL when the CDN domain is separate from the signing host).
R2_PUBLIC_BASE_URL=
# ─────────────────────────────────────────────────────────────────────────────
# ── Anthropic (primary vision AI) ─────────────────────────────────────────────
# Console: https://console.anthropic.com → API Keys. Server-only.
ANTHROPIC_API_KEY=
# Model tier (locked by cost policy, shared context sec. 5 / sec. 8.4):
#   claude-3-7-sonnet (default) or a newer Sonnet-tier vision model after budget review.
ANTHROPIC_MODEL=claude-3-7-sonnet
# Optional: set a hard spend cap and log AI cost per analysis (server-side only).
ANTHROPIC_MAX_TOKENS_PER_ANALYSIS=4096
# ─────────────────────────────────────────────────────────────────────────────
# ── Tesseract OCR fallback ─────────────────────────────────────────────────────
# When Claude is unavailable or the image fails vision pre-checks, the Inngest job
# falls back to Tesseract.js. The worker/core/language files are BUNDLED (sec. 5.9.4)
# and referenced relative to the deployment, so no URL is required. Keep this flag
# false in production to force strict mode:
TESSERACT_DEV_URL=
# Language pack for OCR. eng only in v1.
TESSERACT_LANG=eng
# ─────────────────────────────────────────────────────────────────────────────
# ── Inngest ───────────────────────────────────────────────────────────────────
# Inngest event key for THIS environment (one per env: prod/staging/preview).
# Inngest Cloud → your app → Environments → Keys. Server-only.
INNGEST_EVENT_KEY=
# Signing key — Inngest signs requests to /api/inngest with it; mismatch = 401
# and jobs never start (sec. 9.6).
INNGEST_SIGNING_KEY=
# Points the serve() handler at the Inngest cloud URL for this region:
#   https://api.inngest.com          (US cloud)
#   https://api.eu.inngest.com       (EU cloud)
# In local dev set it to the dev server: http://localhost:8288
INNGEST_BASE_URL=https://api.inngest.com
# ─────────────────────────────────────────────────────────────────────────────
# ── Stripe ────────────────────────────────────────────────────────────────────
# Dashboard → Developers → API keys. Server-only. Use a SEPARATE key for test
# vs live mode; never mix.
STRIPE_SECRET_KEY=
# Dashboard → Developers → Webhooks → your endpoint → Signing secret (whsec_...).
# Server-only. Rotate with the endpoint via `stripe listen` during local dev.
STRIPE_WEBHOOK_SECRET=
# (client) Publishable key (pk_...). Safe to expose.
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Price IDs for the Pro plan (billing service reads these at checkout time).
STRIPE_PRICE_ID_PRO_MONTHLY=price_xxxxxxxx
STRIPE_PRICE_ID_PRO_YEARLY=price_yyyyyyyy
# ─────────────────────────────────────────────────────────────────────────────
# ── Resend ─────────────────────────────────────────────────────────────────────
# Dashboard → API Keys. Server-only.
RESEND_API_KEY=
# Verified "From" address on the thumbintel.com sender domain (SPF/DKIM must pass).
EMAIL_FROM=ThumbIntel <support@thumbintel.com>
# ─────────────────────────────────────────────────────────────────────────────
# ── PostHog ───────────────────────────────────────────────────────────────────
# (client) Project API key (phc_...). Public by design — powers the client events.
NEXT_PUBLIC_POSTHOG_KEY=
# (client) Host for this region: https://us.i.posthog.com (US) or https://eu.i.posthog.com (EU).
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
# Server-side events (analytics for job results, export metrics) — use the full
# project API key, server-only.
POSTHOG_API_KEY=
# ─────────────────────────────────────────────────────────────────────────────
# ── Sentry ────────────────────────────────────────────────────────────────────
# DSN for THIS environment (create one project per env, or use sentry-cli env release tags).
# Dashboard → Settings → Projects → <project> → Client Keys. Server-only (do not NEXT_PUBLIC_).
SENTRY_DSN=
# Org slug + project slug (used by sentry-cli to upload source maps in CI).
SENTRY_ORG=thumbintel
SENTRY_PROJECT=thumbintel-nextjs
# Auth token with project:write. Stored ONLY in GitHub Actions secrets (sec. 6.3),
# never in Vercel.
# SENTRY_AUTH_TOKEN=
# ─────────────────────────────────────────────────────────────────────────────
# ── Upstash Redis (optional rate limiting) ────────────────────────────────────
# Enable token-bucket limits on /api/analyze and AI-heavy endpoints. Server-only.
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
# ─────────────────────────────────────────────────────────────────────────────
# ── Test-only (never set in production envs) ──────────────────────────────────
# Playwright E2E hits a THROTTLED, mocked AI backend. Set per CI job / local run.
PLAYWRIGHT_BASE_URL=http://localhost:3000
E2E_TEST_EMAIL=e2e@thumbintel.test
E2E_TEST_PASSWORD=e2e-secret-1
# MSW (API tests) injects a fake Anthropic key — never a real one.
MSW_ANTHROPIC_MOCK=1
```

### 4.2 Variable quick-reference table

| Variable | Scope | Obtain from |
|---|---|---|
| `AUTH_SECRET` | server | `npx auth@latest secret` or `openssl rand -base64 32` |
| `DATABASE_URL` / `DIRECT_URL` | server | Neon dashboard → branch → Connection details (copy **pooled** vs **direct** separately) |
| `R2_ACCOUNT_ID` | server | Cloudflare dashboard → R2 → account ID |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | server | Cloudflare → R2 → Manage R2 API Tokens → Create API token |
| `R2_ENDPOINT` | server | Custom API domain (see 5.2.4) or `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | server | R2 → Buckets |
| `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` | client | Your public CDN domain (e.g. `https://cdn.thumbintel.com`) |
| `ANTHROPIC_API_KEY` | server | console.anthropic.com → API Keys |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | server | Inngest Cloud → app → Environments → Keys |
| `STRIPE_SECRET_KEY` | server | Stripe dashboard → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | same page (pk_...) |
| `STRIPE_WEBHOOK_SECRET` | server | Stripe → Webhooks → endpoint → signing secret (whsec_...) |
| `STRIPE_PRICE_ID_PRO_*` | server | Stripe → Product catalog → price IDs |
| `RESEND_API_KEY` | server | resend.com → API Keys |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | client | PostHog → Project settings → API keys |
| `SENTRY_DSN` | server | Sentry → Project → Client Keys |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | server | Upstash console → database → REST API |

**Rule**: an env var that starts with `NEXT_PUBLIC_` is **always** baked into the client bundle.
Never store a secret under a `NEXT_PUBLIC_` name.

---

## 5. Production Deployment (step-by-step)

Run these in order. Each step is idempotent so it can be re-run safely.

### 5.1 Neon: project, branches, migrations

1. **Create the project** — Neon console → **New project** → name `thumbintel-prod`, region
   **closest to your Vercel deployment region** (e.g. `us-east-1`-adjacent `aws-us-east-1` for
   us-east Vercel). Compute size: start `0.25 vCPU`, autoscaling to `1 vCPU` (see 8.6).

2. **Create branches per environment** — Neon allows branching:
   - `main` (production), `staging`, and `preview-*` (auto-created per PR, sec. 7).
   Each branch gets its own connection string. **Preview branches** should be **thin-clone** or
   **empty** branches seeded via `prisma db seed` — never point previews at the prod DB.

3. **Get the two connection strings** — branch → **Connect** → select **Prisma**. Copy BOTH:

   ```text
   # Pooled (runtime)   — host contains "-pooler"
   postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/thumbintel?sslmode=require&connection_limit=10

   # Direct (migrations) — host is the bare endpoint, no "-pooler"
   postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/thumbintel?sslmode=require
   ```

   > **The pooled/direct distinction (locked):** the app runs against the **pooled** URL so
   > serverless connections are multiplexed through Neon's PgBouncer and you don't exhaust the
   > branch's connection limit (sec. 9.8). `DIRECT_URL` is reserved for `prisma migrate deploy`
   > and one-off maintenance scripts — direct connections bypass the pooler and are meant to be
   > short-lived.

4. **Apply migrations from your machine** (first time / manual):

   ```bash
   # Uses DIRECT_URL — NEVER the pooled URL for DDL
   pnpm prisma migrate deploy
   ```

   From CI, migrations run in the deploy workflow (sec. 6) — do not run them by hand once CI owns them.

5. **Verify**: run `pnpm prisma migrate status` — should print *"No pending migrations"*.

### 5.2 Cloudflare R2: bucket, CORS, access keys, presigned URLs

#### 5.2.1 Create the bucket

```bash
# using wrangler (pnpm dlx wrangler)
pnpm dlx wrangler r2 bucket create thumbintel-prod
pnpm dlx wrangler r2 bucket create thumbintel-staging
```

#### 5.2.2 Create an R2 API token

Cloudflare dashboard → R2 → **Manage R2 API Tokens** → **Create API token** → **Object Read
& Write** scoped to **only** `thumbintel-prod` (never account-wide). Capture the three values into
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`.

Presigned URLs are generated **server-side** by the app using the AWS SDK v3 S3 client pointed at
`R2_ENDPOINT` (compatible with S3's `putObject`/`getObject` signature). The app code:

```ts
// src/lib/r2.ts (server-only) — locked in architecture doc
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,        // e.g. https://<account>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function presignUpload(key: string, contentType: string): Promise<{ url: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return { url: await getSignedUrl(s3, command, { expiresIn: 60 * 15 }), key }; // 15 min
}

export async function presignDownload(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 60 * 60 * 4 }); // 4 h for editor reopen
}
```

#### 5.2.3 CORS (required for browser uploads)

In the R2 dashboard → bucket → **Settings** → **CORS policy**:

```json
[
  {
    "AllowedOrigins": ["https://thumbintel.com", "https://staging.thumbintel.com", "https://*.thumbintel.app"],
    "AllowedMethods": ["PUT", "GET", "HEAD", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Local dev: add `http://localhost:3000` to `AllowedOrigins`. Missing origins ⇒ CORS `403`/opaque
responses on upload (sec. 9.3).

#### 5.2.4 Public reads via a custom domain (CDN)

1. R2 → bucket → **Settings** → **Custom Domains** → `cdn.thumbintel.com`.
2. Follow the DNS instructions (CNAME to R2's regional endpoint). Cloudflare adds the cert
   automatically.
3. Optionally create a **separate custom API domain** (`r2api.thumbintel.com`) used as
   `R2_ENDPOINT` so presigned requests don't hit the account's raw `*.r2.cloudflarestorage.com`.
4. Set `NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://cdn.thumbintel.com`. Readable assets
   (`uploads/<uuid>.webp`, `exports/<uuid>.svg`) are served from that domain; the storage
   endpoint stays private and is only ever used to sign presigned URLs.

> **R2 egress is $0** — a deliberate cost lever (shared context sec. 5). Thumbnails served to
> authors and OG images are never a surprise line item.

### 5.3 Inngest: event key, signing key, environment

1. **Create Inngest environments** — Inngest Cloud → your app → **Environments**:
   - `Production` (base URL `https://api.inngest.com`)
   - `Staging`, `Preview` (one shared preview env is fine)
2. For each environment open **Keys** and copy:
   - **Event key** → `INNGEST_EVENT_KEY` (format `inngest-event-…` / `inngest-event-eu-…` for EU).
   - **Signing key** → `INNGEST_SIGNING_KEY` (used by Inngest to sign the request hitting
     `/api/inngest`). Different per environment — setting the wrong pair yields HTTP 401
     `Invalid signing key` (sec. 9.6).
3. `INNGEST_BASE_URL=https://api.inngest.com` (US) or `https://api.eu.inngest.com` (EU) — match
   the region your keys were issued in.
4. The app registers functions at `/api/inngest` via `Inngest.serve()`. After deploy, open the
   Inngest dashboard → **Functions** and confirm the functions registered (the dashboard will
   show a green **"Connected"** state; a yellow/red **"Not found"** means the endpoint isn't
   deployed or the URL is wrong).

### 5.4 Vercel: import, env vars, domains

1. **Import the repo** — Vercel → **Add New → Project** → select `thumbintel/thumbintel`.
   - Framework preset: **Next.js** (auto-detected).
   - Root directory: repo root (single-repo, shared context sec. 15).
   - Build command: `pnpm build`; Install command: `pnpm install`; Output dir: `.next`.
   - **Set Node version**: Settings → General → Node.js Version → **22.x**.
   - **pnpm version**: ensure `packageManager` is pinned in `package.json`
     (e.g. `"packageManager": "pnpm@10.x"`) so Vercel/CI use the same pnpm.
2. **Add environment variables** per environment (Production, Preview, Development) — paste the
   full `.env.example` values from section 4. Use **separate secret values per environment**
   (Neon branch, Inngest env, Stripe test vs live, R2 bucket per env).
   - Preview uses **development**-tier values + the shared `thumbintel-preview` bucket +
     Neon `preview-*` branches.
3. **Domains** — Project → Settings → Domains:
   - `thumbintel.com` (production)
   - `staging.thumbintel.com` (staging)
   - Preview deployments auto-get `<git-branch>-<hash>.thumbintel.app` URLs; optionally add
     `*.thumbintel.app` as a wildcard.
4. **Confirm** `AUTH_TRUST_HOST=true` is set — Vercel's fronting proxy is what makes
   `AUTH_URL`/`AUTH_TRUST_HOST` behave correctly (sec. 9.4).

### 5.5 Stripe: webhook endpoint, events, secret

1. **Create the webhook endpoint** — Stripe dashboard → **Developers → Webhooks → Add endpoint**:
   - URL: `https://thumbintel.com/api/webhooks/stripe` (staging: `https://staging.thumbintel.com/api/webhooks/stripe`).
   - Events (locked to what the billing service consumes):

     ```text
     checkout.session.completed
     checkout.session.async_payment_succeeded
     customer.subscription.updated
     customer.subscription.deleted
     invoice.payment_succeeded
     invoice.payment_failed
     ```

2. **Copy the signing secret** → `whsec_...` → `STRIPE_WEBHOOK_SECRET`.
3. **Verify locally** with the CLI:

   ```bash
   pnpm dlx stripe listen --forward-to http://localhost:3000/api/webhooks/stripe \
     --api-key sk_test_xxxx
   # prints: > Ready! Your webhook signing secret is whsec_xxxxxxxx  → paste into .env
   ```

4. The handler verifies signatures with `stripe.webhooks.constructEvent()` (server-only route,
   `POST /api/webhooks/stripe`). Signature failures ⇒ 400 `stripe_signature_invalid` (sec. 9.5).

### 5.6 Resend

1. **Verify the sender domain** — Resend dashboard → Domains → add `thumbintel.com` and add the
   SPF/DKIM/DMARC DNS records at the DNS provider. Wait for status **Verified**.
2. **Create an API key** → `RESEND_API_KEY` (server-only).
3. Set `EMAIL_FROM=ThumbIntel <support@thumbintel.com>`. Emails are sent from the app's
   `src/lib/email.ts` service (Resend SDK) for: sign-in verification, analysis-completed
   notification, export-ready, and failure alerts.

### 5.7 PostHog + Sentry

#### 5.7.1 PostHog
1. Create a project; copy the **project API key** (`phc_...`) → `NEXT_PUBLIC_POSTHOG_KEY`, host →
   `NEXT_PUBLIC_POSTHOG_HOST`.
2. Optional: a separate server-only key for backend events → `POSTHOG_API_KEY`.
3. Enable **cookie-less** or consent-mode capture per the app's `analytics.ts` init
   (`posthog.init(NEXT_PUBLIC_POSTHOG_KEY, { api_host: NEXT_PUBLIC_POSTHOG_HOST, ... })`).

#### 5.7.2 Sentry — DSN + release
1. Create a project (framework: Next.js); copy the DSN → `SENTRY_DSN` per environment.
2. Install the SDK in the app:

   ```bash
   pnpm add @sentry/nextjs
   ```

3. Add a **release tag** so errors map to a deploy. In CI the deploy job runs:

   ```bash
   SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
   SENTRY_ORG=thumbintel \
   SENTRY_PROJECT=thumbintel-nextjs \
   pnpm sentry-cli releases set-commits --auto   # after vercel build
   ```

   Vercel's `@sentry/nextjs` build plugin can also auto-upload source maps (Settings → Build →
   enable the Sentry integration and add `SENTRY_AUTH_TOKEN` as a Vercel env var for that
   integration only). CI uploads are the source of truth; the Vercel integration is optional.

#### 5.7.3 Health endpoint
A `GET /api/health` route (no auth) returns:

```json
{ "status": "ok", "db": "up", "version": "1.0.0", "env": "production" }
```

Used by uptime monitors (sec. 8.2) and by the CI smoke check.

### 5.8 Scheduled tasks

Inngest **cron triggers** own all scheduled work (no Vercel Cron needed):

| Cron | Function | Purpose |
|---|---|---|
| `0 4 * * *` | `cleanup-expired-assets` | delete orphaned R2 objects older than 30 days + their DB rows (`stage: completed`) |
| `0 5 * * 1` | `weekly-digest` | send weekly usage digest email via Resend |
| `0 * * * *` | `retry-failed-analyses` | retry jobs stuck in `failed`/`partial` within the retry budget |
| `0 3 * * *` | `purge-old-billing-events` | compact Stripe event mirror rows older than 90 days |

All follow the stage statuses convention `pending | queued | running | completed | failed |
partial` (shared context sec. 12). Register them in the Inngest function definitions (e.g.
`inngest/functions/cleanup.ts` with `cron: "0 4 * * *"`). They only run in the **production**
Inngest environment — disable cron triggers in staging/preview to avoid duplicate mail.

### 5.9 CDN / caching notes

1. **R2 public URL is the CDN** for static assets: `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` serves
   uploaded thumbnails + exported designs with Cloudflare's global cache (no extra cost).
   Objects get `Cache-Control: public, max-age=31536000, immutable` for `uploads/` and
   `exports/` (they are content-addressed by UUID); `Cache-Control: no-cache` for anything
   mutated in place.
2. **Next.js Image** — point `images.remotePatterns` at the R2 public domain so the optimizer
   re-serves cached derivatives. Set the required `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` in the
   `remotePatterns` config.
3. **API responses** — `s-maxage`/`stale-while-revalidate` on read-only endpoints (GET analysis
   history, score breakdowns) so Vercel's CDN caches them; never cache POST or authed routes.

### 5.10 Optional Upstash Redis (rate limiting)

If rate limiting is enabled for AI-heavy endpoints:

1. Create a **global** Upstash database (rest region near Vercel); copy REST URL + token.
2. The app uses `@upstash/ratelimit` in `middleware.ts` / route handlers for
   `/api/analyze` and `/api/export` (e.g. 10 req / min / IP for anon, 120 for Pro).
3. If Upstash is **not** configured, the rate limiter is a no-op (feature-flagged) — the app
   must never hard-fail on a missing rate-limit backend.

---

## 6. CI/CD

### 6.1 Workflow overview (mermaid)

```mermaid
graph TD
  A[PR opened] --> B[PR job: lint · typecheck · unit · api · build]
  B --> C{All green?}
  C -- no --> A
  C -- yes --> D[Vercel preview deploy]
  D --> E[Preview env on Neon preview branch]

  M[merge to main] --> N[main job: migrate status check]
  N --> O[Playwright E2E - sharded, staging DB]
  O --> P[Vercel preview deploy of main]
  P --> Q[Promote preview -> production]
  Q --> R[vercel promote / prod deploy]
  R --> S[Post-deploy: Sentry release + smoke /api/health]
```

### 6.2 Full workflow — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ─────────────────────────── PR / push checks ───────────────────────────
  checks:
    runs-on: ubuntu-latest
    env:
      CI: "true"
      DATABASE_URL: ${{ secrets.NEON_TEST_POOLED_URL }}      # pooled, dedicated CI Neon branch
      DIRECT_URL: ${{ secrets.NEON_TEST_DIRECT_URL }}
      AUTH_SECRET: ${{ secrets.TEST_AUTH_SECRET }}
      ANTHROPIC_API_KEY: ${{ secrets.MOCK_ANTHROPIC_KEY }}   # MSW mock — never a real key
      NEXT_PUBLIC_APP_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
          run_install: false
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - name: Typecheck
        run: pnpm typecheck
      - name: Format check
        run: pnpm format:check
      - name: Unit tests
        run: pnpm test
      - name: API tests (MSW)
        run: pnpm test:api
      - name: Prisma migrate status (drift guard)
        run: pnpm prisma migrate status || true   # informational on PR; hard-gate on main
      - name: Build
        run: pnpm build

  # ─────────────────────────── Migrations (main only) ──────────────────────
  migrate:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: checks
    environment: production
    env:
      DIRECT_URL: ${{ secrets.NEON_STAGING_DIRECT_URL }}   # run DDL against staging branch
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10, run_install: false }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Apply migrations (staging)
        run: pnpm prisma migrate deploy
      - name: Generate client
        run: pnpm prisma generate
      - name: Seed staging (idempotent)
        run: pnpm prisma db seed

  # ─────────────────────────── Playwright E2E (sharded) ────────────────────
  e2e:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: [checks, migrate]
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3]                     # 3 shards — scale with test count
        shardTotal: [3]
    env:
      PLAYWRIGHT_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
      E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
      E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10, run_install: false }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - name: Run Playwright (shard ${{ matrix.shardIndex }}/${{ matrix.shardTotal }})
        run: pnpm exec playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-shard-${{ matrix.shardIndex }}
          path: playwright-report/
          retention-days: 7

  # ─────────────────────────── Deploy (main only) ──────────────────────────
  deploy:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    needs: [checks, migrate, e2e]
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel (preview of main)
        run: |
          npx vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
          npx vercel build --yes --token=${{ secrets.VERCEL_TOKEN }}
          npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }} \
            --yes --meta=commitSha=${{ github.sha }} \
            | tee /tmp/vercel-url.txt
      - name: Promote to production
        run: |
          npx vercel promote --yes --token=${{ secrets.VERCEL_TOKEN }} \
            "$(tail -1 /tmp/vercel-url.txt)"
      - name: Sentry release (map commits to errors)
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: thumbintel
          SENTRY_PROJECT: thumbintel-nextjs
        run: pnpm exec sentry-cli releases set-commits --auto
      - name: Smoke check production health
        run: |
          curl -fsS https://thumbintel.com/api/health \
            | grep '"status":"ok"'
```

> **Why `vercel pull` + `vercel build` + `vercel deploy --prebuilt`:** this builds once in CI and
> uploads the prebuilt output, making deploy fast and reproducible. Alternative (simpler): the
> official `amondnet/vercel-action` — but the explicit CLI keeps one build artifact for both
> deploy and Sentry source-map upload. The **Production domain is only reached through
> `vercel promote`**, which re-aliases the already-built deployment without a second build.

### 6.3 Secrets in GitHub Actions

Add to repo Settings → Secrets and variables → Actions (`Dependabot`/`Pull requests` scoping
is fine for the read-only ones):

| Secret | Used by | Note |
|---|---|---|
| `NEON_TEST_POOLED_URL` | checks | dedicated CI/test Neon branch (thin clone) |
| `NEON_TEST_DIRECT_URL` | checks | same branch, direct host |
| `NEON_STAGING_DIRECT_URL` | migrate | staging branch direct URL — migrations run against **staging**, then E2E, then production is promoted after prod migrations (see 6.4) |
| `NEON_PROD_DIRECT_URL` | manual/deploy (production) | production branch direct URL, used only by the promotion job |
| `TEST_AUTH_SECRET` | checks | throwaway value |
| `MOCK_ANTHROPIC_KEY` | checks | mock key for MSW (see `MSW_ANTHROPIC_MOCK=1`) |
| `STAGING_BASE_URL` | e2e | `https://staging.thumbintel.com` |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | e2e | Playwright login fixture |
| `VERCEL_TOKEN` | deploy | Vercel access token (scope: project `thumbintel`) |
| `SENTRY_AUTH_TOKEN` | deploy | Sentry token with `project:write` |

**Never** put `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, or `R2_*` secrets in Actions unless a
job truly needs them (AI + Stripe + R2 stay mocked in CI). Real secrets live in Vercel env vars.

### 6.4 How migrations are run safely

1. **`prisma migrate deploy`** (not `migrate dev`) is the only migrate command allowed in CI —
   it applies pending migrations in order, never resets data, and is idempotent.
2. **Migrations target the staging branch first** (`NEON_STAGING_DIRECT_URL`). Production gets
   the same migrations via the promotion job (a `deploy` job with `environment: production`
   referencing `NEON_PROD_DIRECT_URL` — or a separate production-only workflow). Never point CI
   at the production branch directly on every push.
3. **Drift guard**: the `checks` job runs `pnpm prisma migrate status`; on `main` a mismatch
   **fails the build** before any deploy. Manual recovery in sec. 9.1.
4. **DDL is schema-first**: new columns are nullable/have defaults, destructive changes
   (`drop`, `rename`) are two-step (add → backfill → drop) so old code keeps working during
   rollout (shared context sec. 7/16 data model — additive-only migrations in the release window).
5. **Concurrency**: the `migrate` job depends on `checks` and runs once (no matrix). Use a
   GitHub **environment protection** on `production` so the promotion job requires approval.

### 6.5 Playwright sharding

- Split by `--shard=i/n` (matrix in 6.2) so a growing suite stays ~5 min.
- Each shard writes to `playwright-report/`; artifacts are uploaded per-shard on failure.
- Keep tests **self-contained**: E2E runs against staging with seeded data and **no real AI**
  (the staging env uses the same mock/MSW key as CI so vision calls never hit Anthropic).

---

## 7. Environments

### 7.1 Strategy

| Env | Created by | Vercel branch | DB | AI | Stripe | Secrets |
|---|---|---|---|---|---|---|
| `preview` | every PR / push to branch | branch URL `*.thumbintel.app` | Neon branch `preview-<pr>` (thin-cloned, seeded) | mocked | **test** mode | development-tier |
| `staging` | merge to `main` | `staging.thumbintel.com` | Neon branch `staging` (thin-cloned, seeded) | mocked | test mode | preview-tier |
| `production` | promote (manual or CI) | `thumbintel.com` | Neon `main` branch | real Claude | **live** mode | production-tier |

### 7.2 Vercel env-per-branch

Vercel assigns `production`/`preview`/`development` env scopes:

- **Production** scope → all env vars for `thumbintel.com`.
- **Preview** scope → shared env vars for every preview deployment (`*.thumbintel.app`).
- **Development** scope → `vercel dev` locally.

Preview DB isolation: the deploy step for previews can create the Neon branch via the Neon API
(`/projects/{project}/branches`), or keep a single shared `thumbintel-preview` branch with
**test-only data** (recommended for v1). If you isolate per-PR, add a cleanup step (branch
deletion on PR close) to avoid branch sprawl.

### 7.3 Seed data for preview/staging

Seed (idempotent) provides: pricing tiers, scoring weights (shared context sec. 8), a demo
creator persona, sample analysis records. `pnpm prisma db seed` runs in the migrate job; the
seed script checks for existing rows (`upsert`) so re-running never duplicates.

### 7.4 Promotion flow (locked)

```text
PR → preview (isolated) → merge → staging (migrate + E2E on staging) → promote → production
```

Every merge to `main` gates on: checks green → migrations applied to staging → sharded E2E green
→ Vercel preview deploy → **`vercel promote`** aliases the built deployment to `thumbintel.com`.
Rollbacks are the inverse (sec. 8.7).

---

## 8. Operations

### 8.1 Backups (Neon PITR)

- Neon provides **Point-in-Time Recovery**: production is PITR-enabled by default on the paid
  plan (7-day history on the Pro tier; extendable). Recovery is branch-based: *Branch → Restore
  to PITR → pick timestamp → new branch*.
- The migration+release cadence means the DB is also the source of truth for **all** mutable
  state; R2 objects are immutable by key (UUID), so no object backup is required beyond R2's
  versioning (enable **R2 object versioning** on `thumbintel-prod` for accidental overwrites).
- Scheduled: **`pg_dump` nightly to R2** (`backups/` prefix) for cold archival:

  ```bash
  # scripts/backup.mjs — uses DIRECT_URL, writes to R2 bucket prefix backups/
  pg_dump "$DIRECT_URL" --format=custom -f /tmp/thumbintel.dump
  # (uploaded via the S3 client to R2 key: backups/thumbintel-$(date +%F).dump)
  ```

  Retention: 30 dumps. Restore drill: run quarterly against a scratch Neon branch.

### 8.2 Monitoring & alerting

| Signal | Tool | Alert |
|---|---|---|
| 5xx / exceptions | Sentry | on every new issue ≥ 1; error rate > 1% over 5 min |
| Uptime | Vercel Monitoring (or external ping) | `/api/health` failing 3× consecutive, 1-min interval |
| Latency p95 | Vercel Monitoring | p95 > 1.5 s on `/api/*` |
| AI cost | Anthropic usage dashboard + Inngest metrics | spend > 80% of monthly AI budget (sec. 8.4) |
| Job failures | Inngest dashboard + Sentry | `failed`/`partial` stage transitions |
| DB | Neon dashboard | CPU > 70% sustained, active connections > 60% of limit |
| Egress | R2 usage | none expected (egress is $0) — alert only on storage growth > 20%/mo |

### 8.3 Log access

- **Vercel**: Project → Logs (runtime logs for both edge and Node functions). Set **Log Drains**
  (Settings → Logs) to stream JSON to a sink (Axiom/DataDog/S3) for >30-day retention.
- **Inngest**: dashboard per-function run logs (step outputs, retries, payloads).
- **Neon**: connection logs + query statistics in the branch page.
- **Sentry**: breadcrumbs attach to error events; structured `console.info` in critical paths.

### 8.4 Cost controls

- **Anthropic**: set a **spend limit** in the Anthropic console (hard stop), configure the
  **model tier** (Sonnet-tier, `ANTHROPIC_MODEL`), and add a per-request token cap
  (`ANTHROPIC_MAX_TOKENS_PER_ANALYSIS=4096`). Guard with Upstash rate limiting on `/api/analyze`
  (sec. 5.10). Estimate every AI-dependent UI cost — AI analysis results are labeled
  `~` (est.) with confidence chips (shared context sec. 3).
- **Inngest**: per-environment **concurrency limit** (e.g. 10 concurrent analysis jobs for Pro
  tier, 2 for Free) so a traffic spike doesn't multiply AI spend; use `step.sleep` for backoff
  rather than retry storms. Free-plan users queue with `stage: pending`.
- **R2**: egress $0 by design; storage only — set lifecycle rules to expire `uploads/` + `exports/`
  older than 30 days (aligns with the `cleanup-expired-assets` cron).
- **Neon**: autoscale to `0.25` compute baseline; autosleep off only for production branch.
- **Vercel**: functions on Pro plan; use ISR/caching on read paths to cut invocations.

### 8.5 Scaling notes

- **Stateless app**: everything user-visible is either in Neon or R2; serverless functions scale
  horizontally with zero config. The only shared state is the DB and the (optional) rate-limit
  cache.
- **Neon**: enable autoscaling (0.25 → 1 vCPU) for the production branch; pooled URL keeps
  connection count flat under load. If connections still peak, raise `connection_limit` and
  re-check `max_connections` on the branch.
- **R2**: no capacity planning — Cloudflare scales it; keep presigned upload max size at
  **10 MB** (thumbnail images) to bound request size.
- **Inngest**: raise the per-env concurrency when Pro-tier volume grows; monitor queue depth.

### 8.6 Rollback procedure (runbook)

| Scenario | Steps | ETA |
|---|---|---|
| Bad deploy (app) | Vercel → Deployments → previous deployment → **Promote to Production**. No DB change involved → instant. | < 2 min |
| Bad migration (schema) | Stop traffic to production domain (Vercel → Deployment → promote the pre-migration deploy), then restore DB via Neon PITR to just before the migration, then point the pre-migration code at the restored branch. Do **not** run a `migrate down` on a live branch. | 10–20 min |
| Data corruption (rows) | Neon PITR restore to last-known-good timestamp → branch → verify → promote branch to be the new main. | 10–30 min |
| AI outage (Anthropic down) | Inngest retries with exponential backoff (budget: 5 attempts); Tesseract fallback engages per analysis. Feature-flag `AI_PRIORITY=claude|tesseract` in env. | automatic |

Rollback rule: **the previous deployment is always promotable** because deploys are immutable
and DB migrations are additive within a release window (sec. 6.4).

---

## 9. Troubleshooting

| # | Symptom | Likely cause | Fix |
|---|---|---|---|
| 9.1 | `prisma migrate status` shows pending/missing; `migrate deploy` fails | Migration drift (a migration was edited after apply, or a `directUrl` mismatch) | Never hand-edit applied migrations. Run `pnpm prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource "$DIRECT_URL" --shadow-database-url ...` to see drift, then `prisma migrate resolve --applied <name>` for an already-applied migration CI doesn't know about, or `--rolled-back` for a partial one. Fix the schema, not the history. |
| 9.2 | Users silently logged out; JWT errors in Auth.js | `AUTH_SECRET` differs between environments (or changed after deploy) | Regenerate a single secret, set it **identically** in every env + local `.env`, redeploy all. Rotations must be deliberate (sec. 4 `AUTH_SECRET`). |
| 9.3 | Browser upload to R2 fails with CORS `403`/opaque | Bucket CORS `AllowedOrigins` missing the requesting origin (e.g. staging domain, or a new preview URL) | Add the exact origin to R2 bucket CORS (sec. 5.2.3). `AllowedOrigins` is an exact-match list — `https://*.thumbintel.app` covers previews. Retest with `curl -H "Origin: https://thumbintel.com" -H "Access-Control-Request-Method: PUT"` … and verify `ExposeHeaders: ETag`. |
| 9.4 | Inngest functions never run; dashboard shows "Not found" or 401 | `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` mismatch with the environment, or `INNGEST_BASE_URL` wrong region | Check the pair per environment (sec. 5.3). Confirm `/api/inngest` is deployed and returns `200` on GET (Inngest "cloud check"). Verify region: US keys ⇒ `https://api.inngest.com`, EU ⇒ `https://api.eu.inngest.com`. |
| 9.5 | Stripe webhook returns 400 `stripe_signature_invalid` | `STRIPE_WEBHOOK_SECRET` wrong/stale, or events sent to the wrong URL | Confirm the webhook endpoint URL matches the deployed env; copy the current `whsec_...`; verify with `stripe listen` locally. Also check the event list matches sec. 5.5. |
| 9.6 | Vercel function timeout on analysis/export | Cold start + AI latency exceed default limits | In route handlers add `export const maxDuration = 60;` (Pro). Reduce AI timeouts, set client-side optimistic UI with `stage: pending → queued → running → completed|failed|partial` (shared context sec. 12) so the UI never waits synchronously; return the job id and poll `/api/analyses/:id`. |
| 9.7 | Tesseract worker fails in production with CORS/network error | Worker/core/lang files fetched from CDN blocked by your CSP/origin | Bundle the worker (`tesseract.js` `workerPath`/`corePath`/`langPath` pointing at files under `/public/ocr/` — see sec. 5.9.4) or host them on the R2 public domain and set `workerPath` accordingly. `TESSERACT_DEV_URL` only for local testing. |
| 9.8 | Neon "too many connections" / `connection refused` | Serverless functions opening one connection each against the **direct** endpoint, or pooler limit reached | Runtime must use the **pooled** URL (`-pooler`) with `connection_limit=10` (sec. 5.1.3). Check Neon dashboard → branch → active connections; raise `connection_limit` or the branch limit, never fall back to DIRECT for app traffic. |
| 9.9 | Emails not delivered | Sender domain unverified / SPF-DKIM missing | Resend → Domains → status **Verified**; check DNS records; test with `EMAIL_FROM` on the verified domain. |
| 9.10 | CI `pnpm install` fails on build scripts | pnpm 10 blocks `postinstall` (prisma, sharp) | Run `pnpm approve-builds` locally and commit the approved list (or set `pnpm.onlyBuiltDependencies` in `package.json`). CI uses `--frozen-lockfile` so the approved list must be committed. |
| 9.11 | Preview can't reach DB / wrong data | Preview pointed at prod branch | Verify per-env env vars (sec. 7.2); previews should target `thumbintel-preview` bucket + preview DB branch. |

---

## 10. Deploy checklist (Definition of Done)

Before shipping any environment change, verify:

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:api`, `pnpm build` all green locally
- [ ] `pnpm prisma migrate status` clean; migrations committed and additive
- [ ] `.env.example` kept in sync (add the new variable with a `(client)`/server-only comment)
- [ ] R2 CORS includes the new domain; `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` correct per env
- [ ] Inngest env + keys match the deployment env; functions registered in dashboard
- [ ] Stripe webhook endpoint live for the domain; secret in Vercel env
- [ ] Resend sender verified; `EMAIL_FROM` set
- [ ] Sentry release tag set on deploy; DSN per env
- [ ] `/api/health` returns `{ status: "ok", db: "up", env: "<env>" }`
- [ ] Secrets never committed; only `NEXT_PUBLIC_*` client-visible
- [ ] Playwright shard suite green on staging before promote

---

*End of `14_DEPLOYMENT.md`. Any change to this document requires a platform review — it is the
operational contract for ThumbIntel.*
