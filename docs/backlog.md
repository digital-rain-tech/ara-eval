# Backlog

Items identified through code review and project analysis. Not prioritized for immediate work.

## Infrastructure

- **Add CI workflow** — GitHub Actions to run `pytest` and a lightweight CLI smoke check on PRs. No CI exists today; regressions can merge undetected.

- **Extract shared module** — Labs 02, 03, and tests depend on `sys.path` mutation + `importlib.spec_from_file_location` to load Lab 01. Extract shared logic (LLM calls, gating rules, fingerprint parsing) into a proper package module (e.g., `ara_eval/core.py`).

- **Centralize framework constants** — Dimensions, level ordering, and gating rules are duplicated across lab scripts and `generate-report.py`. Single source of truth to prevent drift.

## Developer experience

- **Add `requirements-dev.txt`** — Split test/tooling dependencies (`pytest`, etc.) from runtime dependencies. Document a single reproducible test flow for contributors.

- **Align default model references** — `docs/models.md` says Qwen3 235B is the current default; code and README default to Arcee Trinity. Pick one source of truth.

## Documentation

- **Add `AGENTS.md`** — Model-agnostic repo guidance (run/test/review commands, architecture map, conventions) for multi-agent contributors. `CLAUDE.md` is Claude-specific.

- **Add subtree `AGENTS.md` files** — Root-level guidance is too thin for major areas. Each subtree has distinct operating rules: `labs/` writes result artifacts and DB rows, `prompts/` is part of the evaluation contract, `shared/` feeds the public site, `web/` can expose server-only data. Add focused files in `labs/`, `web/`, `prompts/`, `scenarios/`, `shared/`, and `tests/`.

- **Fix stale README leaderboard command** — `README.md` references `python labs/update-readme-leaderboard.py`; the current workflow is `python labs/lab-04-inter-model-comparison.py` followed by `python labs/publish-leaderboard.py`. Consider a CI check that validates command snippets in docs reference existing files.

## Architecture

- **Split `ara_eval/core.py` by responsibility** — Currently combines env loading, config, prompt rendering, SQLite schema/migrations, request logging, OpenRouter calls, JSON repair, gating, scenario loading, retry helpers, and CLI printing. Split into `config.py`, `prompts.py`, `db.py`, `providers/openrouter.py`, `parsing.py`, `gating.py`, `cli_output.py`, keeping a compatibility shim in `core.py` while labs migrate.

- **Deduplicate evaluation semantics between Python and web** — `web/src/lib/openrouter.ts`, prompt rendering, validation, SQLite schema, and gating mirror the Python implementation. Drift is structurally likely. Add parity tests comparing Python and TypeScript outputs for prompt assembly, gating, JSON parsing, and request defaults; where possible, generate TypeScript constants from `shared/*.json`.

## Code quality — Lab 01 retry mode

- **Retry may blend models across runs** — `--retry` retains successful evaluations from the prior JSON but writes `_run.model_requested` from the current `MODEL`. Without an explicit override, output can contain fingerprints from multiple models while claiming the whole run used the current model — corrupts leaderboard inputs. Store the prior model, require match unless explicitly overridden, preserve per-evaluation `model_used`, surface a mixed-model warning.

- **Retry run DB summary doesn't match request rows** — Retry seeds `run_stats` with prior successes, but the new `eval_runs` row only has `ai_provider_requests` for the retry. Summary reports successful calls/tokens/cost without corresponding request rows, breaking traceability. Scope DB stats to the current invocation, or explicitly link prior request rows with provenance metadata.

- **Retry writes the result file non-atomically** — `output_path` is the prior results file; interrupting `json.dump` can truncate the source retry depends on. Write to a temporary file in the same directory and `Path.replace()` after a successful write.

- **Retry accepts incomplete prior evaluations** — Success detection treats any evaluation with `fingerprint` and no `error` as reusable, then later assumes `ev["gating"]` exists. A malformed or older file will `KeyError` and abort. Validate the full expected shape before adding to `skip_set`.

- **Latest-result symlink assumes `results/` path** — `latest_path.symlink_to(output_path.relative_to(results_dir.resolve()))` crashes with `ValueError` if `--retry` points outside `results/`. Either require retry files under `results/`, or use an absolute symlink target as fallback.

## Infrastructure

- **Add gradual Python type checking** — No mypy/pyright configuration today; result dictionaries and provider responses pass through many layers, so type regressions slip through unless a test happens to cover them. Start with `ara_eval/` and key lab helpers in non-strict mode, then tighten around result schema objects.

## Web

- **Make `web/src/lib/env.ts` fail fast in production** — Currently logs a warning when `OPENROUTER_API_KEY` is missing and lets the server continue, making deployment health ambiguous. Add a startup validation helper that throws in production/server contexts. Document optional variables like `ARA_MODEL`. The Supabase + Vercel migration plan addresses this for new Supabase env vars but the OpenRouter-only guard remains.

---

*Items under "Architecture", "Code quality — Lab 01 retry mode", "Infrastructure > type checking", and the Documentation additions in this doc originate from the 2026-04-20 Codex review (`reviews/review-20260420-223056-3fe7b8.md`).*
