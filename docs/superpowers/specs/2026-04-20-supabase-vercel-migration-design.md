# Supabase + Vercel Migration Design

**Date:** 2026-04-20
**Status:** Approved — ready for implementation planning
**Goal:** Make the ara-eval web app (red-teaming chat + risk fingerprinting) deployable on Vercel with Supabase as the primary data store, while preserving the existing SQLite-backed local experience used by students running labs.

## Summary

The web app currently uses `better-sqlite3` against `../results/ara-eval.db`, a SQLite file also written by the Python labs. That design works well locally — students run labs from CLI and can optionally boot the web app to inspect their runs — but is a poor fit for serverless deployment on Vercel (no persistent writable disk).

We will introduce a second DB driver (Supabase Postgres, via `@supabase/supabase-js` and `@supabase/ssr`), selected at import time based on env vars. The web app's existing public API (`createRun`, `logRequest`, `addChatMessage`, etc.) remains stable; only its signatures become `Promise`-returning.

Supabase will be a **shared project** with `photocritic-site`. All ara-eval tables are namespaced `ara_*` to prevent collisions with photocritic's schema.

User identity uses **anonymous auth on arrival** with **Google OAuth as an optional upgrade** via `linkIdentity` — guests work immediately, signing in preserves history and unlocks cross-device access.

## Non-goals / Out of scope

- Changing the Python labs. They continue writing to local SQLite for student auditability.
- Migrating any lab data into Supabase. Local-to-remote sync is a separate, future feature.
- Instructor/student roles or any RBAC beyond "own rows only". Not needed now.
- OAuth providers beyond Google. Magic-link email and others deferred.
- Removing the `web/Dockerfile`. It stays for users who prefer self-hosting; Vercel ignores it.
- Modifying photocritic-site's tables, migrations, or code.

## Context & constraints

- Two users of `results/ara-eval.db` today: (a) Python labs write eval runs + requests; (b) web app reads those and also writes its own chat sessions/messages.
- Web app deployed to Vercel has no writable disk → must move web-initiated writes off SQLite.
- The labs must keep working locally without any Supabase dependency (students may not have network access or credentials).
- Shared Supabase project with photocritic-site means:
  - Schema changes must not collide with photocritic's tables or migrations
  - Adding Supabase Auth (Google + anon) is safe: photocritic uses service role exclusively and does not initiate user sessions
  - Migration files named to avoid collision with photocritic's `001_*`, `002_*`, etc.

## Architecture

### Web app file layout (new files marked `*`)

```
web/src/lib/
  db.ts                   ← shim: picks driver at import time, re-exports its API
  db-sqlite.ts         *  ← existing db.ts code, moved verbatim, sync functions wrapped in Promise.resolve
  db-supabase.ts       *  ← new driver, async, uses supabase-js query builder
  supabase-server.ts   *  ← createServerClient (cookie-aware), for API routes and server components
  supabase-client.ts   *  ← createBrowserClient, for auth button components
  auth.ts              *  ← ensureAnonymousSession, linkGoogle, signOut helpers
```

### Driver selection

`db.ts` inspects `process.env.NEXT_PUBLIC_SUPABASE_URL` at import time:

- Present → re-export everything from `db-supabase.ts`
- Absent → re-export everything from `db-sqlite.ts`

(`NEXT_PUBLIC_SUPABASE_URL` is already the env var used by the browser client and server client for the Supabase project, so reusing it for the driver switch avoids a redundant alias.)

Both drivers export the same function names with the same argument shapes. Return types become `Promise<T>` uniformly — the SQLite driver wraps its sync calls in `Promise.resolve(...)` so callers don't need to know which backend is active.

Consequences:
- Vercel deploy (SUPABASE_URL set) never ships `better-sqlite3` code paths, so no native compile and no bundle bloat.
- Local student dev (SUPABASE_URL unset) gets SQLite, talks to the same `results/ara-eval.db` that the Python labs write.
- Local developer testing the Supabase path adds `SUPABASE_URL` and related keys to `.env.local`; the web app then talks to the shared Supabase project.

### Supabase repo layout

```
supabase/
  config.toml
  migrations/
    ara_eval_001_init_tables.sql
    ara_eval_002_enable_rls.sql
```

The filename prefix `ara_eval_` prevents collisions with photocritic-site's `001_initial_schema.sql`, `002_ai_provider_requests.sql`, etc. Supabase's migration tracker dedupes by filename.

Both repos can independently run `supabase db push` against the same project; the CLI reads `supabase_migrations.schema_migrations` in the remote DB and skips filenames already applied.

## Data model

Postgres translations of the existing SQLite schema, with namespacing, types, and user scoping added.

### `ara_eval_runs`

Tracks web-initiated evaluation runs (one per `/api/evaluate` invocation).

| column | type | notes |
|---|---|---|
| `run_id` | `TEXT PRIMARY KEY` | UUID string, generated by caller |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id)` | RLS scope |
| `started_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `finished_at` | `TIMESTAMPTZ` | |
| `model_requested` | `TEXT NOT NULL` | |
| `scenario_count` | `INTEGER NOT NULL` | |
| `personality_count` | `INTEGER NOT NULL` | |
| `total_calls` | `INTEGER NOT NULL DEFAULT 0` | |
| `successful_calls` | `INTEGER NOT NULL DEFAULT 0` | |
| `failed_calls` | `INTEGER NOT NULL DEFAULT 0` | |
| `total_input_tokens` | `INTEGER NOT NULL DEFAULT 0` | |
| `total_output_tokens` | `INTEGER NOT NULL DEFAULT 0` | |
| `total_cost_usd` | `DOUBLE PRECISION NOT NULL DEFAULT 0.0` | |
| `total_duration_ms` | `INTEGER NOT NULL DEFAULT 0` | |
| `python_version` | `TEXT` | unused in web path; kept for schema parity |
| `metadata` | `JSONB` | |

Index: `idx_ara_eval_runs_user_id` on `(user_id, started_at DESC)`.

### `ara_ai_provider_requests`

Per-call log of every LLM invocation.

| column | type | notes |
|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `run_id` | `TEXT NOT NULL REFERENCES ara_eval_runs(run_id)` | |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id)` | denormalized for RLS |
| `request_id` | `TEXT NOT NULL` | |
| `provider` | `TEXT NOT NULL` | |
| `model_requested` | `TEXT NOT NULL` | |
| `model_used` | `TEXT` | |
| `actual_provider` | `TEXT` | |
| `use_case` | `TEXT NOT NULL` | |
| `scenario_id` | `TEXT` | |
| `personality` | `TEXT` | |
| `response_status` | `INTEGER` | |
| `error_message` | `TEXT` | |
| `input_tokens` | `INTEGER` | |
| `output_tokens` | `INTEGER` | |
| `total_tokens` | `INTEGER` | |
| `cost_usd` | `DOUBLE PRECISION` | |
| `response_time_ms` | `INTEGER` | |
| `fingerprint_string` | `TEXT` | |
| `gating_classification` | `TEXT` | |
| `gating_rules_triggered` | `JSONB` | was TEXT-wrapped JSON in SQLite |
| `raw_request` | `JSONB` | was TEXT |
| `raw_response` | `JSONB` | was TEXT |
| `parsed_result` | `JSONB` | was TEXT |
| `openrouter_id` | `TEXT` | |
| `system_fingerprint` | `TEXT` | |
| `jurisdiction` | `TEXT` | |
| `rubric` | `TEXT` | |

Indexes:
- `(run_id)`
- `(request_id)`
- `(scenario_id)`
- `(scenario_id, personality)`
- `(user_id, created_at DESC)`

### `ara_chat_sessions`

| column | type | notes |
|---|---|---|
| `session_id` | `TEXT PRIMARY KEY` | |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id)` | |
| `started_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `model` | `TEXT NOT NULL` | |
| `initial_personality` | `TEXT NOT NULL` | |
| `initial_jurisdiction` | `TEXT NOT NULL` | |
| `initial_rubric` | `TEXT NOT NULL` | |
| `message_count` | `INTEGER NOT NULL DEFAULT 0` | |
| `context_changes` | `INTEGER NOT NULL DEFAULT 0` | |
| `metadata` | `JSONB` | |

Index: `(user_id, started_at DESC)`.

### `ara_chat_messages`

| column | type | notes |
|---|---|---|
| `id` | `UUID PRIMARY KEY DEFAULT gen_random_uuid()` | |
| `session_id` | `TEXT NOT NULL REFERENCES ara_chat_sessions(session_id)` | |
| `user_id` | `UUID NOT NULL REFERENCES auth.users(id)` | denormalized for RLS |
| `created_at` | `TIMESTAMPTZ NOT NULL DEFAULT now()` | |
| `role` | `TEXT NOT NULL` | |
| `content` | `TEXT NOT NULL` | |
| `personality` | `TEXT NOT NULL` | |
| `jurisdiction` | `TEXT NOT NULL` | |
| `rubric` | `TEXT NOT NULL` | |
| `model` | `TEXT NOT NULL` | |
| `input_tokens` | `INTEGER` | |
| `output_tokens` | `INTEGER` | |
| `response_time_ms` | `INTEGER` | |

Indexes:
- `(session_id, created_at ASC)`
- `(user_id, created_at DESC)`

### RLS

Applied identically to all four tables:

```sql
ALTER TABLE ara_<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ara_<table>_select_own" ON ara_<table>
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ara_<table>_insert_own" ON ara_<table>
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ara_<table>_update_own" ON ara_<table>
  FOR UPDATE USING (auth.uid() = user_id);
```

Anonymous users have a real `auth.uid()`, so these policies work for guests and signed-in users identically. No `DELETE` policy: preserving audit trail.

## Auth flow

### On first visit (server-side, in root layout)

1. `createServerClient()` reads cookies and calls `supabase.auth.getUser()`.
2. If no user: call `supabase.auth.signInAnonymously()`. This creates a real `auth.users` row (with `is_anonymous = true`) and sets session cookies.
3. Every subsequent request has `auth.uid()` available. RLS policies scope to it automatically.

### Google sign-in (client-side, from a button)

- If current user is anonymous: `supabase.auth.linkIdentity({ provider: 'google' })`. The anon user is converted in place — same `auth.uid()`, all history preserved.
- If no user or already signed in to a different account: `supabase.auth.signInWithOAuth({ provider: 'google' })`.

### Link-collision handling

`linkIdentity` fails if the target Google account is already linked to a different Supabase user (e.g., user previously signed in with Google elsewhere). We catch the error and fall back to `signInWithOAuth`:

- The user ends up on their pre-existing Google-authed account.
- Their current anonymous session's data is orphaned — correct behavior, since the "real" account already has its own history.
- A toast/banner informs them: *"Signed in to your existing account. The current guest session isn't linked."*

### Sign-out

`supabase.auth.signOut()` → redirect to home. On next request, layout triggers anonymous sign-in again, giving a fresh empty workspace.

### UI

Header/nav shows one of two states:
- **Anonymous**: small "Sign in with Google" button + tooltip "Save your sessions across devices"
- **Authed**: avatar + email + "Sign out" menu item

`/chat` and `/history` may surface the same CTA inline if the user has content worth preserving.

## API route changes

All routes under `web/src/app/api/` already use async handlers. Changes required:

1. `await` each `db.*` call (was sync in SQLite path; now async either way).
2. Inside handlers that write user-scoped data, use the cookie-aware server client so RLS is active. Each `db-supabase.ts` helper internally calls `createServerClient()`, then `supabase.auth.getUser()` to resolve the current `auth.uid()`, and includes `user_id` in the insert payload. RLS policies verify `auth.uid() = user_id`. This user-id plumbing is transparent to callers — they pass the same arguments as before.
3. Read-only routes that fetch *public* data (scenarios, prompts, reference JSON) are untouched — they read from bundled files.

Example (`/api/chat`):

```ts
// Before
const sessionId = randomUUID();
createChatSession({ sessionId, model, personality, jurisdiction, rubric });
addChatMessage({ sessionId, role: "user", content, ... });

// After
const sessionId = randomUUID();
await createChatSession({ sessionId, model, personality, jurisdiction, rubric });
await addChatMessage({ sessionId, role: "user", content, ... });
```

## Deployment

### Vercel configuration

- Connect the ara-eval repo to a Vercel project.
- Project root: `web/` (Next.js app).
- Build command: `npm run build` (default).
- Install command: `npm ci`.
- Environment variables (Production + Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, not exposed to client)
  - `OPENROUTER_API_KEY`

The root-level `railway.json` and `web/Dockerfile` are left in place (not removed) for self-hosting users.

### Local dev (student flow — unchanged)

```bash
cd web
npm install
npm run dev
# ↑ No SUPABASE_URL in .env.local → db.ts picks db-sqlite.ts → reads ../results/ara-eval.db
```

Students continue running Python labs, which write to the same SQLite file, and the local web UI shows those runs.

### Local dev (Supabase path)

```bash
# in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENROUTER_API_KEY=...

cd web && npm run dev
# ↑ SUPABASE_URL present → db.ts picks db-supabase.ts → talks to shared Supabase project
```

## Prerequisites (to set up before implementation starts)

1. Create or identify the shared Supabase project (same one photocritic-site uses).
2. Install Supabase CLI: `brew install supabase/tap/supabase`.
3. In Supabase dashboard → Authentication → Settings → enable **Allow anonymous sign-ins**.
4. In Google Cloud Console, create a Web-application OAuth client. Add redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
5. In Supabase dashboard → Authentication → Providers → Google → paste client ID + secret, enable.
6. Grab the three keys (URL, anon, service role) for `.env.local` and Vercel.

## Testing

### Existing tests

- Python tests (`tests/test_core.py`) don't touch the web app. Unchanged.
- Web unit tests (`web/src/__tests__/`) that exercise `db.ts`: run against the SQLite driver by default (no `SUPABASE_URL`). Behavior preserved.

### New tests

- `db-supabase.ts` exercised by a separate test suite that expects a local Supabase instance (`supabase start`) or a dedicated test project. Opt-in via env var; not run in CI by default until a test project is provisioned.
- Auth flow tested manually first (anon sign-in → Google link → sign-out → fresh anon). Automation deferred.

### Smoke test before declaring deploy-ready

Both should succeed end-to-end on a Vercel preview deployment:

1. Open `/chat` as a fresh browser. Verify anon session is created. Send a message. Verify the row appears in `ara_chat_messages`.
2. Call `/api/evaluate` (from the UI or via curl + session cookie). Verify rows in `ara_eval_runs` and `ara_ai_provider_requests`.
3. Sign in with Google. Verify `auth.users.is_anonymous = false` and existing chat rows still visible.
4. Sign out. Verify new visit creates a new anon user and does not show prior history.

## Resolved decisions

- Driver selection: use `NEXT_PUBLIC_SUPABASE_URL` presence. No separate `DB_DRIVER` env var.
- Migration filename prefix: `ara_eval_001_*` as proposed. Rely on the CLI's `schema_migrations` dedupe table for ordering.
- Keep `web/Dockerfile` and `railway.json` in place for self-hosters.
