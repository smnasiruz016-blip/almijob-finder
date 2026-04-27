# AlmiJob Finder

AlmiJob Finder is a beta-ready job search web app built for `almiworld` with Next.js, TypeScript, Tailwind, Prisma, and PostgreSQL. Users can create an account, upload a resume, search live job sources through adapters, search worldwide or by country/state/city, rank jobs by resume fit, save jobs and searches, review resume suggestions, and use a stub-backed alert workflow while real delivery infrastructure is still being finalized.

## Implementation Summary

### Architecture
- UI: Next.js App Router pages and reusable dashboard/auth components in `src/app` and `src/components`
- API: Route handlers in `src/app/api`
- Shared utilities: auth, Prisma, validation, logging, rate limiting in `src/lib`
- Services: resume parsing, ranking, usage plans, alerts, admin stats, and job orchestration in `src/server/services`
- Provider adapters: extensible interface with Remote OK, Remotive, and other live data plus mock fallback adapters in `src/server/adapters`
- Storage: local file storage abstraction in `src/server/storage`
- Persistence: PostgreSQL schema and seed in `prisma`

### Folder Structure
- `src/app`: routes, layouts, pages, API handlers
- `src/components`: UI primitives, forms, dashboard modules
- `src/lib`: auth, validation, utilities, logging, Prisma, rate limiting
- `src/server/adapters`: mock providers and official API placeholders
- `src/server/parsers`: resume text extraction and rules-based parsing
- `src/server/services`: ranking engine, job search orchestration, resume helper, alerts, admin
- `src/server/storage`: storage abstraction for uploaded files
- `prisma`: schema and seed script
- `tests`: parser, ranking, and API route tests

### Database Schema
- `User`: credentials, role, subscription tier, timestamps
- `Session`: cookie-backed session storage
- `Resume`: original file metadata, extracted text, parsed profile arrays
- `JobSearch`: persisted search parameters, keyword field, plus latest results snapshot
- `SearchHistory`: search audit trail with result counts
- `SavedJob`: saved job shortlist entries
- `SavedSearch`: alert-enabled saved queries
- `JobResultCache`: normalized provider result snapshots for dedupe and traceability

## Features Included

- Email/password sign up, login, logout, protected dashboard, and basic admin gate
- SaaS-style dashboard shell with sidebar navigation, top header, and branded auth flow
- Resume upload with PDF/DOCX support hooks and rules-based parsing
- Search form with title, keyword, worldwide or country filters, state, city, remote mode, employment type, and salary filters
- Advanced filters for company preference and posting freshness
- Match score progress visualization with explanation tooltip data
- Card and table result views with improved hierarchy
- Skeleton loaders, empty states, and clearer upload/search error messaging
- Save job, remove saved job, save searches, search history, and saved-search alert controls
- Resume Improvement Suggestions panel
- Search intelligence summary including source breakdown, live-result counts, remote counts, salary-visible counts, top companies, average fit quality, and high-fit result counts
- Provider health cards showing which live sources succeeded, failed, or triggered fallback behavior
- Deduplicated results and richer job cards with missing-keyword callouts
- Free-plan daily search limits plus Pro placeholder tier behavior
- Rate limiting, logging, input validation, file type and size checks, and local storage abstraction

## Local Setup

### Prerequisites
- Node.js 20+ or the bundled Codex workspace runtime
- PostgreSQL running locally
- A package manager such as `pnpm` or `npm`

### Steps
1. Copy `.env.example` to `.env` and update both `DATABASE_URL` and `DIRECT_URL`.
2. Install dependencies:

```bash
pnpm install
```

3. Generate Prisma client and push the schema:

```bash
pnpm db:generate
pnpm db:push
```

4. Seed demo data:

```bash
pnpm db:seed
```

5. Start the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase + Vercel Notes

For a Supabase-backed deployment:

- `DATABASE_URL` should use the Supabase pooler connection string.
- `DIRECT_URL` should use a direct or session-capable connection string that Prisma can use for schema operations.
- The Prisma datasource is configured to use:
  - `url = env("DATABASE_URL")` for the app/runtime
  - `directUrl = env("DIRECT_URL")` for `prisma db push`

Before redeploying on Vercel, make sure these environment variables are set in the Vercel project:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `REMOTE_OK_ENABLED`
- `REMOTE_OK_API_URL`
- `REMOTE_OK_REVALIDATE_SECONDS`
- `REMOTIVE_ENABLED`
- `REMOTIVE_API_URL`
- `REMOTIVE_REVALIDATE_SECONDS`
- `JOOBLE_ENABLED`
- `JOOBLE_API_URL`
- `JOOBLE_API_KEY`
- `ADZUNA_ENABLED`
- `ADZUNA_API_URL`
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `ALERT_DELIVERY_MODE`
- `ANALYTICS_ENABLED`
- `ANALYTICS_PROVIDER`

If you are using local storage in development, keep in mind that uploaded resume storage is still local-only by default. For Vercel, move to a persistent storage backend before treating file uploads as production-hardened.

### Demo Accounts
- Admin: `admin@almijobfinder.dev` / `Password123!`
- User: `demo@almijobfinder.dev` / `Password123!`

## Search Providers

This MVP intentionally avoids unauthorized scraping. The provider layer uses a `JobSourceAdapter` interface:

```ts
export interface JobSourceAdapter {
  source: string;
  sourceType?: "live" | "mock";
  isEnabled(): boolean;
  searchJobs(input: JobSearchInput): Promise<NormalizedJob[]>;
}
```

Current implementation:
- `RemoteOK` live adapter
- `Remotive` public API adapter
- `Jooble` live adapter when an API key is configured
- `Adzuna` live adapter when credentials are configured
- `MockGreenhouse`
- `MockLever`
- `MockWorkable`

The app supports worldwide searches in two ways:
- `Worldwide` or blank country searches work through Remote OK and Remotive live data.
- Country-specific searches can also use Adzuna when `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` are configured for supported countries.

The app first tries each live adapter independently and keeps going even if one provider fails. If no live providers return usable jobs, the app can optionally fall back to mock provider data for internal demos or local development. For real beta users, keep sample fallback disabled so only live jobs are shown.

Provider environment variables:
- `REMOTE_OK_ENABLED`: set to `false` to disable Remote OK
- `REMOTE_OK_API_URL`: override the Remote OK endpoint if needed
- `REMOTE_OK_REVALIDATE_SECONDS`: cache interval for the live Remote OK request
- `REMOTIVE_ENABLED`: set to `false` to disable Remotive
- `REMOTIVE_API_URL`: override the Remotive public API endpoint if needed
- `REMOTIVE_REVALIDATE_SECONDS`: conservative cache interval for the Remotive public API request
- `JOOBLE_ENABLED`: set to `false` to disable Jooble
- `JOOBLE_API_URL`: base Jooble API URL
- `JOOBLE_API_KEY`: required for Jooble live results
- `ADZUNA_ENABLED`: set to `false` to disable Adzuna entirely
- `ADZUNA_API_URL`: base Adzuna API URL
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`: required for Adzuna live results
- `MOCK_FALLBACK_ENABLED`: set to `false` for production or family testing so only live jobs are shown
- `ANALYTICS_ENABLED`: set to `false` to silence product event hooks
- `ANALYTICS_PROVIDER`: currently `log`, with a clean abstraction point for a future analytics vendor

To add a new provider:

1. Create a new adapter in `src/server/adapters`.
2. Implement `isEnabled()` based on environment variables or feature flags.
3. Normalize provider responses into `NormalizedJob`.
4. Register the adapter in `src/server/adapters/provider-registry.ts`.

Remote OK note:
- The app is wired to `https://remoteok.com/api` by default through `REMOTE_OK_API_URL`.
- Keep attribution and usage terms under review before production launch.

Remotive note:
- The app is wired to `https://remotive.com/api/remote-jobs` by default through `REMOTIVE_API_URL`.
- The normalized output preserves Remotive attribution and uses the Remotive job URL so the UI can show the source clearly.
- The public API has usage constraints and delayed listings, so the integration uses a conservative cache interval and does not scrape the site.

Jooble note:
- The app is wired to `https://jooble.org/api` by default through `JOOBLE_API_URL`.
- Jooble requires `JOOBLE_API_KEY` to be configured before the adapter will run.
- This adapter is useful for stronger location-based coverage beyond the mostly remote inventories from RemoteOK and Remotive.

## Alerts

Saved searches can enable alerts. The app exposes a cron-friendly endpoint:

- `POST /api/cron/daily-alerts`
- Include header `x-cron-secret: <CRON_SECRET>` when `CRON_SECRET` is set

The email provider is still a dev stub that logs outgoing alert content. Replace `getEmailProvider()` in `src/server/services/email.ts` with a real provider before treating alerts as production-ready delivery.

Free vs Pro behavior:
- Free: 5 searches per day
- Pro placeholder: unlimited searches, full resume insights, alerts
- Alert delivery defaults to a structured log/email stub through `ALERT_DELIVERY_MODE=stub`
- Free users can save searches, but alerts remain disabled until they upgrade

## Product Analytics Readiness

The app now includes lightweight product analytics hooks through `src/lib/analytics.ts`. No vendor SDK is installed yet. The default provider writes structured events to the app logs so beta activity can be observed safely before a real analytics platform is chosen.

Current tracked events:
- `resume_uploaded`
- `job_search_performed`
- `job_saved`
- `search_saved`
- `alert_toggled`
- `plan_limit_hit`

These hooks are triggered from the authenticated app APIs, so the product behavior is tracked at the same layer where the action is actually enforced.

## In-App Reliability Notes

- Job cards show match reasons directly so users can understand why a role scored well
- Search network status explains whether a live provider succeeded, had no matches, failed, or triggered fallback data
- Resume upload and parsing errors use plain-language messages instead of raw technical failures
- If no resume is uploaded, the dashboard explains what becomes better after upload rather than showing blank panels

## Tests

Included tests cover:
- Resume parsing utility
- Ranking logic
- Job search API route validation
- Provider normalization
- Provider fallback behavior when live sources return no usable jobs
- Usage limit enforcement
- Analytics hook readiness
- Saved-job route validation
- Resume upload route behavior

Run:

```bash
pnpm test
```

## Security and Production Notes

- Passwords are hashed with `bcryptjs`
- Sessions are stored server-side and sent in an HTTP-only cookie
- Search API uses in-memory rate limiting suitable for MVP and single-instance deployment
- Search usage is tracked per day to support the freemium model
- Uploads are restricted by MIME type and size
- File storage is abstracted for local dev and future cloud migration
- Validation uses `zod`
- Logging is centralized via `src/lib/logger.ts`

## What Is Complete

- End-to-end auth, resume upload, search, ranking, save job, save search, and admin stats flow
- Live adapter plus graceful mock fallback
- Freemium-ready usage tracking and Pro placeholder gating
- PostgreSQL Prisma schema and seed data
- Test coverage for the requested areas
- `.env.example` and setup documentation

## Placeholder Areas

- Payment and billing are still placeholder-only
- Email delivery uses a dev logging provider
- File storage is local-only in dev, with cloud placeholders ready
- Resume parsing is rules-based and intentionally lightweight for MVP
- Saved-job validation now protects the API shape, but there are still no browser-level end-to-end tests for the main user flows
- In-memory rate limiting should be upgraded for distributed production deployments

## V2 Roadmap

- Replace rules-based resume parsing with configurable extraction pipelines and embeddings-assisted matching
- Add real email delivery and a durable job queue
- Support richer saved search editing and user notification controls
- Add organization workspaces and recruiter-facing features
- Introduce provider-specific health checks and ingestion observability
- Improve result deduplication and resume version comparison
- Add a real billing provider and subscription management
