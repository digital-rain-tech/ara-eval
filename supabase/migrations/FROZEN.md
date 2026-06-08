# ⚠️ FROZEN — schema is managed in `platform-db`

The Supabase project `ezlyfsgpcahlnbqgdlxh` is **shared** by ara-eval, photocritic, and
lantern. Its schema is now managed centrally in the **`platform-db`** repo
(`projects/platform-db`), which holds the single canonical `supabase/migrations/` history
(a baseline captured from the live database, plus all forward migrations).

The `.sql` files in this folder are **legacy/historical** (they include ara-eval's
`ara_*` tables and the older photocritic migrations that were once pushed from here). Their
versions are marked `reverted` in the live migration history.

**Do NOT run `supabase db push` from this repo** — it will fight the canonical history.

To change the schema: add a migration in `platform-db` and `supabase db push` from there.
See `platform-db/docs/onboarding-a-new-app.md`.
