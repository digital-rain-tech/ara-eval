# ADR-016: Vercel + Supabase Deployment

**Status:** Accepted
**Date:** 2026-05-29
**Supersedes:** ADR-013 (Railway Deployment)

## Context

ADR-013 chose Railway for the web app because it used `better-sqlite3` — a native
module that writes to local disk — which ruled out serverless platforms. We have
since moved the app to **Vercel** with **Supabase** Postgres as the data store,
which removes the disk constraint, gives anonymous + Google auth, and consolidates
hosting with the rest of our projects.

There are two distinct public surfaces, deployed as **two separate Vercel
projects**:

- **Leaderboard site** (`ara-eval.org`) — static-ish marketing/leaderboard. Reads
  `shared/leaderboard.json` from this repo via raw GitHub at build/runtime.
- **App** (`app.ara-eval.org` / `ara-eval.vercel.app`) — the interactive evaluator
  and adversarial red-team chat, which lives in `web/` in this repo.

(This repository is public; this ADR deliberately records only architecture and
configuration *shape* — no secrets, project identifiers, or host addresses.)

## Decision

### Hosting
- The app deploys to **Vercel**, git-connected to this repo with **Root Directory
  `web/`**; pushes to `main` auto-deploy. Build runs on Node 24, package manager
  **pnpm** (single `pnpm-lock.yaml`; no npm).
- The self-host **Docker** path (`web/Dockerfile`) is retained for users who prefer
  it, gated behind `BUILD_STANDALONE=1` so it does not affect Vercel builds.

### Data layer — dual driver
- `web/src/lib/db.ts` selects a driver at import time:
  - **Supabase** (`db-supabase.ts`) when `NEXT_PUBLIC_SUPABASE_URL` is set (deploy).
  - **SQLite** (`db-sqlite.ts`, the original `better-sqlite3` code) otherwise — so
    students running the Python labs locally keep a zero-setup, offline experience.
- Both drivers expose the same function names; all return `Promise<T>` uniformly.

### Shared Supabase project — namespacing
- The Supabase project is **shared with a sister project** (`photocritic-site`).
  To avoid collisions, every ara-eval table, index, and policy is namespaced
  **`ara_*`** (e.g. `ara_eval_runs`, `ara_ai_provider_requests`, `ara_chat_sessions`,
  `ara_chat_messages`), and migration files are prefixed `ara_eval_*`. Postgres
  identifiers stay within the 63-char limit.
- Per-user isolation via **RLS** (`auth.uid() = user_id`); anonymous auth gives
  guests a real `auth.uid()`, so the same policies cover guests and signed-in users.
- The co-tenant's own migrations (`001`–`004`) are kept as **comment-only stubs**
  in `supabase/migrations/` so `supabase db push` from this repo skips them by
  version without depending on the sibling repo. Those migrations are owned by the
  sister project and must be edited there, not here.

### Vercel-safe shared data
- The labs and the app share `scenarios/` and `prompts/` at the repo root, *outside*
  `web/`. Reading them at request time via `fs` breaks on serverless. So
  `web/scripts/generate-shared-data.mjs` bundles them into
  `web/src/generated/shared-data.ts` (gitignored) at build, via a `postinstall`
  hook and the `dev`/`build`/`test` scripts. Request-time code imports the bundled
  module — never a parent-dir file.

### Model selection
- **Labs/CLI** default to a **free** model (`is_default` in `shared/models.json`)
  for zero-cost student use.
- The **hosted demo** overrides to a **paid** endpoint via the `ARA_MODEL` env var,
  because free OpenRouter endpoints rate-limit under interactive load.
- `web/src/lib/validate.ts` permits `:free` models **or** an explicit paid
  **allowlist** — a cost guardrail so the picker's custom-model field cannot select
  an arbitrary expensive model.

## Configuration

Set in the Vercel project (Production, and Preview if branch deploys are used) —
**names only; values are never committed**:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `OPENROUTER_API_KEY`
- `ARA_MODEL` (paid demo model override)

Supabase dashboard prerequisite: **enable anonymous sign-ins**.

CI (`.github/workflows/ci.yml`) mirrors this: pnpm via `pnpm/action-setup`
(version pinned), Node 24, `pnpm install --frozen-lockfile` → tsc → lint → test →
build.

## Consequences

- The app is now serverless-compatible; no persistent disk required in production.
- Labs remain free and offline-capable; the demo is reliable (paid) without
  exposing cost to arbitrary visitors.
- A shared database means schema discipline (the `ara_*` namespace) is mandatory;
  the stub migrations keep the repo self-contained.
- `better-sqlite3` is still a dependency (for the local SQLite driver); it is unused
  on the Supabase/Vercel path and compiles from source in CI.

See `docs/superpowers/specs/2026-04-20-supabase-vercel-migration-design.md` for the
full migration design.
