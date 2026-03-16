# ARA-Eval Web Interface — Design Spec

## Purpose

Add a web interface to the ARA-Eval framework so the evaluation engine is demo-able in a browser. Two audiences:

1. **Professor** — polished demo with pre-loaded scenarios and instant results
2. **Students** — interactive tool where they write scenarios, pick grounding levels, and see how context changes risk assessments

The web app uses the **same evaluation engine** as the CLI labs — same prompt templates, same scenarios, same database — just a different frontend.

## Architecture

Single Next.js app under `web/`. No separate backend process. Next.js API routes handle server-side work (OpenRouter calls, SQLite, file reads). Shares data files with the Python labs.

```
ara-eval/
  prompts/              # shared: both Python and TS read these Mustache templates
  scenarios/            # shared: both Python and TS read these JSON files
  results/ara-eval.db   # shared: both Python and TS write to same SQLite DB
  ara_eval/             # Python core (unchanged)
  labs/                 # Python CLI labs (unchanged)
  web/                  # NEW: Next.js app
    app/
      page.tsx                    # Evaluate page (main view)
      history/page.tsx            # Run history table
      history/[runId]/page.tsx    # Single run detail
      requests/page.tsx           # Request inspector with filters
      requests/[id]/page.tsx      # Single request detail
      api/
        evaluate/route.ts         # POST — runs evaluation (3 personalities)
        scenarios/route.ts        # GET — lists starter + custom scenarios
        runs/route.ts             # GET — lists past eval runs
        requests/route.ts         # GET — lists/filters individual requests
    lib/
      constants.ts        # DIMENSIONS, LEVEL_ORDER, DIMENSION_LABELS
      gating.ts           # apply_gating_rules (deterministic, ~30 lines)
      prompts.ts          # Mustache template composition (reads ../prompts/)
      parse.ts            # Multi-strategy JSON parser (port of Python version)
      openrouter.ts       # OpenRouter HTTP call + response extraction
      db.ts               # better-sqlite3 wrapper: init_db, log_request, queries
    components/
      FingerprintMatrix.tsx    # 7-dim x 3-personality heatmap grid
      GatingVerdict.tsx        # Classification badge + triggered rules
      PromptInspector.tsx      # Scrollable prompt text, grounding highlighted
      PersonalityDelta.tsx     # Disagreement callouts sorted by spread
      ScenarioInput.tsx        # 4-mode input selector + forms
      ComparisonView.tsx       # 3-column grounding level comparison
```

## Pages

### 1. Evaluate (main page) — Split-Pane Layout

The core pedagogical insight: students need to see the connection between what the model receives (the prompt with regulatory context) and what it concludes (the risk fingerprint). The split-pane makes this cause-and-effect relationship viscerally obvious.

**Top bar**: Grounding level selector as tabs — Generic | HK (names only) | HK-Grounded (full regulatory text). Switching tabs instantly updates the left pane (no API call, just re-renders the Mustache template).

**Left pane (40%)**: The assembled system prompt, scrollable. The jurisdiction/grounding section is visually highlighted so students can see exactly what changes between levels. This is the "cause" side.

**Right pane (60%)**: The "effect" side.

- **Scenario input** (top): Dropdown with 4 modes:
  1. **Pre-loaded (unstructured)** — pick from 13 starter scenarios, shows narrative text
  2. **Pre-loaded (structured)** — same scenario, uses structured_context decomposition
  3. **Free text** — blank textarea for custom scenarios
  4. **Structured form** — guided fields (subject, object, action, regulatory triggers, time pressure, confidence signal, reversibility, blast radius) with greyed-out example text from insurance-claims-001

- **Evaluate button** → progress indicator as each personality completes

- **Results** (below input):
  - Fingerprint heatmap: 7 rows (dimensions) x 3 columns (personalities), cells color-coded A=red, B=orange, C=yellow, D=green
  - Gating verdict: classification badge (ready now / ready with prerequisites / human-in-loop required) + triggered rules listed
  - Personality delta: dimensions where stakeholders disagree, sorted by spread (largest disagreement first)
  - Expandable per-dimension reasoning from each personality

- **"Compare All" button**: For pre-loaded scenarios, displays all 3 grounding levels side-by-side (3 fingerprint matrices in columns). Uses pre-computed results from `results/reference/` for instant display.

### 2. Run History

Table of past eval runs from `eval_runs` table (covers both web and CLI runs since they share the database).

- Columns: date, model, scenario count, success rate, total tokens, cost, duration
- Click row → detail view showing all evaluations from that run with fingerprint matrices
- Sortable, paginated

### 3. Request Inspector

Filterable table of individual LLM calls from `ai_provider_requests` table.

- Filters: scenario, personality, model, grounding level (jurisdiction column), date range, success/error status
- Columns: timestamp, scenario, personality, fingerprint string, classification, tokens, latency, status
- Click row → full detail view: raw request JSON, raw response JSON, parsed result, error message if any

## Shared Data Layer

### Prompt Templates
TypeScript reads `../prompts/*.md` files via `fs` in API routes. Renders with the `mustache` npm package (compatible with Python's `chevron` — both implement the Mustache spec). The `_index.json` files in `prompts/personalities/` and `prompts/jurisdictions/` are read to discover available options.

### Scenarios
TypeScript reads `../scenarios/starter-scenarios.json` via `fs`. Custom scenarios from `../scenarios/custom/` are also listed if present.

### Database
`better-sqlite3` reads/writes `../results/ara-eval.db` using the **same schema** the Python code creates:
- `eval_runs` — one row per pipeline execution
- `ai_provider_requests` — one row per LLM call with full provenance

The TypeScript `db.ts` module mirrors the Python `init_db()` and `log_request()` functions. Schema creation is idempotent (CREATE TABLE IF NOT EXISTS) so either Python or TypeScript can initialize the database.

### Pre-Computed Results
Reference results from `results/reference/` are loaded for instant demo mode with pre-loaded scenarios. These are the committed known-good runs from tested models.

## Ported Logic

These Python functions are reimplemented in TypeScript:

| Python (ara_eval/core.py) | TypeScript (web/lib/) | Complexity |
|---|---|---|
| `DIMENSIONS`, `LEVEL_ORDER`, `DIMENSION_LABELS` | `constants.ts` | Data only |
| `apply_gating_rules()` | `gating.ts` | ~30 lines, deterministic |
| `build_system_prompt()`, `build_user_prompt()` | `prompts.ts` | Mustache rendering, reads same template files |
| `parse_llm_json()` | `parse.ts` | ~70 lines, 4-strategy fallback. Uses `jsonrepair` npm package instead of Python's `json_repair` |
| `evaluate_scenario()` | `openrouter.ts` | HTTP POST + response extraction |
| `init_db()`, `log_request()` | `db.ts` | Same schema, `better-sqlite3` |
| `personality_delta()` | In component or util | ~30 lines |

**Not ported** (lab-specific, not needed in web):
- `evaluate_with_retry()` — web uses simpler retry (no 17s pacing needed for interactive use)
- CLI formatting functions (`print_fingerprint`, `print_delta_report`, etc.)
- Run directory management (`get_run_dir`)

## Key Dependencies

- `next` / `react` — framework
- `better-sqlite3` — SQLite access in API routes
- `mustache` — Mustache template rendering (same spec as Python's chevron)
- `jsonrepair` — JSON repair for malformed LLM output (JS equivalent of Python's json_repair)
- Tailwind CSS — styling

## API Key

Read from `../.env.local` via `dotenv` in Next.js server-side code. Same file the Python labs use. Never exposed to the browser.

## What Does NOT Change

- `ara_eval/core.py` — untouched
- `labs/*.py` — untouched
- `prompts/` — untouched (web reads same files)
- `scenarios/` — untouched (web reads same files)
- `results/` directory structure — untouched
- Database schema — web writes same tables, same columns
- `.env.local` — web reads same API key

## Out of Scope

- User authentication (single-user local tool)
- Deployment to cloud (runs locally via `npm run dev`)
- Real-time collaboration
- Editing prompt templates through the UI
