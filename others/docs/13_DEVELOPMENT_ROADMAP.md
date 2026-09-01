# ThumbIntel — Development Roadmap

> **Doc id:** `13_DEVELOPMENT_ROADMAP.md`
> **Audience:** engineering leads, senior engineers, and AI coding agents who will scaffold/build ThumbIntel.
> **Contract level:** This file is the *sequencing and build spec* for the whole product. It is not a substitute for `00_SHARED_CONTEXT.md` (single source of truth), `01_PRD.md` (feature requirements / FR numbers), `05_FILE_STRUCTURE.md` (exact tree), or `04_ARCHITECTURE.md` (system design). Where those locked a decision, this document **extends** it with concrete build detail and **never contradicts** it.
>
> **⚠️ AUTHORED-CONTEXT CAVEAT:** At authoring time the source-of-truth docs (`00_SHARED_CONTEXT.md`, `01_PRD.md`, `04_ARCHITECTURE.md`, `05_FILE_STRUCTURE.md`, `08_AI_PIPELINE.md`, `09_EDITOR.md`) were **not present on disk** (`docs/` was empty). This roadmap was therefore written from the locked decisions embedded in the product brief (the frozen stack, product principles, MVP tiers, section-12 conventions) plus a canonical reconstruction of the repo skeleton, data model, and FR taxonomy. **Check the sibling docs when they land** and reconcile: (a) FR numbering and (b) exact file paths may need renaming to match `05_FILE_STRUCTURE.md`. Nothing here is a contradiction of shared context — it is an extension that will need light cosmetic alignment.

---

## 0. Conventions used throughout (locked in shared context §12)

These are applied to **every** schema, signature, and acceptance criterion in this document.

### 0.1 Stage status enum (single source of truth for pipeline/export state)

```ts
export type StageStatus =
  | "pending"   // enqueued, not started
  | "queued"    // accepted by the worker, waiting on a slot
  | "running"   // in progress, progress 0-100
  | "completed" // finished, produced a stage result
  | "failed"    // hard failure, no retry left
  | "partial"   // finished but degraded (e.g. OCR read 3 of 7 texts)
```

The scoring engine and the UI layer must treat `partial` as a **non-fatal success** that lowers confidence chips but never blocks the user from recreating a thumbnail.

### 0.2 Error taxonomy (canonical error `code` strings)

```ts
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PLAN_LIMIT_EXCEEDED"   // paywall gate
  | "CREDIT_INSUFFICIENT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"        // Claude / Tesseract returned garbage
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_QUOTA_EXCEEDED"
  | "STORAGE_ERROR"         // R2 put/get failed
  | "EXPORT_FAILED"
  | "CONFLICT_EDITOR_STATE" // stale revision on save
  | "INTERNAL_ERROR";
```

### 0.3 Error envelope (every HTTP 4xx/5xx body and every thrown server error)

```ts
export interface ApiErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;      // human-readable, safe to show
    details?: unknown;    // zod issues, provider ref, stage id — never secrets
  };
}
```

### 0.4 Estimation & confidence labeling

- Any metric that is a model estimate is suffixed with `(est.)` or `~`.
- Confidence values are always accompanied by a confidence chip in the UI: `"~92% confidence"`, `"(est. ~65% match)"`.
- The UI must never render a raw probability as a fact. A `baseModel` label accompanies every estimated field.
- Example of a factual vs estimated distinction: bounding-box coordinates from YOLO are `(est. 0.87)`, OCR text is `(est. ~91% char acc)`.

### 0.5 Serialization rule

The editor document (its `document` JSON column) **must** be fully `JSON.stringify`-serializable, versioned, and rebuilt idempotently from `{ projectId, schemaVersion, doc }`. No function references, no `Map`/`Date` leakage into the persisted payload.

---

## 1. Phase map, dependency graph, and critical path

### 1.1 Phase list

| # | Phase | Gate depends on | Ships a real user value |
|---|-------|------------------|--------------------------|
| 0 | Foundations | — (bootstrap) | Internal only; no user value |
| 1 | MVP | 0 | Upload → analyze → score → recreate → export |
| 2 | AI Analysis pipeline | 1 | The actual intelligence (OCR/typography/visual/objects) |
| 3 | Recreation Editor | 2 | Canvas editing + real exports |
| 4 | Projects & Dashboard | 1 | Persistence, list/hub, revisions, stats |
| 5 | SEO & Marketing | 0, 1 | Public inbound surface |
| 6 | Billing | 1 | Revenue + plan gating |
| 7 | Advanced AI | 2, 3 | Differentiation + API |

> **Ordering rule:** 0 → 1 is a strict hard dependency. 2, 3, and 4 are *concurrent* workstreams that all depend on 1 and cannot depend on each other at the API layer (3 depends on 2's `recreatePayload`; 4 depends on 1's persistence). 5 can start in parallel with 2 because its content pages are static. 6 depends only on 1's auth + project primitives. 7 is the only genuinely gated-by-"done" phase.

### 1.2 Dependency graph (mermaid)

```mermaid
flowchart TD
    P0[Phase 0 Foundations] --> P1[Phase 1 MVP]
    P1 --> P2[Phase 2 AI Analysis]
    P1 --> P4[Phase 4 Projects & Dashboard]
    P1 --> P6[Phase 6 Billing]
    P0 --> P5[Phase 5 SEO & Marketing]
    P5 --> P7[Phase 7 Advanced AI]
    P2 --> P3[Phase 3 Recreation Editor]
    P2 --> P7
    P3 --> P7
    P4 --> P7

    subgraph concurrent[Can run in parallel after Phase 1+0 land]
        P2
        P4
        P5
        P6
    end

    style P0 fill:#f5f5f5,stroke:#666
    style P3 fill:#fff3cd,stroke:#b8860b
    style P7 fill:#d4edda,stroke:#28a745
```

### 1.3 Critical path

```
Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ (Phase 7 partial)
```

The **critical path to a paying user** is `0 → 1 → 2 → 3`, ending with a user who can upload, analyze, and **export a recreated thumbnail**. Phase 7's "variations" tier is the longest-tail differentiator and is explicitly de-prioritized until `0→1→2→3` are demonstrably working with real models.

---

## 2. Phase 0 — Foundations

### 2.1 Goals

- Repo boots on `pnpm`; `next dev` serves a page; strict TS passes `next build`.
- Lint/format/typecheck/test run in CI in < 5 min.
- Prisma connects to a real Neon Postgres and can migrate; the app reads a seeded row without error.
- Env vars are documented and validated at boot; absent secrets fail *early and loudly* (not at first request).
- One canonical API client + error envelope path exists and is used by the first real page.
- A basic landing shell renders (marketing placeholder) so there is a domain for OG/SEO work later.
- The design-token layer + `shadcn/ui` theme is wired so every later phase builds on the same variables.

### 2.2 Feature list

| Feature | PRD FR | Notes |
|---------|--------|-------|
| Scaffold Next.js 15 App Router + TS strict | FR-00 | `create-next-app` |
| pnpm package set + `pnpm` scripts | FR-00 | single repo, not a monorepo workspace |
| ESLint flat-config + Prettier | FR-00 | enforce TS strict |
| Path aliases (`@/*`) | FR-00 | `tsconfig` + `jsconfig`/Next |
| GitHub Actions CI (lint+typecheck+test) | FR-00 | 3 job matrix |
| Design tokens + `shadcn/ui` (dark/light theme) | FR-00 | Tailwind v4 CSS variables |
| Prisma + Neon + first migration | FR-00 | Postgres, `prisma migrate dev` |
| `env.ts` boot validation + `.env.example` | FR-00 | Zod-validated, fails fast |
| API error envelope + typed fetch client | FR-00 | `ApiError`/`Envelope` |
| Request logging + Sentry init | FR-00 | Pino + Sentry |
| Landing shell (marketing) | FR-00 | `app/(marketing)/page.tsx` |

### 2.3 Files created / edited (canonical per §15 skeleton; align to `05_FILE_STRUCTURE.md` when it lands)

```
package.json                    pnpm
pnpm-lock.yaml
tsconfig.json                   "strict": true, baseUrl, paths @/*
next.config.ts                   images remotePatterns for r2 + google fonts
eslint.config.mjs                flat config
.prettierrc
.github/workflows/ci.yml         lint / typecheck / test
src/env.ts                       zod-validated process.env proxy  (re-exported as `env`)
.env.example
.env.local                       (git-ignored)
tailwind.config.ts / globals.css  CSS variables + shadcn tokens
components.json                  shadcn config
src/app/layout.tsx
src/app/globals.css              design tokens
src/app/(marketing)/layout.tsx
src/app/(marketing)/page.tsx     landing shell
src/lib/http/client.ts           typed fetch
src/lib/http/envelope.ts         unwrap {error} envelope
src/lib/http/errors.ts           ErrorCode map + ApiError class
src/lib/logger.ts                pino child-logger
src/lib/prisma.ts                singleton PrismaClient
src/instrumentation.ts           Sentry init
prisma/schema.prisma             initial schema (users + empty baseline)
prisma/seed.ts
vitest.config.ts
src/test/setup.ts                happy-dom + MSW server
```

### 2.4 Key functions / components / routes / tables / services

**env validation — `src/env.ts`**
```ts
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string(),          // Neon pooled
  DIRECT_URL: z.string(),            // Neon direct for migrations
  AUTH_SECRET: z.string().min(16),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string(),
  R2_PUBLIC_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),
  INNGEST_EVENT_KEY: z.string(),
  INNGEST_SIGNING_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
  POSTHOG_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse(process.env);
```

**API envelope — `src/lib/http/envelope.ts`**
```ts
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}
export function fail(
  code: ErrorCode,
  message: string,
  details?: unknown,
  init?: ResponseInit,
): Response {
  return Response.json(
    { error: { code, message, details } },
    { status: statusFor(code), ...init },
  );
}
```

**Prisma singleton — `src/lib/prisma.ts`**
```ts
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**CI — `.github/workflows/ci.yml` (3 jobs)**
```yaml
jobs:
  lint: { runs-on: ubuntu-latest, steps: [checkout, pnpm/action-setup, node, pnpm i, pnpm lint] }
  typecheck: { ... pnpm typecheck }
  test: { ... pnpm test }
```

### 2.5 Dependencies

- **External:** `next@15`, `react@19`, `typescript@^5`, `tailwindcss@^4`, `@prisma/client` + `prisma`, `zod`, `pino`, `@sentry/nextjs`, `shadcn/ui` (via `npx shadcn init`), `vitest`, `@testing-library/react`, `playwright`.
- **Intra-repo:** none — this is the root.

### 2.6 Acceptance criteria (testable)

1. `pnpm dev` builds and `http://localhost:3000` renders the marketing shell without console errors.
2. `pnpm lint`, `pnpm typecheck` (with `"strict": true`) and `pnpm test` all pass locally *and* in CI with zero warnings treated as errors.
3. `prisma migrate dev --name init` applies cleanly against a fresh Neon DB; `pnpm prisma:seed` inserts a user row readable by `prisma.user.findFirst`.
4. `env.ts` throws a descriptive error naming the missing var if `DATABASE_URL`/`AUTH_SECRET` are absent (test by unsetting them).
5. A throwaway `GET /api/health` returns `{ data: { ok: true } }`; a thrown `fail("INTERNAL_ERROR", ...)` renders the `{ error: {...} }` shape.
6. `tsc` rejects a deliberate `any` (proves strict mode).
7. Theme toggle persists between reloads via `next-themes` + token variables.

### 2.7 Ordering within phase

1. Scaffold + pkg + tsconfig aliases → 2. ESLint/Prettier → 3. globals.css + shadcn init + layout → 4. env validation + `.env.example` → 5. Prisma schema + Neon + migrate + seed → 6. http client + envelope + health route → 7. logger + Sentry → 8. CI. If CI is red, nothing else ships.

---

## 3. Phase 1 — MVP

### 3.1 Goals

- A logged-in user can **upload a thumbnail**, get a **score**, and **recreate** it into a canvas editor, then **export a PNG/JPG**.
- Before/after compare, a minimal projects list, and a dashboard — the "smallest publicly shippable product" per shared context §4.
- Must-have from §4: **upload, analysis pipeline (stubbed in MVP → real in Phase 2), score, recreate, editor core, export, before/after, basic projects, auth, dashboard, landing.**
- In MVP the analysis is **deterministic-only + dummy providers** so the whole loop is testable without burning Claude credits. Phase 2 swaps in the real provider abstraction behind the same interface.

### 3.2 Feature list

| Feature | PRD FR | Details |
|---------|--------|---------|
| Email + Google OAuth (Auth.js v5, JWT) | FR-A1..A3 | `@auth/core` credentials + Google provider |
| Session middleware + protected routes | FR-A4 | `middleware.ts` mallow `/app/**`; audience `authenticated` |
| Upload via Cloudflare R2 presigned URL | FR-U1 | `POST /api/uploads/presign` → PUT directly to R2 |
| Thumbnail validation (size/type/dimensions) | FR-U2 | Zod `safeParse` + magic-byte sniff, reject GIF/SVG |
| Create Project from upload | FR-P1 | persist dimensions + R2 key |
| Analysis orchestrator (stub providers) | FR-AN1 | Inngest job, 5 stages, stage status rows |
| Score (deterministic min at MVP) | FR-SC1..SC5 | 0-100 + breakdown |
| Recreate → editor document | FR-R1 | generate `document` JSON from result |
| Editor core shell (Phase 3 fleshes tools) | FR-E1..E3 | canvas pan/zoom + text layer |
| Export PNG/JPG | FR-X1..X3 | Konva `stage.toDataURL` → R2 → presigned link |
| Before/after compare | FR-A5 | toggle original vs recreated |
| Projects list / basic dashboard | FR-P2..P4 | grid + summary cards |
| Landing page (real, not placeholder) | FR-M1 | value prop + pricing teaser |

### 3.3 Files created / edited

```
src/app/(auth)/login/page.tsx
src/app/(app)/layout.tsx             protected shell + sidebar
src/app/(app)/dashboard/page.tsx
src/app/(app)/projects/page.tsx
src/app/(app)/projects/[id]/page.tsx
src/app/(app)/projects/[id]/editor/page.tsx
src/app/api/auth/[...nextauth]/route.ts
src/app/api/uploads/presign/route.ts
src/app/api/projects/route.ts
src/app/api/projects/[id]/route.ts
src/app/api/projects/[id]/analyze/route.ts
src/app/api/projects/[id]/stages/route.ts   (SSE stream)
src/app/api/projects/[id]/export/route.ts
src/app/api/scoring/route.ts
src/lib/auth.ts                       NextAuth config
src/middleware.ts
src/validators/project.ts             zod
src/validators/upload.ts
src/lib/r2.ts                         presign + put + getObject
src/server/jobs/analyze.job.ts        Inngest
src/server/analysis/orchestrator.ts   stage runner
src/server/analysis/stages/score.ts
src/server/analysis/stages/ocr.ts     (MVP: stub)
src/server/analysis/stages/objects.ts (MVP: stub)
src/server/analysis/stages/typography.ts (MVP: stub)
src/server/analysis/stages/visual.ts  (MVP: stub)
src/server/scoring/engine.ts          deterministic
src/components/upload/dropzone.tsx
src/components/upload/upload-flow.tsx
src/components/analysis/analysis-progress.tsx
src/components/score/score-gauge.tsx
src/components/score/score-breakdown.tsx
src/components/compare/before-after.tsx
src/components/editor/editor-canvas.tsx
src/components/editor/editor-toolbar.tsx
src/components/export/export-dialog.tsx
```

### 3.4 API routes (canonical signatures + Zod)

**`POST /api/uploads/presign`** — returns a presigned PUT for R2.
```ts
const body = UploadPresignSchema.parse(await req.json());
// { filename, contentType, width, height, fileSize }
// -> { uploadUrl, headers, key, publicUrl, expiresIn }
// Zod: filename .regex(/^[a-zA-Z0-9._-]{1,160}\.(png|jpe?g|webp)$/i), contentType in ["image/png","image/jpeg","image/webp"], fileSize .max(8_000_000), width/height .int().positive()
```

**`POST /api/projects`** — create project from an uploaded R2 key.
```ts
// body: { title, thumbnailKey, width, height, contentType }
// -> { data: { project: ProjectView } }
// validates ownership: thumbnailKey must be a key we minted (prefix `uploads/{userId}/`)
```

**`POST /api/projects/[id]/analyze`** — kick off the Inngest analysis job, deduct a credit.
```ts
// -> 200 { data: { analysisId, steps: AnalysisStageDto[] } } | 402 CREDIT_INSUFFICIENT
// Mutates: creates Analysis + AnalysisStage rows, calls inngest.send({ name: "thumb/analyze", data })
```

**`GET /api/projects/[id]/stages`** — SSE stream of stage status transitions.
```
Content-Type: text/event-stream
event: stage
data: { stage: "ocr", status: "running", progress: 42 }
...
event: done
data: { analysisId, score, overall: "completed" }
```

**`GET /api/projects/[id]`** — full project view incl. analysis result + score breakdown.

**`POST /api/projects/[id]/export`** — render the editor document to bytes and store to R2.
```ts
// body: { format: "png"|"jpeg", scale: 1|2, size: "original"|"1280x720"|"1920x1080" }
// -> { data: { exportId } } | 402 CREDIT_INSUFFICIENT
```

### 3.5 DB tables (Prisma) added in MVP

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  emailVerified DateTime?
  accounts      Account[]
  projects      Project[]
  credits       CreditLedger[]
  quotas        Quota?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Project {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title         String
  slug          String   @unique
  status        StageStatus @default("pending")
  width         Int
  height        Int
  thumbnailKey  String
  thumbnailUrl  String
  isFavorite    Boolean  @default(false)
  isArchived    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([userId, updatedAt])
}

model Analysis {
  id            String   @id @default(cuid())
  projectId     String   @unique
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  engine        String   @default("claude-sonnet-4-5")
  provider      String                    // "claude" | "tesseract" | "deterministic"
  status        StageStatus
  score         Int?
  breakdown     Json?
  creditsSpent  Int      @default(1)
  ocr           Json?    // OcrResult
  objects       Json?    // ObjectResult
  typography    Json?    // TypographyResult
  visual        Json?    // VisualResult
  document      Json?    // recreatePayload (editor document)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AnalysisStage {
  id          String     @id @default(cuid())
  analysisId  String
  analysis    Analysis   @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  name        StageName  // ocr|objects|typography|visual|scoring
  status      StageStatus
  progress    Int        @default(0)
  message     String?
  startedAt   DateTime?
  finishedAt  DateTime?
  @@index([analysisId])
}

model CreditLedger {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  type         CreditType // purchase|grant|spend_analysis|spend_export|refund|adjustment
  amount       Int        // signed
  balanceAfter Int
  note         String?
  metadata     Json?
  createdAt    DateTime   @default(now())
  @@index([userId, createdAt])
}

model Quota {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(...)
  tier                Ticker   @default("free")
  creditsRemaining    Int      @default(5)
  creditsTotal        Int      @default(5)
  periodStartsAt      DateTime @default(now())
  periodEndsAt        DateTime?
  analysesUsed        Int      @default(0)
  exportsUsed         Int      @default(0)
}
```

**Stage names / credit types / tier enums**
```sql
enum StageName { ocr objects typography visual scoring }
enum CreditType { purchase grant spend_analysis spend_export refund adjustment }
enum Ticker { free pro studio team }
```

### 3.6 Key services

- **`src/server/r2.ts`** — `presignUpload`, `getSignedUrl`, `putFromBuffer`, `delete`. Uses `@aws-sdk/client-s3` with the Cloudflare endpoint. All server-only; never expose keys.
- **`src/server/analysis/orchestrator.ts`** — iterates stages in order `[ocr, objects, typography, visual, scoring]`, updates `AnalysisStage` rows, emits SSE, deducts credits in a transaction, and marks `partial` on degraded results.
- **`src/server/scoring/engine.ts`** — deterministic, pure, unit-testable. Accepts stage results, returns `{ score, breakdown, confidence }`. Formula below.

**Deterministic score v1 (MVP, sec §8).** Weighted sum, clamped 0-100:
```
contentReach = textBBoxCoverage          # % of texts fully inside safe area
contrast    = meanLuminanceContrast      # WCAG-ish contrast between text & bg
legibility  = ocrConfidence × fontSizeRatio
hierarchy   = count(maxSize / medianSize)
balance     = spatial entropy of object bboxes
score = 100 × clamp(0.35·contentReach + 0.25·contrast + 0.20·legibility + 0.10·hierarchy + 0.10·balance)
```

### 3.7 Validation rules

- Uploads: `max 8 MB`, `width ≤ 5120`, `height ≤ 2880`, MIME in `image/png|jpeg|webp` (magic-byte checked, not just header), reject animated GIF & SVG.
- Analysis: one concurrent analysis per project (409 `CONFLICT_EDITOR_STATE`-style guard); dedupe by content hash to avoid double-charging identical images.
- Export: format `png|jpeg`, scale `1|2`, size enum. Editing may be disallowed for `free` tier in MVP? No — **do not gate in MVP**; gate in Phase 6. (See §8.)

### 3.8 Dependencies

- **External:** `next-auth@5` (`@auth/core`), `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `inngest`, `konva`+`react-konva` (basic), `@prisma/client`, `zod`, `nanoid`.
- **Intra-repo:** Phase 0 foundations (env, http, prisma, shadcn).

### 3.9 Acceptance criteria (end-to-end, testable)

1. Unauthenticated visit to `/app/**` redirects to `/login` (Playwright asserts).
2. A user uploads a 1280×720 PNG; it lands in R2 and a `Project` row is created with `status=pending`.
3. `POST /api/projects/[id]/analyze` returns stage rows; SSE client observes `running → completed` for all 5 stages in ≤ 60 s with stub providers.
4. The in-memory **deterministic** score returns `0 ≤ score ≤ 100` and a breakdown with the 5 named components; each component is `(est.)`-labeled.
5. `CreateProject` renders an editor canvas (Konva stage) containing the background image at the correct aspect ratio.
6. Export produces a downloadable PNG whose dimensions match the source; `ExportJob` row reaches `completed` with a presigned URL.
7. **Credit is deducted exactly once** per analysis (test with a spy on `CreditLedger`); a second identical upload of the same image does not deduct again (content-hash dedupe).
8. Every listed endpoint returns the `{ error: { code, message, details? } }` envelope on failure (unit tested).
9. Empty state on projects list renders a "Your first thumbnail" CTA; loading state shows a skeleton; error state shows a retry.

### 3.10 Ordering within phase

1. Auth (login/register/protect) → 2. Upload presign + validation → 3. Create project → 4. Stub analysis orchestrator + SSE → 5. Deterministic score → 6. Editor canvas (background only) → 7. Export → 8. Projects list + dashboard → 9. Landing real content → 10. Playwright E2E of the happy path.

> **Phase 1 exit gate:** a fresh user can go `landing → signup → upload → score → open editor → export PNG` without touching any backend by hand.

---

## 4. Phase 2 — AI Analysis Pipeline

### 4.1 Goals

- Replace all stub providers with real ones behind a **provider abstraction** (sec §6): Claude vision (primary) with **Tesseract fallback** for OCR, plus YOLO-class object detection, typography inference, and visual-composition analysis.
- Stream **per-stage** status via SSE; emit `pending → queued → running → completed|failed|partial`.
- **Font detection + alternatives + live preview** (Google Fonts) surfaced in the recreation editor.
- **Credit handling + refunds** on provider failure (never bill a failed run).

### 4.2 Feature list

| Feature | PRD FR | Details |
|---------|--------|---------|
| Provider abstraction + registry | FR-AN2 | `AnalysisProvider` interface, ordered fallback |
| Claude vision OCR | FR-AN3 | text, box, char/word confidence |
| Tesseract OCR fallback | FR-AN4 | on `PROVIDER_TIMEOUT`/`FAILED` |
| Object detection (YOLO / CLIP) | FR-AN5 | normalized bboxes + labels + confidence |
| Typography inference | FR-AN6 | size, weight, case, color, font candidates |
| Visual composition | FR-AN7 | layout, contrast, whitespace, saliency |
| Scoring engine v2 (merged est + deterministic) | FR-SC1..SC5 | combined, confidence-weighted |
| Font detection → alternatives + preview | FR-AN8 | curated catalog + Google Fonts |
| Streaming stage status (SSE) | FR-AN9 | per-stage, resumable on reconnect |
| Credit deduction + refund policy | FR-AN10 | charge at start, refund on `failed` |
| Provider cost/token budgeting | FR-AN11 | cap image size, token budget, retry |
| Cache / dedupe by content hash | FR-AN12 | avoid reprocessing identical thumbs |

### 4.3 Provider abstraction (sec §6)

```ts
export interface AnalysisProvider<Req, Res> {
  id: string;                     // "claude-vision" | "tesseract" | "yolo-nano"
  available(ctx: ProviderCtx): boolean;
  run(input: Req, signal: AbortSignal): Promise<ProviderResult<Res>>;
}
export type ProviderResult<T> =
  | { ok: true; data: T; latencyMs: number; costCredits: number }
  | { ok: false; error: ErrorCode; retryable: boolean };
```

Adapters implement the interface; the orchestrator walks the registry:

```ts
const pipeline: PipelineStage[] = [
  { name: "ocr",      providers: [claudeVision, tesseractOcr] },
  { name: "objects",  providers: [claudeVision, yoloNano] },
  { name: "typography", providers: [claudeVision] },
  { name: "visual",   providers: [claudeVision] },
];
```

For each stage, try primary; if `!ok` and `retryable`, fall to next provider; if none succeed → `failed` or `partial` (OCR `partial` if ≥1 text read).

### 4.4 Files created / edited

```
src/server/providers/types.ts            AnalysisProvider + ProviderResult
src/server/providers/registry.ts
src/server/providers/claude-vision.ts     OCR+objects+typography+visual from one vision call
src/server/providers/tesseract.ts         tesseract.js server piped
src/server/providers/yolo.ts              onnx + sharp preprocess
src/server/analysis/orchestrator.ts       (edited) provider-aware
src/server/analysis/stages/*.ts           (edited) real per-stage wrappers
src/server/analysis/dedupe.ts             content hash
src/server/analysis/refunds.ts            credit reversal
src/server/fonts/catalog.ts               curated font list
src/server/fonts/google.ts                fetch + subset + preview thumbs
src/server/scoring/engine.v2.ts           merged scoring
src/app/api/projects/[id]/stages/route.ts (edited) reconnect + resume
src/app/api/fonts/search/route.ts
src/app/api/projects/[id]/refund/route.ts (internal)
src/components/analysis/analysis-progress.tsx (edited) chips for partial
src/components/typography/font-preview.tsx
src/components/typography/font-picker.tsx
```

### 4.5 API endpoints

**`GET /api/fonts/search?q=impact&style=bold`**
```ts
// -> { data: { fonts: [{ family, category, style, confidence: "~0.84 (est.)", previewUrl }] } }
// Provider: matches detected font traits to curated catalog, then Google Fonts candidates.
```

**SSE resume** — client sends `Last-Event-ID` of last seen stage; server replays current stage states then continues. Guarantees a page refresh never loses the progress.

### 4.6 DB changes

- `Analysis` gains optional `provider` + `engine` columns (already present in MVP schema) and `hash` for dedupe.
- New `FontMatch` optional table (or inflate `typography` JSON). Prefer JSON: `typography { texts: [{ text, font: { family, style, confidence }, size, weight, case, color }], detectedFonts: [...], alternatives: [...] }`.

### 4.7 Dependencies

- **External:** `@anthropic-ai/sdk`, `tesseract.js`, `sharp` (image preconditioning), `onnxruntime-node` (YOLO), `google-fonts` metadata + subsetting, `zod`.
- **Intra-repo:** Phase 1 endpoints + r2 + orchestrator + CreditLedger.

### 4.8 Acceptance criteria

1. `claudeVision.run` returns `{ ok: true, data }` with `texts[]` (each with a bbox + confidence) for a real thumbnail; Tesseract is called only on Claude failure (spy asserts).
2. A `run` on a provider timeout flips the stage to `failed` (optionally `partial` for OCR with ≥1 read) and **never** leaves a `queued`/`running` zombie after the Inngest job errors.
3. On a `failed` analysis the credit is **refunded** — `CreditLedger` shows a `refund` row and `Quota.creditsRemaining` increments back. Test with a forced provider throw.
4. `/api/fonts/search` returns ≥3 ranked candidates with `~confidence` chips and a `previewUrl` (Google Fonts). Filtering by `style=bold` returns bold-capable families only.
5. Re-running analysis on the same image (same content hash) returns the cached result and does **not** deduct a second credit.
6. SSE emits exactly the transition set `pending→queued→running→completed` per stage, and `partial` is emitted only for degraded OCR.
7. Score v2 reflects confidence: a low-confidence OCR text contributes proportionally less to `legibility` than a high-confidence one. Assert a numeric monotonicity test.

### 4.9 Ordering within phase

1. Provider abstraction + registry → 2. Claude vision wrapper (all four outputs in one call) → 3. Tesseract fallback → 4. Orchestrator swaps to providers + refund logic → 5. Scoring v2 → 6. Font catalog + Google preview → 7. SSE reconnect → 8. Dedupe/caching → 9. E2E with a real Claude key.

---

## 5. Phase 3 — Recreation Editor

### 5.1 Goals

- A full canvas editing experience: **select, text, image, shape, background** tools; **layers**; **history** (undo/redo); **compare** (before/after); **export pipeline**; **keyboard shortcuts**; **autosave**.
- Editor state is a **serializable, versioned document** (sec §17) rebuilt from `recreatePayload`.
- Export runs server-side on the exact document, so client and server rendering never diverge.

### 5.2 Feature list

| Feature | PRD FR | Details |
|---------|--------|---------|
| Editor shell (pan/zoom/canvas) | FR-E1 | Konva stage, fit-to-screen |
| Layers panel + z-order | FR-E2 | reorder, lock, hide, opacity |
| Select / move / resize / rotate | FR-E3 | transform handles |
| Text tool (edit inline, font, size, weight, color, stroke, shadow) | FR-E4 | reuse typography result |
| Image tool (insert, crop, mask) | FR-E5 | R2 images |
| Shape tool (rect/ellipse/triangle/line, fill/stroke) | FR-E6 | |
| Background tool (color / image / gradient / blur) | FR-E7 | |
| History (undo/redo, capped 50) | FR-E8 | immutable snapshot stack |
| Compare before/after | FR-E9 | slider |
| Export pipeline (client render, server render) | FR-X1..X5 | PNG/JPG/WebP, sizes, transparency |
| Keyboard shortcuts | FR-E10 | V/M/T/I/R/B, Cmd+Z, Cmd+Shift+Z, Cmd+S, Del |
| Autosave (debounced) | FR-E11 | revision-by-revision |
| Editor document model v1 (sec §17) | FR-E12 | versioned JSON |

### 5.3 Editor document model (sec §17, serializable)

```ts
export interface EditorDocument_v1 {
  schemaVersion: 1;
  projectId: string;
  width: number;
  height: number;
  background: BackgroundNode | null;
  layers: LayerNode[];           // z-order: index 0 = bottom
  selection: string | null;      // layer id (not persisted on autosave)
  viewport?: { x: number; y: number; scale: number }; // client-only, not persisted
}

export type LayerNode =
  | TextLayer
  | ImageLayer
  | ShapeLayer;

export interface TextLayer {
  id: string;                       // nanoid
  kind: "text";
  visible: boolean;
  locked: boolean;
  opacity: number;                  // 0..1
  x: number; y: number;             // canvas px
  width?: number; height?: number;
  rotation: number;                 // deg
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;               // 400|500|700|800|900
  fontStyle: "normal" | "italic";
  fill: string;                     // hex
  stroke?: string; strokeWidth?: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  letterSpacing?: number; lineHeight?: number;
  align: "left" | "center" | "right";
}

export interface ImageLayer {
  id: string; kind: "image";
  visible: boolean; locked: boolean; opacity: number;
  x: number; y: number; width: number; height: number; rotation: number;
  src: string;                       // R2 public url or presigned
  crop?: { x: number; y: number; width: number; height: number };
  borderRadius?: number;
}

export interface ShapeLayer {
  id: string; kind: "shape";
  shape: "rect" | "ellipse" | "triangle" | "line";
  x: number; y: number; width: number; height: number; rotation: number;
  fill: string; fillEnabled: boolean;
  stroke: string; strokeWidth: number;
}

export interface BackgroundNode {
  type: "color" | "image" | "gradient";
  color?: string;                    // when type=color
  image?: { src: string; fit: "cover" | "contain" | "fill" };
  gradient?: { from: string; to: string; angle: number };
}
```

The document is **authoritative** for export. The Konva tree is a *projection* of it, not a separate source of truth.

### 5.4 Files created / edited

```
src/lib/editor/schema.ts            EditorDocument_v1 + zod
src/lib/editor/reducer.ts           pure reducer (state transitions)
src/lib/editor/actions.ts           add/update/delete/reorder layer
src/lib/editor/history.ts          undo/redo snapshot stack
src/lib/editor/selection.ts
src/lib/editor/converters.ts       konva <-> document
src/lib/editor/export.ts           stage -> canvas -> blob
src/components/editor/editor-shell.tsx
src/components/editor/editor-toolbar.tsx
src/components/editor/tools/select-tool.tsx
src/components/editor/tools/text-tool.tsx
src/components/editor/tools/image-tool.tsx
src/components/editor/tools/shape-tool.tsx
src/components/editor/tools/background-tool.tsx
src/components/editor/layers-layer.tsx
src/components/editor/compare-slider.tsx
src/components/editor/keyboard.ts
src/components/editor/autosave.ts
src/app/api/projects/[id]/document/route.ts
src/app/api/projects/[id]/document/versions/route.ts
src/app/api/projects/[id]/render/route.ts   (server-side export)
src/server/export/render.ts
prisma/schema.prisma               EditorDocument + Revision models
```

### 5.5 Prisma additions

```prisma
model EditorDocument {
  id           String   @id @default(cuid())
  projectId    String   @unique
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  schemaVersion Int     @default(1)
  document     Json     // EditorDocument_v1
  revisionCount Int     @default(0)
  autosavedAt  DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model DocumentRevision {
  id          String   @id @default(cuid())
  documentId  String
  document    EditorDocument @relation(...)
  parentId    String?
  label       String          // "autosave" | "manual" | "restore"
  snapshot    Json            // full document
  createdAt   DateTime @default(now())
}
```

### 5.6 API endpoints

**`GET /api/projects/[id]/document`** → `{ data: { document } }`.

**`PUT /api/projects/[id]/document`** — concurrency-guarded save.
```ts
const body = SaveDocumentSchema.parse(await req.json());
// { schemaVersion, document, baseRevisionId }
// If baseRevisionId !== current revision -> 409 CONFLICT_EDITOR_STATE with current revision in details
// On success: bumps revisionCount, inserts a DocumentRevision.
```

**`POST /api/projects/[id]/render`** — server-side render from the authoritative document.
```ts
// body: { format, scale, size }
// Uses a headless Konva/node-canvas (or 'konva-node') to rasterize the document.
// -> { data: { exportJobId } }
```

### 5.7 Key functions

- `reducer` is pure and tested: given `(state, action) → state`, covers `addLayer`, `updateLayer`, `deleteLayer`, `moveLayer`, `setBackground`, `select`, `undo`, `redo`.
- `history.push` snapshots on change with a 50-entry cap and coalesces rapid keystrokes into one entry.
- `export.ts` builds a Konva Stage from the doc and `stage.toDataURL({ pixelRatio })` then converts to blob; server path uses `@napi-rs/canvas` + `konva-node` to produce identical output.

### 5.8 Dependencies

- **External:** `konva`, `react-konva`, `nanoid`, `zod`, `@napi-rs/canvas` (server render), `konva-node`, `lucide-react` (icons).
- **Intra-repo:** Phase 2 typography + font preview; Phase 1 r2/exports.

### 5.9 Acceptance criteria

1. Selecting any layer shows transform handles; dragging, resizing, and rotating update the document (assert doc `x/y/width/rotation`).
2. Adding text then toggling `fontWeather`/`fill`/`shadow` reflects live on canvas and in the persisted document JSON.
3. Undo (Cmd+Z) and redo (Cmd+Shift+Z) restore prior states; history never exceeds 50 entries (assert stack length).
4. Cursor-visible keyboard shortcuts work: `V` selection, `T` text, `M` move, `Del` delete, `Cmd+S` autosave, `Cmd+Z` undo. (Playwright key press asserts.)
5. Compare slider toggles between the original uploaded image and the recreated canvas without a layout shift.
6. Autosave persists a revision ≤ 2 s after the last change; a reload restores the exact last state (round-trip JSON equality).
7. Server render produces a PNG byte-identical-enough (within 1 px tolerance) to the client render for a fixed doc, asserting the export is deterministic.
8. A stale save with the wrong `baseRevisionId` returns `409 CONFLICT_EDITOR_STATE` and the client shows a "newer version exists — reload?" dialog.

### 5.10 Ordering within phase

1. Document schema + zod + reducer → 2. Editor shell + canvas projection → 3. Background + image layer → 4. Text tool reusing Phase 2 typography → 5. Shape tool → 6. Selection/move/transform → 7. History → 8. Autosave + revisions (persist) → 9. Compare → 10. Export pipeline client + server → 11. Shortcuts.

---

## 6. Phase 4 — Projects & Dashboard

### 6.1 Goals

- Persistence and management: **list/hub**, **duplicate/archive/delete**, **editor-state revisions**, **dashboard stats**, **favorites**, **exports history**.
- A logged-in user can organize many thumbnails and see usage/score trends.

### 6.2 Feature list

| Feature | PRD FR | Details |
|---------|--------|---------|
| Projects list (grid, sort/filter/pagination) | FR-P2 | updatedAt desc, favorites, archived filter |
| Project detail (score history, stages, re-analyze) | FR-P3 | |
| Duplicate project | FR-P4 | clone doc + thumbnail |
| Archive / restore / delete (soft delete) | FR-P5 | `isArchived`, trash view |
| Editor-state revision browser + restore | FR-P6 | revision list per project |
| Dashboard stats | FR-P7 | total score avg, analyses, exports, credits left |
| Favorites | FR-P8 | star toggle, pinned |
| Exports history | FR-P9 | per-project + global list + re-download |

### 6.3 Files / tables

```
src/app/(app)/dashboard/page.tsx          (edit)
src/app/(app)/projects/[id]/page.tsx       (edit)
src/app/(app)/projects/[id]/revisions/page.tsx
src/app/(app)/projects/[id]/exports/page.tsx
src/app/api/projects/route.ts             (edit: list w/ query)
src/app/api/projects/[id]/duplicate/route.ts
src/app/api/projects/[id]/route.ts        (edit: PATCH archive/favorite, DELETE soft)
src/app/api/projects/[id]/revisions/route.ts
src/components/projects/project-card.tsx
src/components/projects/project-grid.tsx
src/components/projects/project-actions.tsx  (duplicate/archive/delete)
src/components/dashboard/stats-card.tsx
src/components/dashboard/stats-trend.tsx     (dataviz: score over time)
prisma/schema.prisma                      (Project fields already present; add ExportJob)
```

```prisma
model ExportJob {
  id          String     @id @default(cuid())
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  format      String     // png|jpeg|webp
  scale       Int        @default(1)
  size        String     @default("original")
  status      StageStatus
  resultKey   String?
  resultUrl   String?
  error       ErrorCode?
  fileSize    Int?
  createdAt   DateTime   @default(now())
  completedAt DateTime?
  @@index([projectId, createdAt])
}
```

### 6.4 API + acceptance

- `GET /api/projects?query=&order=updatedAt:desc&favorites=&includeArchived=false&cursor=` returns a cursor-paginated grid. Accept 200 with stable first page, cursor for next.
- `PATCH /api/projects/[id]` with `{ isFavorite: true }` → 200 and row updated (favorites filter returns it).
- `POST /api/projects/[id]/duplicate` → 201 creating a new Project + cloned `EditorDocument`; assert the copy's `revisionCount` resets and `slug` is new.
- `DELETE /api/projects/[id]` soft-deletes (`deletedAt`) and excludes from default list; archive keeps it recoverable. Test that archive → restore returns it and that delete is permanent after 30 days (sweeper job).
- Dashboard totals are correct: `analysesUsed`, `exportsUsed`, `creditsRemaining`, and average score across non-archived projects (unit test the aggregation query).

### 6.5 Dependencies

- **Intra-repo:** Phase 1 CRUD + Phase 3 doc/revisions; dataviz uses the shared chart convention from the `dataviz` constraints.

---

## 7. Phase 5 — SEO & Marketing

### 7.1 Goals

- A real **landing page**, **`/tools/*` programmatic SEO pages**, a **blog**, **schema**, **sitemap**, **OG images**, and a **content model**.
- SEO clusters (sec §19) with programmatic pages: e.g. `/tools/youtube-thumbnail-analyzer`, `/tools/thumbnail-font-finder`, `/tools/thumbnail-text-detector`, `/tools/thumbnail-ocr`, `/tools/youtube-thumbnail-size`.

### 7.2 Feature list

| Feature | PRD FR | Details |
|---------|--------|---------|
| Landing page (hero, social proof, pricing teaser) | FR-M1 | |
| Programmatic `/tools/*` pages | FR-M2 | SSG from a `tools` content model |
| Blog (post list, post page, RSS) | FR-M3 | MDX/Postgres content, sitemap |
| JSON-LD schema (SoftwareApplication, FAQ, Breadcrumb) | FR-M4 | |
| Sitemap (`app/sitemap.ts`, `robots.txt`) | FR-M5 | dynamic + static |
| OG images (`@vercel/og`) | FR-M6 | per-tool + per-post |
| Meta/title/description injection | FR-M7 | `generateMetadata` |
| Content model (tools + posts) | FR-M8 | Prisma `Tool`/`BlogPost` or static MDX |

### 7.3 Files

```
src/app/(marketing)/layout.tsx
src/app/(marketing)/page.tsx              (edit: real marketing)
src/app/(marketing)/tools/[slug]/page.tsx
src/app/(marketing)/blog/page.tsx
src/app/(marketing)/blog/[slug]/page.tsx
src/app/sitemap.ts
src/app/robots.ts
src/app/opengraph-image.tsx             (dynamic OG)
src/lib/seo/tools.ts                     (content model / generateStaticParams)
src/lib/seo/schema.ts
src/lib/seo/meta.ts
src/content/tools/*.ts                   (or Prisma seeded)  e.g. thumbnail-font-finder.ts
src/content/posts/*.mdx                  (if MDX)
prisma/schema.prisma                     (optional Tool / BlogPost)
```

**Tool content model shape**
```ts
export interface ToolSeo {
  slug: string;                 // "thumbnail-font-finder"
  title: string;                // "Font Finder for YouTube Thumbnails"
  category: string;             // "typography"
  description: string;
  h1: string;
  keywords: string[];
  faq: { q: string; a: string }[];
  relatedSlugs: string[];
  cta: { label: string; href: string };
}
```

### 7.4 Acceptance criteria

1. `/tools/thumbnail-font-finder` renders as SSG, is in the sitemap, and returns 200 for the slug (no client data).
2. Each tool page emits a JSON-LD `SoftwareApplication` + `BreadcrumbList` block; validate with a schema parser in a test.
3. `sitemap.xml` includes the landing, all `/tools/*`, all blog posts, and the two highest-value dashboards (dashboard excluded to avoid duplicate-content, verify robots disallows `/api`).
4. OG image endpoint returns a 1200×630 PNG for `/tools/thumbnail-font-finder` and `/blog/[...slug]` (assert content-type + dimensions).
5. The landing page has `generic` + `og` + `twitter` metadata and a non-trivial layout that renders the hydration test without CLS.

### 7.5 Dependencies

- **Intra-repo:** Phase 1 landing shell; Phase 6 pricing content; `@vercel/og`, `next-sitemap`.

---

## 8. Phase 6 — Billing

### 8.1 Goals

- **Stripe Checkout + Billing Portal + webhooks**, **server-side plan gating**, **usage counters + enforcement**, **credits**, **upsell UX**, **subscription analytics**.
- Everything gated server-side (do not trust the client). The free tier gets monthly credits; pro/studio unlock higher limits + AI features.

### 8.2 Feature list

| Feature | PRD FR | Details |
|---------|--------|---------|
| Stripe Checkout session | FR-B1 | one-time credits + subscriptions |
| Stripe Billing Portal | FR-B2 | manage plan/cancel |
| Stripe webhooks (checkout, invoice, subscription) | FR-B3 | idempotent, signature-verified |
| Plan gating (server) | FR-B4 | capability matrix, `requirePlan` guard |
| Usage counters + enforce | FR-B5 | `Quota` row, worker reserve |
| Credit ledger + purchase | FR-B6 | Charge → ledger → balance |
| Upsell UX (gate dialog) | FR-B7 | soft-touch upgrade prompts |
| Subscription analytics | FR-B8 | MRR, churn via PostHog/Stripe |

### 8.3 Plan / capability matrix (sec §9)

| Capability | Free | Pro | Studio |
|------------|------|-----|--------|
| Analyses / month | 5 ($1 / extra) | 120 (included) | 1500 |
| Exports / month | 3 | 60 | 600 |
| Credit rollover | no | no | yes (3 mo) |
| AI variations | — | 5 styles | 25 styles |
| Team seats | 1 | 1 | 5 |
| API access | — | — | yes |

### 8.4 Files / tables

```
src/app/api/billing/checkout/route.ts
src/app/api/billing/portal/route.ts
src/app/api/webhooks/stripe/route.ts
src/server/billing/plans.ts              (capability matrix)
src/server/billing/guards.ts             requirePlan(tier)
src/server/billing/webhooks.ts           handlers
src/server/billing/credits.ts            reserve/commit/refund
src/components/billing/plan-card.tsx
src/components/billing/gate-dialog.tsx
src/components/billing/usage-meter.tsx
prisma/schema.prisma                     Subscription model
```

```prisma
model Subscription {
  id                  String     @id @default(cuid())
  userId              String     @unique
  user                User       @relation(...)
  stripeCustomerId    String     @unique
  stripeSubscriptionId String?   @unique
  tier                Ticker     @default("free")
  creditsPerMonth     Int        @default(5)
  currentPeriodEnd    DateTime?
  status              String     // active|past_due|canceled
  canceledAt          DateTime?
  createdAt           DateTime   @default(now())
}
```

### 8.5 Gating pattern (`requirePlan`)

```ts
export function requirePlan(needed: Ticker) {
  return async (req: NextRequest, ctx: { params: { id: string } }) => {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Sign in required", undefined, { status: 401 });
    const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    if (!can(sub?.tier ?? "free", needed))
      return fail("PLAN_LIMIT_EXCEEDED", "Upgrade to continue", { tier: sub?.tier, needed }, { status: 402 });
    return NextResponse.next();
  };
}
```

### 8.6 Acceptance criteria

1. `POST /api/billing/checkout` with a free user creates a Stripe Checkout Session for the pro plan and returns a `url`; a logged-out user gets `401`.
2. Webhook handler verifies the Stripe signature and is **idempotent** (replaying `checkout.session.completed` twice yields one credit grant) — assert with a recorded fixture + replay.
3. On `invoice.paid`, `Quota.creditsRemaining` increments by the plan's `creditsPerMonth`; on `invoice.payment_failed`, tier flags `past_due` and caps features.
4. A free user exceeding 5 analyses gets `402 PLAN_LIMIT_EXCEEDED` on the next `analyze` — the gate runs server-side, not in the client.
5. The ledger shows `purchase` rows netting to the current `creditsRemaining`.
6. Usage meter renders exact remaining credits and updates after any spend (unit + e2e).
7. Guardrail: secrets (`webhook signing secret`, price IDs) are never exposed in client bundles (`fetch` grep in the client bundle returns nothing).

### 8.7 Ordering within phase

1. Plan matrix + guards → 2. Checkout session → 3. Webhooks + idempotency → 4. Credit purchase → 5. Usage gate on analyze/export → 6. Billing Portal → 7. Upsell dialog → 8. Analytics events (MRR/churn).

---

## 9. Phase 7 — Advanced AI

### 9.1 Goals

- **Variations (5 styles)**, **improvement-mode polish**, **YOLO object tier**, **on-device OCR**, **team workspaces**, **batch**, **API access**.
- This phase is the differentiator and the tail; ship only after phases 0→1→2→3 are stable against real models.

### 9.2 Feature list

| Feature | PRD FR | Details |
|---------|--------|---------|
| AI variations (react, high-contrast, colorful, clean, drama) | FR-AD1 | reuse document model, re-render |
| Improvement-mode polish (grading + changes) | FR-AD2 | score delta per suggestion |
| YOLO object tier (on-device/edge) | FR-AD3 | privacy-preserving local detection |
| On-device OCR (WebAssembly) | FR-AD4 | tesseract.js in-browser, offline |
| Team workspaces | FR-AD5 | org, roles, shared projects, seats |
| Batch (multi-thumbnail upload + bulk export) | FR-AD6 | queue + progress |
| Public API access (scoped keys) | FR-AD7 | rate-limit + usage |

### 9.3 Files / tables

```
src/server/ai/variations.ts           (style prompts + template merges)
src/server/ai/improvement.ts          (grade + suggestions)
src/server/ai/batch-queue.ts          (inngest fan-out)
src/server/api/keys.ts                (hashed API keys)
src/app/api/public/v1/analyze/route.ts   (PRD FR-API1)
src/app/api/public/v1/analyze/[id]/route.ts
src/server/auth/api-auth.ts           (Bearer key auth)
src/components/variations/variation-grid.tsx
src/components/improvement/improvement-card.tsx
src/components/batch/batch-upload.tsx
prisma/schema.prisma                  ApiKey + Organization + Membership models
```

```prisma
model ApiKey {
  id         String   @id @default(cuid())
  userId     String
  name       String
  hashedKey  String   @unique   // sha256 of the raw key
  prefix     String              // "ti_live_abcd"
  lastUsedAt DateTime?
  revoked    Boolean  @default(false)
  createdAt  DateTime @default(now())
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  members   Membership[]
}
model Membership {
  id        String   @id @default(cuid())
  orgId     String
  userId    String
  role      String   // owner|admin|editor|viewer
  @@unique([orgId, userId])
}
```

### 9.4 Acceptance criteria

1. `POST /api/public/v1/analyze` with a valid `Authorization: Bearer ti_live_...` returns a scored analysis; a bad key → `401 UNAUTHORIZED`; a revoked key → `403 FORBIDDEN`.
2. API keys are stored hashed (never plaintext) — assert the hashed column only; the raw key is shown once at creation (e2e).
3. Variations returns 5 documents each differing from the base only in the targeted style axes (text color/hierarchy/layout), and each is re-renderable → exportable.
4. Improvement mode emits ≥1 concrete suggestion that, when applied, raises the deterministic score (assert score delta > 0 in a fixture).
5. Batch: uploading 10 thumbnails creates a queue that processes all 10, deducts ≤ 10 credits, and yields 10 exports, with a cancellation path.
6. On-device OCR runs offline in a **worker** and integrates as a provider option with a privacy toggle; it never uploads pixels when enabled (assert no network upload in the trace).

### 9.5 Ordering within phase

1. API keys + public auth → 2. Public analyze endpoint + rate limiting → 3. Variations → 4. Improvement mode → 5. Batch queue → 6. YOLO-on-edge → 7. On-device OCR → 8. Team workspaces → 9. Usage analytics on API.

---

## 10. Post-launch loop (analytics → feedback → iterate)

### 10.1 Instrumentation

- **PostHog:** `project_created`, `analysis_started`, `analysis_completed` (with score bucket, stage duration, provider used), `analysis_failed`, `export_completed`, `editor_opened`, `editor_gate_triggered`, `outcome` events.
- **Sentry:** capture every non-`validation` error; attach `{ projectId, stage, provider, analysisId }` to triage the AI pipeline specifically.
- **Stripe/RevenueCat:** MRR, churn, LTV via the `subscription.updated` webhook → PostHog identity.

### 10.2 The loop

1. **Measure:** per-funnel conversion (landing → signup → first analysis → first export → retention at 7/30 d).
2. **Learn:** weekly review of (a) score vs. creator-uploaded next-action (did a high score correlate with continued use?), (b) provider latency/cost per analysis, (c) which tools pages drive signups.
3. **Act:** one-item experiment per week — a new tool page, a gate threshold, a font alternative UI, an export preset.
4. **Guardrails:** roll out only behind a feature flag (`posthog-featureflags`), and gate model prompts behind the provider abstraction so a bad prompt can be reverted without a code deploy.

### 10.3 Weekly iteration cadence

| Slot | Owner | Output |
|------|-------|--------|
| Mon | Growth | tool-page A/B + SEO watch |
| Tue | AI | provider cost/latency + OCR error review |
| Wed | Product | score-vs-retention analysis + one gate tweak |
| Thu | Eng | flag rollout + Sentry triage + model prompt change |
| Fri | All | experiment readout → decide next week's one item |

---

## 11. Definition of Done (per phase gate)

### Phase 0 — Foundations
- `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` green in CI on main.
- `prisma migrate dev` clean; seed works; `env.ts` fails fast on missing secrets.
- ESLint `no-explicit-any` is an error; strict mode on. Foundation has **zero** leftover `TODO`s.

### Phase 1 — MVP
- E2E happy path green in Playwright: signup → upload → analyze → score → editor → export.
- All error paths return the standard envelope; loading/success/empty/error states for upload, analyze, export.
- Credit deduction is exactly-once; a failed run never charges. Envelope + Zod cover every endpoint.
- No `any`; every route validated; no verbatim copy of any copyrighted design (spot-check).

### Phase 2 — AI Analysis
- Claude primary + Tesseract fallback + refund logic; SSE stages `pending→running→completed|partial|failed` with reconnect.
- Font search returns ranked candidates with `~confidence` chips + preview; dedupe by content hash; scoring v2 confidence-weighted.
- Real model run completes a full thumbnail in ≤ 90 s and costs ≤ budget; degraded runs mark `partial`, never throw the user out.

### Phase 3 — Recreation Editor
- Editor doc is versioned + serializable; reducer pure + tested; history capped.
- Autosave, revision browser, compare, keyboard shortcuts, and deterministic client/server export all pass e2e.
- Export is byte-deterministic; stale-save conflict returns the right 409 and a recovery dialog.

### Phase 4 — Projects & Dashboard
- Grid sort/filter/pagination; duplicate/archive/delete; revision restore; favorites; export history.
- Dashboard aggregation queries are indexed and return correct totals; zero N+1 in the list (checked with a Prisma query log).

### Phase 5 — SEO & Marketing
- All `/tools/*` + blog SSG and in sitemap; JSON-LD valid; OG images correct size; metadata injected. Lighthouse SEO score ≥ 90 on landing + a tool page.

### Phase 6 — Billing
- Checkout → webhook → ledger → quota closed loop; idempotent webhooks; server-side gating; upsell dialog; secrets never in the client.
- Free-tier hard cap enforced; a 402 has a CTA that recovers to upgrade.

### Phase 7 — Advanced AI
- Public API stable + rate-limited + hashed keys; variations/improvement/batch/workspaces offline-verified; on-device OCR has a privacy toggle and does not upload pixels.
- No regression: all earlier-phase e2e still green with feature flags.

---

## Appendix A — Canonical endpoint map (consolidated, sec §14)

| Method | Path | Auth | Phase | Purpose |
|--------|------|------|-------|---------|
| GET | `/api/health` | — | 0 | liveness |
| POST | `/api/auth/[...nextauth]` | — | 1 | Auth.js |
| POST | `/api/uploads/presign` | user | 1 | R2 presign |
| GET/POST | `/api/projects` | user | 1 | list / create |
| GET/PATCH/DELETE | `/api/projects/[id]` | user | 1,4 | read / update / soft-delete |
| POST | `/api/projects/[id]/analyze` | user | 1 | kick analysis |
| GET | `/api/projects/[id]/stages` | user | 1,2 | SSE stage stream |
| POST | `/api/projects/[id]/export` | user | 1 | queue export |
| GET | `/api/projects/[id]/document` | user | 3 | fetch editor doc |
| PUT | `/api/projects/[id]/document` | user | 3 | save editor doc |
| POST | `/api/projects/[id]/render` | user | 3 | server render |
| GET | `/api/fonts/search` | user | 2 | font candidates |
| POST | `/api/projects/[id]/duplicate` | user | 4 | duplicate |
| GET | `/api/projects/[id]/revisions` | user | 4 | revision list |
| POST | `/api/billing/checkout` | user | 6 | Stripe checkout |
| POST | `/api/billing/portal` | user | 6 | Stripe portal |
| POST | `/api/webhooks/stripe` | — | 6 | Stripe webhook |
| POST | `/api/public/v1/analyze` | key | 7 | public API |
| GET | `/api/public/v1/analyze/[id]` | key | 7 | public API result |

## Appendix B — `.env.example`

```bash
# ── App ─────────────────────────────────────────────
NODE_ENV=development
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Database (Neon) ────────────────────────────────
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require  # pooled
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require    # direct for migrations

# ── Auth.js (JWT) ───────────────────────────────────
AUTH_SECRET=change-me-min-16-chars
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# ── Cloudflare R2 ───────────────────────────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=thumbintel
R2_PUBLIC_URL=https://cdn.thumbintel.app

# ── AI Providers ────────────────────────────────────
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-5

# ── Inngest ─────────────────────────────────────────
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# ── Stripe ──────────────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_STUDIO_MONTHLY=
STRIPE_PRICE_CREDITS_100=

# ── Monitoring / Growth ─────────────────────────────
SENTRY_DSN=
POSTHOG_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
```

## Appendix C — Types you will rely on (export from `src/lib/**`)

```ts
export type Tier = "free" | "pro" | "studio";
export type StageName = "ocr" | "objects" | "typography" | "visual" | "scoring";
export type StageStatus = "pending" | "queued" | "running" | "completed" | "failed" | "partial";
export type CreditType = "purchase" | "grant" | "spend_analysis" | "spend_export" | "refund" | "adjustment";
export type ExportFormat = "png" | "jpeg" | "webp";
export type ErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND"
  | "PLAN_LIMIT_EXCEEDED" | "CREDIT_INSUFFICIENT" | "RATE_LIMITED"
  | "PROVIDER_ERROR" | "PROVIDER_TIMEOUT" | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_QUOTA_EXCEEDED" | "STORAGE_ERROR" | "EXPORT_FAILED"
  | "CONFLICT_EDITOR_STATE" | "INTERNAL_ERROR";
export interface ApiErrorEnvelope { error: { code: ErrorCode; message: string; details?: unknown }; }
export type ConfidenceChip = string; // e.g. "~92% confidence", "(est. ~65% match)"
```

---

*End of ThumbIntel Development Roadmap. Reconcile FR numbers and file paths against `01_PRD.md` / `05_FILE_STRUCTURE.md` when those sources are available, then keep this document's phases, gates, ordering, and critical path unchanged.*
