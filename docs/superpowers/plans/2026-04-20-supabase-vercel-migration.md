# Supabase + Vercel Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the ara-eval web app (red-teaming chat + risk fingerprinting) to run on Vercel with Supabase as the primary data store, while preserving the SQLite-backed local flow that students use with the Python labs.

**Architecture:** Dual-driver pattern. `web/src/lib/db.ts` becomes a shim that picks between `db-sqlite.ts` (existing code, made async) and `db-supabase.ts` (new) based on `NEXT_PUBLIC_SUPABASE_URL` being present. Supabase Auth provides anonymous sessions by default, upgradeable to Google OAuth via `linkIdentity`. All four tables (`ara_eval_runs`, `ara_ai_provider_requests`, `ara_chat_sessions`, `ara_chat_messages`) are namespaced and guarded by RLS policies keyed on `auth.uid() = user_id`. Shared Supabase project with `photocritic-site`.

**Tech Stack:** Next.js 15 (App Router), Vitest, Supabase (Postgres + Auth), `@supabase/supabase-js`, `@supabase/ssr`, `better-sqlite3` (local-only), Supabase CLI for migrations.

**Spec reference:** `docs/superpowers/specs/2026-04-20-supabase-vercel-migration-design.md`

---

## File Structure

### New files

- `supabase/config.toml` — Supabase CLI config, links the repo to the shared project
- `supabase/migrations/ara_eval_001_init_tables.sql` — creates the 4 tables
- `supabase/migrations/ara_eval_002_enable_rls.sql` — enables RLS and adds policies
- `web/src/lib/supabase-server.ts` — `createServerClient()` cookie-aware helper for API routes and server components
- `web/src/lib/supabase-client.ts` — `createBrowserClient()` lazy singleton for client components
- `web/src/lib/auth.ts` — `ensureAnonymousSession()`, `signInWithGoogle()`, `signOut()` helpers
- `web/src/lib/db-sqlite.ts` — existing `db.ts` content moved here, functions marked `async`
- `web/src/lib/db-supabase.ts` — new driver using `@supabase/supabase-js`
- `web/src/middleware.ts` — Next.js middleware that bootstraps anon session on first request
- `web/src/components/AuthButton.tsx` — sign-in / sign-out UI, lives in the layout
- `web/src/app/auth/callback/route.ts` — OAuth callback handler for Google sign-in
- `web/src/__tests__/db-driver-selection.test.ts` — verifies the shim picks the right driver

### Modified files

- `web/src/lib/db.ts` — becomes a thin driver-selection shim that re-exports from one of the two drivers
- `web/src/app/layout.tsx` — imports and renders `AuthButton` in a header
- `web/src/app/api/chat/route.ts` — `await` every db call
- `web/src/app/api/evaluate/route.ts` — `await` every db call
- `web/src/app/api/runs/route.ts` — `await` every db call
- `web/src/app/api/requests/route.ts` — `await` every db call
- `web/package.json` — add `@supabase/supabase-js` and `@supabase/ssr` deps
- `web/.env.local.example` (create if missing) — document new env vars
- `.gitignore` — ensure `supabase/.temp/` is ignored (Supabase CLI local state)

### Unchanged (deliberately)

- `ara_eval/core.py`, `labs/*.py`, `results/ara-eval.db` — Python lab flow stays SQLite-based
- `web/Dockerfile`, `railway.json` — kept for self-hosters
- `web/src/app/api/scenarios/route.ts`, `api/reference/route.ts`, `api/prompt/route.ts`, `api/agent-prompt/route.ts` — read from bundled files, no DB
- `web/src/__tests__/gating.test.ts` — pure-function logic, no DB touch

---

## Task 1: Prerequisites (user-side setup, no code)

**Files:** none — operational setup only.

- [ ] **Step 1: Create / identify shared Supabase project**

If photocritic-site already has a Supabase project provisioned, use the same one. Otherwise create a new Supabase project at supabase.com. Note the project ref (e.g. `abcd1234efgh`).

- [ ] **Step 2: Install Supabase CLI**

Run: `brew install supabase/tap/supabase` (or platform equivalent from https://supabase.com/docs/guides/cli).

Verify: `supabase --version` prints a version.

- [ ] **Step 3: Enable anonymous sign-ins**

In Supabase dashboard → Authentication → Settings → toggle on **"Allow anonymous sign-ins"**.

- [ ] **Step 4: Configure Google OAuth**

- In Google Cloud Console, create a new OAuth 2.0 Client ID of type "Web application".
- Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Copy client ID and client secret.
- In Supabase dashboard → Authentication → Providers → Google: toggle on, paste client ID and secret, save.

- [ ] **Step 5: Collect Supabase keys**

From Supabase dashboard → Project Settings → API:
- Project URL (e.g. `https://<ref>.supabase.co`)
- `anon` public key
- `service_role` secret key

- [ ] **Step 6: Commit**

Nothing to commit yet. Move on.

---

## Task 2: Install dependencies and scaffold supabase/ directory

**Files:**
- Modify: `web/package.json`
- Create: `supabase/config.toml`
- Modify: `.gitignore`

- [ ] **Step 1: Install Supabase JS packages**

Run from `web/`:
```bash
cd web
npm install @supabase/supabase-js @supabase/ssr
```

Expected: `package.json` dependencies now include both packages. `package-lock.json` updated.

- [ ] **Step 2: Initialize Supabase directory**

Run from repo root:
```bash
supabase init
```

This creates `supabase/config.toml` and `supabase/.gitignore`.

- [ ] **Step 3: Link to the shared project**

Run from repo root:
```bash
supabase link --project-ref <project-ref>
```

Enter the database password when prompted. This writes `supabase/.temp/project-ref`.

- [ ] **Step 4: Add `supabase/.temp/` to `.gitignore`** (if not already ignored)

Inspect `.gitignore`. If no entry covers `supabase/.temp/`, add:
```
supabase/.temp/
```

- [ ] **Step 5: Verify link**

Run: `supabase db remote list`

Expected: prints the linked project without errors.

- [ ] **Step 6: Commit**

```bash
git add web/package.json web/package-lock.json supabase/config.toml supabase/.gitignore .gitignore
git commit -m "chore: install Supabase deps and scaffold supabase/ directory"
```

---

## Task 3: Create and apply tables migration

**Files:**
- Create: `supabase/migrations/ara_eval_001_init_tables.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/ara_eval_001_init_tables.sql` with exactly this content:

```sql
-- ara-eval: initial table schema
-- Namespaced with ara_ prefix to avoid collision with photocritic-site tables
-- in the shared Supabase project.

CREATE TABLE ara_eval_runs (
    run_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    model_requested TEXT NOT NULL,
    scenario_count INTEGER NOT NULL,
    personality_count INTEGER NOT NULL,
    total_calls INTEGER NOT NULL DEFAULT 0,
    successful_calls INTEGER NOT NULL DEFAULT 0,
    failed_calls INTEGER NOT NULL DEFAULT 0,
    total_input_tokens INTEGER NOT NULL DEFAULT 0,
    total_output_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    python_version TEXT,
    metadata JSONB
);
CREATE INDEX idx_ara_eval_runs_user ON ara_eval_runs (user_id, started_at DESC);

CREATE TABLE ara_ai_provider_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    run_id TEXT NOT NULL REFERENCES ara_eval_runs(run_id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    request_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_requested TEXT NOT NULL,
    model_used TEXT,
    actual_provider TEXT,
    use_case TEXT NOT NULL,
    scenario_id TEXT,
    personality TEXT,
    response_status INTEGER,
    error_message TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd DOUBLE PRECISION,
    response_time_ms INTEGER,
    fingerprint_string TEXT,
    gating_classification TEXT,
    gating_rules_triggered JSONB,
    raw_request JSONB,
    raw_response JSONB,
    parsed_result JSONB,
    openrouter_id TEXT,
    system_fingerprint TEXT,
    jurisdiction TEXT,
    rubric TEXT
);
CREATE INDEX idx_ara_ai_provider_requests_run ON ara_ai_provider_requests (run_id);
CREATE INDEX idx_ara_ai_provider_requests_request ON ara_ai_provider_requests (request_id);
CREATE INDEX idx_ara_ai_provider_requests_scenario ON ara_ai_provider_requests (scenario_id);
CREATE INDEX idx_ara_ai_provider_requests_scenario_personality ON ara_ai_provider_requests (scenario_id, personality);
CREATE INDEX idx_ara_ai_provider_requests_user ON ara_ai_provider_requests (user_id, created_at DESC);

CREATE TABLE ara_chat_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    model TEXT NOT NULL,
    initial_personality TEXT NOT NULL,
    initial_jurisdiction TEXT NOT NULL,
    initial_rubric TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    context_changes INTEGER NOT NULL DEFAULT 0,
    metadata JSONB
);
CREATE INDEX idx_ara_chat_sessions_user ON ara_chat_sessions (user_id, started_at DESC);

CREATE TABLE ara_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES ara_chat_sessions(session_id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    personality TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    rubric TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    response_time_ms INTEGER
);
CREATE INDEX idx_ara_chat_messages_session ON ara_chat_messages (session_id, created_at ASC);
CREATE INDEX idx_ara_chat_messages_user ON ara_chat_messages (user_id, created_at DESC);
```

- [ ] **Step 2: Apply the migration**

Run from repo root:
```bash
supabase db push
```

Expected: "Applying migration ara_eval_001_init_tables.sql ... done" and no errors.

- [ ] **Step 3: Verify tables exist**

Run:
```bash
supabase db remote commit --dry-run
```
(should show no pending schema changes — our local matches remote)

Or via psql:
```bash
supabase db psql --remote -c "\dt ara_*"
```

Expected: lists `ara_eval_runs`, `ara_ai_provider_requests`, `ara_chat_sessions`, `ara_chat_messages`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/ara_eval_001_init_tables.sql
git commit -m "feat(db): add ara-eval tables to shared Supabase project"
```

---

## Task 4: Create and apply RLS migration

**Files:**
- Create: `supabase/migrations/ara_eval_002_enable_rls.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/ara_eval_002_enable_rls.sql` with exactly this content:

```sql
-- ara-eval: row-level security
-- Every table scoped to auth.uid() = user_id. Anonymous users have a real
-- auth.uid() thanks to signInAnonymously(), so the same policies apply to
-- guests and signed-in users uniformly. No DELETE policy: audit rows are
-- immutable.

ALTER TABLE ara_eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ara_ai_provider_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ara_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ara_chat_messages ENABLE ROW LEVEL SECURITY;

-- ara_eval_runs
CREATE POLICY "ara_eval_runs_select_own" ON ara_eval_runs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_eval_runs_insert_own" ON ara_eval_runs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_eval_runs_update_own" ON ara_eval_runs
    FOR UPDATE USING (auth.uid() = user_id);

-- ara_ai_provider_requests
CREATE POLICY "ara_ai_provider_requests_select_own" ON ara_ai_provider_requests
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_ai_provider_requests_insert_own" ON ara_ai_provider_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_ai_provider_requests_update_own" ON ara_ai_provider_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- ara_chat_sessions
CREATE POLICY "ara_chat_sessions_select_own" ON ara_chat_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_chat_sessions_insert_own" ON ara_chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_chat_sessions_update_own" ON ara_chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- ara_chat_messages
CREATE POLICY "ara_chat_messages_select_own" ON ara_chat_messages
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ara_chat_messages_insert_own" ON ara_chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ara_chat_messages_update_own" ON ara_chat_messages
    FOR UPDATE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`

Expected: "Applying migration ara_eval_002_enable_rls.sql ... done".

- [ ] **Step 3: Verify RLS enabled**

Run:
```bash
supabase db psql --remote -c "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'ara\\_%';"
```

Expected: all four tables show `rowsecurity = t`.

- [ ] **Step 4: Verify policies exist**

Run:
```bash
supabase db psql --remote -c "SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'ara\\_%' ORDER BY tablename, policyname;"
```

Expected: 12 rows (4 tables × 3 policies each).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/ara_eval_002_enable_rls.sql
git commit -m "feat(db): enable RLS on ara-eval tables, policies keyed on auth.uid()"
```

---

## Task 5: Document env vars and create .env.local.example

**Files:**
- Create (if missing): `web/.env.local.example`

- [ ] **Step 1: Write the example env file**

Create `web/.env.local.example`:

```bash
# Required for LLM calls (OpenRouter)
OPENROUTER_API_KEY=

# Optional: override the default model defined in ara_eval/core.py::DEFAULT_MODEL
# ARA_MODEL=openai/gpt-4o

# --- Supabase (optional for local dev; required for Vercel deploy) ---
# If any of these are unset, the web app uses SQLite at ../results/ara-eval.db
# (compatible with the Python labs' local flow). If NEXT_PUBLIC_SUPABASE_URL is
# set, the app switches to Supabase.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add web/.env.local.example
git commit -m "docs: add .env.local.example documenting Supabase env vars"
```

---

## Task 6: Supabase server-side client helper

**Files:**
- Create: `web/src/lib/supabase-server.ts`

- [ ] **Step 1: Write the helper**

Create `web/src/lib/supabase-server.ts`:

```ts
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-aware Supabase client for API routes and server components.
 * Reads/writes the auth session cookie so RLS policies (auth.uid()) work.
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore if middleware
            // refreshes sessions.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors related to `supabase-server.ts`.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/supabase-server.ts
git commit -m "feat(auth): add cookie-aware Supabase server client helper"
```

---

## Task 7: Supabase browser client helper

**Files:**
- Create: `web/src/lib/supabase-client.ts`

- [ ] **Step 1: Write the helper**

Create `web/src/lib/supabase-client.ts`:

```ts
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _instance: SupabaseClient | null = null;

/**
 * Browser-side Supabase client. Lazy singleton. Must only be imported from
 * client components ("use client").
 */
export function getBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "supabase-client.ts must only be imported in client components",
    );
  }
  if (!_instance) {
    _instance = createSSRBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _instance;
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors related to `supabase-client.ts`.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/supabase-client.ts
git commit -m "feat(auth): add lazy Supabase browser client singleton"
```

---

## Task 8: Middleware for anonymous session bootstrap

**Files:**
- Create: `web/src/middleware.ts`

- [ ] **Step 1: Write middleware**

Create `web/src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient as createSSRClient } from "@supabase/ssr";

/**
 * Bootstraps an anonymous Supabase session on first visit (and refreshes
 * existing sessions on every request). Skips when Supabase env vars are
 * absent (local SQLite mode) or on static/public asset requests.
 */
export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Local SQLite mode — skip entirely
  if (!supabaseUrl || !anonKey) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createSSRClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh session if expired; creates an anon session on first visit.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes EXCEPT static assets, Next internals, and the OAuth
    // callback (it does its own session handling).
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Manual verify (skip if no Supabase env yet)**

With `NEXT_PUBLIC_SUPABASE_URL` set in `.env.local`, run `npm run dev` and open `http://localhost:3000` in a fresh private browser. Open DevTools → Application → Cookies. You should see `sb-<project-ref>-auth-token` cookies set automatically.

- [ ] **Step 4: Commit**

```bash
git add web/src/middleware.ts
git commit -m "feat(auth): bootstrap anonymous Supabase sessions via middleware"
```

---

## Task 9: Auth helpers (client-side)

**Files:**
- Create: `web/src/lib/auth.ts`

- [ ] **Step 1: Write helpers**

Create `web/src/lib/auth.ts`:

```ts
"use client";

import { getBrowserClient } from "./supabase-client";

/**
 * Sign in with Google. If the current user is anonymous, link the Google
 * identity to the existing anon user (preserves history). If linking fails
 * because the Google account is already linked to a different Supabase user,
 * fall back to signInWithOAuth and accept orphaning the anon session.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = `${window.location.origin}/auth/callback`;

  if (user?.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo },
    });
    if (!error) return {};

    // Collision: Google identity already linked to another user. Fall back
    // to OAuth sign-in; the existing account takes over.
    const fallback = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (fallback.error) return { error: fallback.error.message };
    return {};
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return { error: error.message };
  return {};
}

export async function signOut(): Promise<void> {
  const supabase = getBrowserClient();
  await supabase.auth.signOut();
  // Reload so middleware creates a fresh anon session on next request.
  window.location.href = "/";
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/auth.ts
git commit -m "feat(auth): add signInWithGoogle (with anon-link fallback) and signOut helpers"
```

---

## Task 10: OAuth callback route

**Files:**
- Create: `web/src/app/auth/callback/route.ts`

- [ ] **Step 1: Write the callback handler**

Create `web/src/app/auth/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

/**
 * OAuth redirect destination. Exchanges the `code` query param for a session
 * and redirects the user back to the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/auth/callback/route.ts
git commit -m "feat(auth): add OAuth callback route to exchange code for session"
```

---

## Task 11: AuthButton UI component

**Files:**
- Create: `web/src/components/AuthButton.tsx`

- [ ] **Step 1: Write the component**

Create `web/src/components/AuthButton.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase-client";
import { signInWithGoogle, signOut } from "@/lib/auth";

type UserState =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "authed"; email: string }
  | { kind: "none" };

export function AuthButton() {
  const [state, setState] = useState<UserState>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setState({ kind: "none" });
      if (user.is_anonymous) return setState({ kind: "anonymous" });
      return setState({
        kind: "authed",
        email: user.email ?? "signed in",
      });
    }

    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSignIn() {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  }

  if (state.kind === "loading") return null;

  if (state.kind === "authed") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>{state.email}</span>
        <button
          onClick={signOut}
          className="rounded px-2 py-1 hover:bg-gray-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  // anonymous or none
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={handleSignIn}
        className="rounded bg-white px-3 py-1 font-medium text-gray-900 hover:bg-gray-200"
        title="Save your sessions across devices"
      >
        Sign in with Google
      </button>
      {error && <span className="text-red-400">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/AuthButton.tsx
git commit -m "feat(auth): add AuthButton component (sign-in / sign-out UI)"
```

---

## Task 12: Integrate AuthButton into root layout

**Files:**
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Replace `web/src/app/layout.tsx` with the new version**

Replace the entire file contents with:

```tsx
import type { Metadata } from "next";
import { AuthButton } from "@/components/AuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARA-Eval — Agentic Readiness Assessment",
  description:
    "Evaluate when enterprises can safely deploy autonomous AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <header className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
          <a href="/" className="text-sm font-semibold text-gray-200">
            ARA-Eval
          </a>
          <AuthButton />
        </header>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/layout.tsx
git commit -m "feat(ui): render AuthButton in root layout header"
```

---

## Task 13: Rename db.ts → db-sqlite.ts, make functions async

**Files:**
- Rename: `web/src/lib/db.ts` → `web/src/lib/db-sqlite.ts`
- All functions in `db-sqlite.ts` change to `async` / `Promise<T>` return types.

- [ ] **Step 1: Rename the file**

```bash
git mv web/src/lib/db.ts web/src/lib/db-sqlite.ts
```

- [ ] **Step 2: Convert every exported function to async**

Open `web/src/lib/db-sqlite.ts` and change the signature of every exported function. The function bodies remain unchanged — we only prepend `async` and wrap return types in `Promise<T>`.

Specifically, change each of these signatures:

```ts
// BEFORE → AFTER

// export function createRun(...): string {
export async function createRun(...): Promise<string> {

// export function updateRun(...): void {
export async function updateRun(...): Promise<void> {

// export function logRequest(...): void {
export async function logRequest(...): Promise<void> {

// export function listRuns(limit: number = 50): RunSummary[] {
export async function listRuns(limit: number = 50): Promise<RunSummary[]> {

// export function getRun(runId: string): RunSummary | undefined {
export async function getRun(runId: string): Promise<RunSummary | undefined> {

// export function listRequests(filters?: {...}): RequestRow[] {
export async function listRequests(filters?: {...}): Promise<RequestRow[]> {

// export function getRequest(id: string): RequestRow | undefined {
export async function getRequest(id: string): Promise<RequestRow | undefined> {

// export function getRunRequests(runId: string): RequestRow[] {
export async function getRunRequests(runId: string): Promise<RequestRow[]> {

// export function createChatSession(params: {...}): void {
export async function createChatSession(params: {...}): Promise<void> {

// export function addChatMessage(params: {...}): string {
export async function addChatMessage(params: {...}): Promise<string> {

// export function updateSessionContextChanges(sessionId: string): void {
export async function updateSessionContextChanges(sessionId: string): Promise<void> {

// export function listChatSessions(limit: number = 50): ChatSession[] {
export async function listChatSessions(limit: number = 50): Promise<ChatSession[]> {

// export function getChatSession(sessionId: string): ChatSession | undefined {
export async function getChatSession(sessionId: string): Promise<ChatSession | undefined> {

// export function getChatMessages(sessionId: string): ChatMessage[] {
export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
```

The function bodies use synchronous better-sqlite3 calls; inside an `async` function these still work — the return value is wrapped in a Promise automatically.

Leave the internal helper `getDb()` and `initDb(db)` unchanged (they're not exported as async).

- [ ] **Step 3: Build to verify type shape**

Run from `web/`: `npx tsc --noEmit`

Expected: errors in the four API route files (`chat`, `evaluate`, `runs`, `requests`) because they call the now-async functions without `await`. This is expected — we fix them in Task 15.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/db-sqlite.ts
git commit -m "refactor(db): rename db.ts -> db-sqlite.ts, mark exports async

Functions wrap their existing synchronous better-sqlite3 calls; the async
keyword only changes the return type to Promise<T>. Call sites will be
updated in the next commits."
```

---

## Task 14: Create db.ts driver-selection shim

**Files:**
- Create: `web/src/lib/db.ts`

- [ ] **Step 1: Write the shim**

Create `web/src/lib/db.ts`:

```ts
/**
 * DB driver shim. Picks SQLite or Supabase at import time based on whether
 * NEXT_PUBLIC_SUPABASE_URL is set. Re-exports the chosen driver's API.
 *
 * Local student dev (no Supabase env) -> db-sqlite (reads
 * ../results/ara-eval.db, shared with the Python labs).
 * Vercel deploy (Supabase env set) -> db-supabase.
 */

const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export * from "./db-sqlite";
// Supabase driver added in Tasks 16-18; re-export below when ready.
// For now, anyone with NEXT_PUBLIC_SUPABASE_URL set will still hit SQLite.
// The shim will be updated to conditionally re-export db-supabase once
// db-supabase.ts exists.

if (useSupabase && typeof window === "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[db] NEXT_PUBLIC_SUPABASE_URL is set but db-supabase is not yet wired in. Falling back to SQLite.",
  );
}
```

Note: we intentionally leave this as SQLite-only for now. Task 19 will replace this file with the actual driver switch once `db-supabase.ts` exists. This ordering lets the codebase keep compiling between tasks.

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: same errors as before (API routes missing `await`) — no *new* errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/db.ts
git commit -m "refactor(db): add db.ts shim re-exporting db-sqlite (driver switch stubbed)"
```

---

## Task 15: Add `await` to all DB calls in API routes

**Files:**
- Modify: `web/src/app/api/evaluate/route.ts`
- Modify: `web/src/app/api/chat/route.ts`
- Modify: `web/src/app/api/runs/route.ts`
- Modify: `web/src/app/api/requests/route.ts`

- [ ] **Step 1: Update `api/evaluate/route.ts`**

In `web/src/app/api/evaluate/route.ts`, prepend `await` to each of these three call sites (see lines ~53, ~90, ~119, ~144 in the current file):

```ts
// Line ~53
const runId = await createRun(model, 1, personalityIds.length, totalCalls, {...});

// Lines ~90 (inside try) and ~119 (inside catch) — both logRequest calls:
await logRequest({...});

// Line ~144
await updateRun(runId, {...});
```

- [ ] **Step 2: Update `api/chat/route.ts`**

In `web/src/app/api/chat/route.ts`, prepend `await` to each of these call sites (lines ~92, ~103, ~112, ~116, ~179 in the current file):

```ts
// Line ~92
if (isNewSession) {
  await createChatSession({...});
}

// Line ~103
if (contextChange) {
  await addChatMessage({...});
  await updateSessionContextChanges(sessionId);
}

// Line ~116
await addChatMessage({...});  // user message

// Line ~179
await addChatMessage({...});  // assistant message
```

- [ ] **Step 3: Update `api/runs/route.ts`**

Replace the `GET` handler body:

```ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("id");

  if (runId) {
    const run = await getRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const requests = await getRunRequests(runId);
    return NextResponse.json({ run, requests });
  }

  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const runs = await listRuns(limit);
  return NextResponse.json({ runs });
}
```

- [ ] **Step 4: Update `api/requests/route.ts`**

Replace the `GET` handler body:

```ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const row = await getRequest(id);
    if (!row) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ request: row });
  }

  const filters = {
    runId: searchParams.get("runId") || undefined,
    scenarioId: searchParams.get("scenarioId") || undefined,
    personality: searchParams.get("personality") || undefined,
    limit: parseInt(searchParams.get("limit") || "100", 10),
  };

  const requests = await listRequests(filters);
  return NextResponse.json({ requests });
}
```

- [ ] **Step 5: Build to verify**

Run from `web/`: `npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 6: Run existing tests**

Run from `web/`: `npm test`

Expected: `gating.test.ts` passes (unchanged behavior).

- [ ] **Step 7: Manual smoke test (SQLite path)**

Run from `web/`: `npm run dev`

Open `http://localhost:3000/chat`, send a message. Verify it works and no errors in the terminal or browser console. Verify the row landed in `../results/ara-eval.db` via:

```bash
sqlite3 ../results/ara-eval.db "SELECT session_id, role, content FROM chat_messages ORDER BY created_at DESC LIMIT 3;"
```

- [ ] **Step 8: Commit**

```bash
git add web/src/app/api/evaluate/route.ts web/src/app/api/chat/route.ts web/src/app/api/runs/route.ts web/src/app/api/requests/route.ts
git commit -m "refactor(api): await db calls (SQLite driver now returns Promises)"
```

---

## Task 16: db-supabase — eval runs functions

**Files:**
- Create: `web/src/lib/db-supabase.ts` (first pass — eval runs only)

- [ ] **Step 1: Write initial driver with eval-runs functions**

Create `web/src/lib/db-supabase.ts`:

```ts
import type { EvaluationResult } from "./constants";
import { createServerClient } from "./supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// --- Types (mirror db-sqlite.ts) ---

export interface RunSummary {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  model_requested: string;
  scenario_count: number;
  personality_count: number;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  metadata: string | null;
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No authenticated user (anonymous session missing).");
  }
  return user.id;
}

function metadataToString(m: Record<string, unknown> | null): string | null {
  return m ? JSON.stringify(m) : null;
}

// --- Eval runs ---

export async function createRun(
  model: string,
  scenarioCount: number,
  personalityCount: number,
  totalCalls: number,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);
  const runId = randomUUID();

  const { error } = await supabase.from("ara_eval_runs").insert({
    run_id: runId,
    user_id: userId,
    model_requested: model,
    scenario_count: scenarioCount,
    personality_count: personalityCount,
    total_calls: totalCalls,
    metadata: metadata ?? null,
  });
  if (error) throw new Error(`createRun: ${error.message}`);
  return runId;
}

export async function updateRun(
  runId: string,
  updates: {
    finished_at?: string;
    successful_calls?: number;
    failed_calls?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_cost_usd?: number;
    total_duration_ms?: number;
  },
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("ara_eval_runs")
    .update(updates)
    .eq("run_id", runId);
  if (error) throw new Error(`updateRun: ${error.message}`);
}

export async function listRuns(limit: number = 50): Promise<RunSummary[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_eval_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRuns: ${error.message}`);
  return (data ?? []).map(rowToRunSummary);
}

export async function getRun(runId: string): Promise<RunSummary | undefined> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_eval_runs")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) throw new Error(`getRun: ${error.message}`);
  return data ? rowToRunSummary(data) : undefined;
}

function rowToRunSummary(row: Record<string, unknown>): RunSummary {
  return {
    run_id: row.run_id as string,
    started_at: row.started_at as string,
    finished_at: (row.finished_at as string | null) ?? null,
    model_requested: row.model_requested as string,
    scenario_count: row.scenario_count as number,
    personality_count: row.personality_count as number,
    total_calls: row.total_calls as number,
    successful_calls: row.successful_calls as number,
    failed_calls: row.failed_calls as number,
    total_input_tokens: row.total_input_tokens as number,
    total_output_tokens: row.total_output_tokens as number,
    total_cost_usd: row.total_cost_usd as number,
    total_duration_ms: row.total_duration_ms as number,
    metadata: metadataToString(
      row.metadata as Record<string, unknown> | null,
    ),
  };
}

// Stubs — filled in by Tasks 17 and 18. Typed so `export *` from db.ts compiles.

export async function logRequest(_params: {
  runId: string;
  requestId: string;
  scenarioId: string;
  personality: string;
  model: string;
  responseStatus: number | null;
  errorMessage: string | null;
  result: EvaluationResult | null;
  rawRequest: unknown;
  rawResponse: unknown;
  jurisdiction: string;
  rubric: string;
}): Promise<void> {
  throw new Error("db-supabase.logRequest not yet implemented");
}

export interface RequestRow {
  id: string;
  created_at: string;
  run_id: string;
  request_id: string;
  model_requested: string;
  model_used: string | null;
  scenario_id: string | null;
  personality: string | null;
  response_status: number | null;
  error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  response_time_ms: number | null;
  fingerprint_string: string | null;
  gating_classification: string | null;
  gating_rules_triggered: string | null;
  raw_request: string | null;
  raw_response: string | null;
  parsed_result: string | null;
  jurisdiction: string | null;
  rubric: string | null;
}

export async function listRequests(_filters?: {
  runId?: string;
  scenarioId?: string;
  personality?: string;
  limit?: number;
}): Promise<RequestRow[]> {
  throw new Error("db-supabase.listRequests not yet implemented");
}
export async function getRequest(
  _id: string,
): Promise<RequestRow | undefined> {
  throw new Error("db-supabase.getRequest not yet implemented");
}
export async function getRunRequests(
  _runId: string,
): Promise<RequestRow[]> {
  throw new Error("db-supabase.getRunRequests not yet implemented");
}

export interface ChatSession {
  session_id: string;
  started_at: string;
  model: string;
  initial_personality: string;
  initial_jurisdiction: string;
  initial_rubric: string;
  message_count: number;
  context_changes: number;
  metadata: string | null;
}
export interface ChatMessage {
  id: string;
  session_id: string;
  created_at: string;
  role: string;
  content: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  response_time_ms: number | null;
}

export async function createChatSession(_params: {
  sessionId: string;
  model: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
}): Promise<void> {
  throw new Error("db-supabase.createChatSession not yet implemented");
}
export async function addChatMessage(_params: {
  sessionId: string;
  role: string;
  content: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  responseTimeMs?: number | null;
}): Promise<string> {
  throw new Error("db-supabase.addChatMessage not yet implemented");
}
export async function updateSessionContextChanges(
  _sessionId: string,
): Promise<void> {
  throw new Error(
    "db-supabase.updateSessionContextChanges not yet implemented",
  );
}
export async function listChatSessions(
  _limit: number = 50,
): Promise<ChatSession[]> {
  throw new Error("db-supabase.listChatSessions not yet implemented");
}
export async function getChatSession(
  _sessionId: string,
): Promise<ChatSession | undefined> {
  throw new Error("db-supabase.getChatSession not yet implemented");
}
export async function getChatMessages(
  _sessionId: string,
): Promise<ChatMessage[]> {
  throw new Error("db-supabase.getChatMessages not yet implemented");
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/db-supabase.ts
git commit -m "feat(db): add db-supabase.ts with eval runs implementations (others stubbed)"
```

---

## Task 17: db-supabase — request log functions

**Files:**
- Modify: `web/src/lib/db-supabase.ts`

- [ ] **Step 1: Replace the four `logRequest`/`listRequests`/`getRequest`/`getRunRequests` stubs**

Replace the stub block in `db-supabase.ts` (the four functions currently throwing `... not yet implemented`) with:

```ts
export async function logRequest(params: {
  runId: string;
  requestId: string;
  scenarioId: string;
  personality: string;
  model: string;
  responseStatus: number | null;
  errorMessage: string | null;
  result: EvaluationResult | null;
  rawRequest: unknown;
  rawResponse: unknown;
  jurisdiction: string;
  rubric: string;
}): Promise<void> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);
  const r = params.result;

  const { error } = await supabase.from("ara_ai_provider_requests").insert({
    run_id: params.runId,
    user_id: userId,
    request_id: params.requestId,
    provider: "openrouter",
    model_requested: params.model,
    model_used: r?.model_used ?? null,
    actual_provider: null,
    use_case: "risk_fingerprinting",
    scenario_id: params.scenarioId,
    personality: params.personality,
    response_status: params.responseStatus,
    error_message: params.errorMessage,
    input_tokens: r?.usage.input_tokens ?? null,
    output_tokens: r?.usage.output_tokens ?? null,
    total_tokens: r?.usage.total_tokens ?? null,
    cost_usd: r?.cost ?? null,
    response_time_ms: r?.response_time_ms ?? null,
    fingerprint_string: r?.gating.fingerprint_string ?? null,
    gating_classification: r?.gating.classification ?? null,
    gating_rules_triggered: r?.gating.triggered_rules ?? null,
    raw_request: params.rawRequest,
    raw_response: params.rawResponse ?? null,
    parsed_result: r?.parsed ?? null,
    openrouter_id: null,
    system_fingerprint: null,
    jurisdiction: params.jurisdiction,
    rubric: params.rubric,
  });
  if (error) throw new Error(`logRequest: ${error.message}`);
}

export async function listRequests(filters?: {
  runId?: string;
  scenarioId?: string;
  personality?: string;
  limit?: number;
}): Promise<RequestRow[]> {
  const supabase = await createServerClient();
  let q = supabase.from("ara_ai_provider_requests").select("*");
  if (filters?.runId) q = q.eq("run_id", filters.runId);
  if (filters?.scenarioId) q = q.eq("scenario_id", filters.scenarioId);
  if (filters?.personality) q = q.eq("personality", filters.personality);
  q = q.order("created_at", { ascending: false }).limit(filters?.limit ?? 100);

  const { data, error } = await q;
  if (error) throw new Error(`listRequests: ${error.message}`);
  return (data ?? []).map(rowToRequestRow);
}

export async function getRequest(
  id: string,
): Promise<RequestRow | undefined> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_ai_provider_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getRequest: ${error.message}`);
  return data ? rowToRequestRow(data) : undefined;
}

export async function getRunRequests(runId: string): Promise<RequestRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_ai_provider_requests")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getRunRequests: ${error.message}`);
  return (data ?? []).map(rowToRequestRow);
}

function rowToRequestRow(row: Record<string, unknown>): RequestRow {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    run_id: row.run_id as string,
    request_id: row.request_id as string,
    model_requested: row.model_requested as string,
    model_used: (row.model_used as string | null) ?? null,
    scenario_id: (row.scenario_id as string | null) ?? null,
    personality: (row.personality as string | null) ?? null,
    response_status: (row.response_status as number | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    input_tokens: (row.input_tokens as number | null) ?? null,
    output_tokens: (row.output_tokens as number | null) ?? null,
    total_tokens: (row.total_tokens as number | null) ?? null,
    cost_usd: (row.cost_usd as number | null) ?? null,
    response_time_ms: (row.response_time_ms as number | null) ?? null,
    fingerprint_string: (row.fingerprint_string as string | null) ?? null,
    gating_classification:
      (row.gating_classification as string | null) ?? null,
    gating_rules_triggered: row.gating_rules_triggered
      ? JSON.stringify(row.gating_rules_triggered)
      : null,
    raw_request: row.raw_request ? JSON.stringify(row.raw_request) : null,
    raw_response: row.raw_response ? JSON.stringify(row.raw_response) : null,
    parsed_result: row.parsed_result
      ? JSON.stringify(row.parsed_result)
      : null,
    jurisdiction: (row.jurisdiction as string | null) ?? null,
    rubric: (row.rubric as string | null) ?? null,
  };
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/db-supabase.ts
git commit -m "feat(db): implement logRequest/listRequests/getRequest/getRunRequests in db-supabase"
```

---

## Task 18: db-supabase — chat functions

**Files:**
- Modify: `web/src/lib/db-supabase.ts`

- [ ] **Step 1: Replace the six chat stubs**

Replace the six chat stubs (`createChatSession`, `addChatMessage`, `updateSessionContextChanges`, `listChatSessions`, `getChatSession`, `getChatMessages`) with real implementations:

```ts
export async function createChatSession(params: {
  sessionId: string;
  model: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
}): Promise<void> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("ara_chat_sessions").insert({
    session_id: params.sessionId,
    user_id: userId,
    model: params.model,
    initial_personality: params.personality,
    initial_jurisdiction: params.jurisdiction,
    initial_rubric: params.rubric,
  });
  if (error) throw new Error(`createChatSession: ${error.message}`);
}

export async function addChatMessage(params: {
  sessionId: string;
  role: string;
  content: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  responseTimeMs?: number | null;
}): Promise<string> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);
  const id = randomUUID();

  const { error: insErr } = await supabase.from("ara_chat_messages").insert({
    id,
    session_id: params.sessionId,
    user_id: userId,
    role: params.role,
    content: params.content,
    personality: params.personality,
    jurisdiction: params.jurisdiction,
    rubric: params.rubric,
    model: params.model,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    response_time_ms: params.responseTimeMs ?? null,
  });
  if (insErr) throw new Error(`addChatMessage: ${insErr.message}`);

  // Update session message_count (exclude system messages, matching SQLite).
  const { count } = await supabase
    .from("ara_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", params.sessionId)
    .neq("role", "system");

  if (count !== null) {
    await supabase
      .from("ara_chat_sessions")
      .update({ message_count: count })
      .eq("session_id", params.sessionId);
  }

  return id;
}

export async function updateSessionContextChanges(
  sessionId: string,
): Promise<void> {
  const supabase = await createServerClient();

  const { count } = await supabase
    .from("ara_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("role", "system");

  const { error } = await supabase
    .from("ara_chat_sessions")
    .update({ context_changes: count ?? 0 })
    .eq("session_id", sessionId);
  if (error) throw new Error(`updateSessionContextChanges: ${error.message}`);
}

export async function listChatSessions(
  limit: number = 50,
): Promise<ChatSession[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_chat_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listChatSessions: ${error.message}`);
  return (data ?? []).map(rowToChatSession);
}

export async function getChatSession(
  sessionId: string,
): Promise<ChatSession | undefined> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_chat_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`getChatSession: ${error.message}`);
  return data ? rowToChatSession(data) : undefined;
}

export async function getChatMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getChatMessages: ${error.message}`);
  return (data ?? []).map(rowToChatMessage);
}

function rowToChatSession(row: Record<string, unknown>): ChatSession {
  return {
    session_id: row.session_id as string,
    started_at: row.started_at as string,
    model: row.model as string,
    initial_personality: row.initial_personality as string,
    initial_jurisdiction: row.initial_jurisdiction as string,
    initial_rubric: row.initial_rubric as string,
    message_count: row.message_count as number,
    context_changes: row.context_changes as number,
    metadata: metadataToString(
      row.metadata as Record<string, unknown> | null,
    ),
  };
}

function rowToChatMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    created_at: row.created_at as string,
    role: row.role as string,
    content: row.content as string,
    personality: row.personality as string,
    jurisdiction: row.jurisdiction as string,
    rubric: row.rubric as string,
    model: row.model as string,
    input_tokens: (row.input_tokens as number | null) ?? null,
    output_tokens: (row.output_tokens as number | null) ?? null,
    response_time_ms: (row.response_time_ms as number | null) ?? null,
  };
}
```

- [ ] **Step 2: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/db-supabase.ts
git commit -m "feat(db): implement chat functions in db-supabase"
```

---

## Task 19: Wire up the driver switch in db.ts

**Files:**
- Modify: `web/src/lib/db.ts`
- Create: `web/src/__tests__/db-driver-selection.test.ts`

- [ ] **Step 1: Write the failing test**

Create `web/src/__tests__/db-driver-selection.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("db driver selection", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
    }
  });

  it("uses db-sqlite when NEXT_PUBLIC_SUPABASE_URL is absent", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const db = await import("@/lib/db");
    const sqlite = await import("@/lib/db-sqlite");
    // Identity check: db.createRun should be the same function ref as db-sqlite.createRun
    expect(db.createRun).toBe(sqlite.createRun);
  });

  it("uses db-supabase when NEXT_PUBLIC_SUPABASE_URL is present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const db = await import("@/lib/db");
    const supa = await import("@/lib/db-supabase");
    expect(db.createRun).toBe(supa.createRun);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from `web/`: `npx vitest run src/__tests__/db-driver-selection.test.ts`

Expected: the Supabase case fails because the current `db.ts` re-exports only from `db-sqlite`.

- [ ] **Step 3: Replace `web/src/lib/db.ts` with the real switch**

Overwrite `web/src/lib/db.ts`:

```ts
/**
 * DB driver shim. Picks SQLite or Supabase based on whether
 * NEXT_PUBLIC_SUPABASE_URL is set. Re-exports the chosen driver's API.
 *
 * Local student dev (no Supabase env) -> db-sqlite (shared with Python labs).
 * Vercel deploy (Supabase env set) -> db-supabase.
 */
import * as sqliteDriver from "./db-sqlite";
import * as supabaseDriver from "./db-supabase";

const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const driver = useSupabase ? supabaseDriver : sqliteDriver;

// Re-export every function the callers use. Both drivers export identical
// signatures; the cast just tells TypeScript we've picked one.
export const createRun = driver.createRun;
export const updateRun = driver.updateRun;
export const logRequest = driver.logRequest;
export const listRuns = driver.listRuns;
export const getRun = driver.getRun;
export const listRequests = driver.listRequests;
export const getRequest = driver.getRequest;
export const getRunRequests = driver.getRunRequests;
export const createChatSession = driver.createChatSession;
export const addChatMessage = driver.addChatMessage;
export const updateSessionContextChanges = driver.updateSessionContextChanges;
export const listChatSessions = driver.listChatSessions;
export const getChatSession = driver.getChatSession;
export const getChatMessages = driver.getChatMessages;

export type { RunSummary, RequestRow, ChatSession, ChatMessage } from "./db-sqlite";
```

- [ ] **Step 4: Run tests to verify they pass**

Run from `web/`: `npx vitest run src/__tests__/db-driver-selection.test.ts`

Expected: both tests pass.

- [ ] **Step 5: Full test suite**

Run from `web/`: `npm test`

Expected: all tests pass (gating + driver selection).

- [ ] **Step 6: Type-check**

Run from `web/`: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/db.ts web/src/__tests__/db-driver-selection.test.ts
git commit -m "feat(db): wire db.ts to pick SQLite or Supabase driver based on env"
```

---

## Task 20: Local verification with Supabase path

**Files:** no code changes — verification task.

- [ ] **Step 1: Populate `.env.local` with Supabase keys**

In `web/.env.local`, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

(Existing `OPENROUTER_API_KEY` stays.)

- [ ] **Step 2: Start the dev server**

Run from `web/`: `npm run dev`

Open `http://localhost:3000` in a fresh private browser window.

- [ ] **Step 3: Verify anonymous session**

DevTools → Application → Cookies. Expect `sb-<ref>-auth-token` cookies set.

In Supabase dashboard → Authentication → Users: a new user with `Provider: anonymous` should appear.

- [ ] **Step 4: Send a chat message**

Go to `/chat`, send a message. Confirm the bot responds without errors.

In Supabase dashboard → Table Editor → `ara_chat_sessions` and `ara_chat_messages`: rows should appear scoped to the anon user.

- [ ] **Step 5: Run a risk fingerprinting eval**

From the home page (`/`), run an evaluation on a scenario. Check:
- `ara_eval_runs` has one new row
- `ara_ai_provider_requests` has rows for each personality

- [ ] **Step 6: Test Google sign-in**

Click "Sign in with Google" in the header. Complete the Google consent flow. You should be redirected back and the header should now show your email + "Sign out".

In Supabase dashboard → Authentication → Users: your user should now have `Provider: google` (same row, just upgraded). In Table Editor, your prior anon chat rows should still be associated with this user_id.

- [ ] **Step 7: Test sign-out and fresh anon session**

Click "Sign out". Browser should reload to `/`. Header shows "Sign in with Google" again. Send a new chat message — it lands under a *new* anon user (confirm in Supabase dashboard; the old Google-linked user is unchanged).

- [ ] **Step 8: No commit — verification only**

---

## Task 21: Deploy to Vercel

**Files:** no code changes — deployment task.

- [ ] **Step 1: Connect repo to Vercel**

From `vercel.com` → Add New → Project → import the ara-eval repo. Configure:
- Root Directory: `web`
- Framework Preset: Next.js
- Build Command: (default)
- Install Command: (default)

- [ ] **Step 2: Set environment variables**

In Vercel project settings → Environment Variables, add to both Production and Preview:

```
OPENROUTER_API_KEY = <your key>
NEXT_PUBLIC_SUPABASE_URL = https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon-key>
SUPABASE_SERVICE_ROLE_KEY = <service-role-key>
```

Mark `SUPABASE_SERVICE_ROLE_KEY` as **sensitive**. Do not mark the `NEXT_PUBLIC_*` keys sensitive (they need to be exposed to the client).

- [ ] **Step 3: Update Google OAuth redirect URIs**

In Google Cloud Console for the OAuth client, add the Vercel preview URL and production URL to the redirect list only if needed (Supabase's callback at `https://<project-ref>.supabase.co/auth/v1/callback` handles the actual OAuth redirect — the Vercel URL just needs to be in Supabase's "Site URL" / "Additional Redirect URLs" list).

In Supabase dashboard → Authentication → URL Configuration:
- Site URL: `https://<your-vercel-domain>`
- Additional redirect URLs: `https://<your-vercel-domain>/auth/callback`, plus any preview URLs.

- [ ] **Step 4: Trigger first deployment**

Push to `main` (or click Redeploy in Vercel). Watch the build log. Expected: build succeeds.

- [ ] **Step 5: Smoke test production**

Open the Vercel production URL. Verify:
- Anon session cookie set
- `/chat` works end-to-end
- Google sign-in works and redirects back to the production URL

- [ ] **Step 6: No commit — deployment task**

---

## Task 22: End-to-end acceptance test

**Files:** no code changes — final verification before declaring done.

Execute each check on the production Vercel deployment:

- [ ] **Check 1: Guest red-teaming flow**
  - Fresh browser → open site → go to `/chat` → start a red-team session → confirm bot responds → go to `/history` → confirm session appears.

- [ ] **Check 2: Guest risk fingerprinting flow**
  - From `/`, run an evaluation → receive the fingerprint → go to `/history` → confirm the run appears.

- [ ] **Check 3: Sign-in preserves history**
  - Still as guest, click "Sign in with Google" → complete flow → redirected back → confirm the prior chat session and eval run are still visible under your Google-authed identity.

- [ ] **Check 4: Cross-device continuity**
  - Open a second browser / device → sign in with Google → confirm your history is visible.

- [ ] **Check 5: Isolation between users**
  - In a fresh private browser, confirm you see an empty `/history` (not the signed-in user's data).

- [ ] **Check 6: Sign-out gives a fresh workspace**
  - From a signed-in session, click "Sign out" → reload → confirm `/history` is empty, new chat starts fresh.

- [ ] **Check 7: Local SQLite path still works**
  - On a dev machine, remove Supabase env vars from `web/.env.local`, run `npm run dev`, confirm `/chat` works against the local `results/ara-eval.db`.

- [ ] **Check 8: Labs still work**
  - Run `python labs/lab-01-risk-fingerprinting.py` from repo root. Confirm it writes to `results/ara-eval.db` (not Supabase).

- [ ] **Final commit: update README or a release note**

Optional — mention the Vercel deployment and Supabase dependency in `README.md` or `docs/`. Not required for closure.

```bash
# If making a README update:
git add README.md
git commit -m "docs: note Vercel + Supabase deployment target"
```

---

## Self-review notes (author)

- Every spec section is covered: driver split (Tasks 13–14, 19), schema (3–4), auth helpers (6–9), OAuth callback (10), UI integration (11–12), route updates (15), Supabase driver implementation (16–18), deployment (20–22).
- No TBDs, no "similar to Task N" — each task carries its own code.
- Type names consistent: `RunSummary`, `RequestRow`, `ChatSession`, `ChatMessage` everywhere; function signatures line up between `db-sqlite.ts` and `db-supabase.ts`.
- Ordering is designed so every commit compiles: the `db.ts` shim is stubbed (Task 14) before `db-supabase.ts` exists (Tasks 16–18), and the real switch lands last (Task 19).
- TDD applied where it fits (driver selection test). Infra tasks (migrations, deployment) use verification steps instead of unit tests.
