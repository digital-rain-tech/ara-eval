# ARA-Eval

An open framework for determining when an AI agent can act autonomously — without human approval.

Most AI governance frameworks ask: *Should we use AI?*

ARA-Eval asks the harder question: **When can an AI safely take action on its own?**

Developed by [IRAI Labs](https://irai.co) × [Digital Rain Technologies](https://digitalrain.studio).

## What This Is

The framework evaluates operational domains across 7 dimensions, producing a **risk fingerprint** — a pattern of level classifications (A–D) that preserves reasoning rather than collapsing it into a single score. Gating rules then determine readiness: which domains are ready now, which need prerequisites, which should stay human-in-loop.

## Quickstart

```bash
python3 -m venv .venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows (Command Prompt)

pip install -r requirements.txt
pip install -e .   # install ara_eval package
```

Add your OpenRouter API key to `.env.local`:
```
OPENROUTER_API_KEY=your-key-here
```

Run the labs:
```bash
python3 labs/lab-01-risk-fingerprinting.py             # risk fingerprinting (6 scenarios × 3 personalities)
python3 labs/lab-01-risk-fingerprinting.py --structured # with structured input decomposition
python3 labs/lab-01-risk-fingerprinting.py --all        # all 13 scenarios
python3 labs/lab-02-grounding-experiment.py             # regulatory grounding experiment
python3 labs/lab-03-intra-rater-reliability.py          # intra-rater reliability (5 reps default)
```

Default model: **Arcee Trinity Large** (`arcee-ai/trinity-large-preview:free`) via OpenRouter — zero cost. Swap models without touching code:
```bash
ARA_MODEL=qwen/qwen3-235b-a22b-2507 python3 labs/lab-01-risk-fingerprinting.py  # paid tier
```

See [`docs/models.md`](docs/models.md) for alternatives and pricing.

Browse results:
```bash
python3 labs/view-requests.py              # list runs
python3 labs/view-requests.py --last       # show most recent run
python3 labs/view-requests.py --stats      # aggregate stats
python3 labs/view-requests.py detail <id>  # full request/response detail
```

Output goes to date-stamped subdirectories under `results/` (gitignored): JSON results, a `latest` symlink, and `ara-eval.db` (SQLite request log with full provenance). Malformed LLM responses are retried up to 2 times automatically.

## Repository Structure

```
docs/               # Framework specification, rubric definitions, model guide
  course-formats/   # 5-week MBA and 10-week undergraduate syllabi
  adr/              # Architecture Decision Records
labs/               # Runnable Python labs (see below)
prompts/            # LLM prompt templates (system, user, rubric, jurisdictions)
scenarios/          # Starter scenario library (JSON)
results/            # Output (gitignored) — date-stamped JSON + SQLite log
```

## The 7 Dimensions

| # | Dimension | Core Question |
|---|-----------|---------------|
| 01 | Decision Reversibility | Can the action be undone? |
| 02 | Failure Blast Radius | If the agent is wrong, how many people or dollars are affected? |
| 03 | Regulatory Exposure | Does this decision touch safety, privacy, or compliance? |
| 04 | Decision Time Pressure | How much time does the situation allow before a decision must be made? |
| 05 | Data Confidence | Does the agent have enough signal to act? |
| 06 | Accountability Chain | When the agent acts, who is responsible? Can you audit the decision? |
| 07 | Graceful Degradation | When the agent fails, does it fail safely — or cascade? |

Each dimension uses a four-level classification (A–D) with narrative anchors:
- **Level A** — Highest risk / most restrictive
- **Level B** — Significant risk / requires safeguards
- **Level C** — Moderate risk / manageable with audit trails
- **Level D** — Low risk / suitable for autonomy

## Gating Rules

Certain dimensions override everything else — like aviation safety checklists:

- If **Regulatory Exposure = A** → autonomy not permitted
- If **Blast Radius = A** → human oversight required
- If **Reversibility ≥ C** AND **Blast Radius ≤ C** → autonomy possible with audit trail

## HK-Specific Context

The framework synthesizes international governance standards (NIST AI RMF, EU AI Act, Singapore Model AI Governance) with Hong Kong's unique regulatory landscape:

- HKMA GenAI Circular (Nov 2024)
- SFC Circular 24EC55 (Nov 2024)
- PCPD AI Framework (Jun 2024)
- Cross-border complexity: PIPL, GBA data flows, CAC algorithm registration

## How It Works

1. Scenarios describe potential autonomous AI actions (e.g., "an AI blocks a $2M wire transfer at 2:47 AM")
2. An LLM judge evaluates each scenario from 3 stakeholder perspectives (compliance officer, CRO, operations director) using ConFIRM-based personality variants
3. Each evaluation produces a **risk fingerprint** — e.g., `C-B-A-A-C-B-C`
4. **Deterministic gating rules** (not the LLM) classify readiness: Ready Now / Ready with Prerequisites / Human-in-Loop Required
5. Personality deltas surface where stakeholders disagree — revealing where organizational alignment is needed before deployment

All requests, responses, token usage, cost, and provider metadata are logged to SQLite for full traceability and reproducibility.

## Labs

| Lab | Purpose | Calls | Key Output |
|-----|---------|-------|------------|
| **01: Risk Fingerprinting** | Evaluate scenarios across 7 dimensions with 3 stakeholder personalities | 18 | Risk fingerprints, gate decisions, personality deltas, reference comparison |
| **01: Structured Input** (`--structured`) | Same pipeline but with decomposed inputs (subject/object/action/regulatory triggers) | 18 | Compare determinism vs narrative prompts |
| **02: Grounding Experiment** | Test whether explicit regulatory citations change classifications | 36 | Dimension sensitivity to jurisdiction context |
| **03: Intra-Rater Reliability** | Repeat evaluations to measure LLM self-consistency | 90 (5 reps) | Per-dimension agreement rates, stability analysis |

See [`labs/README.md`](labs/README.md) for exercises and key questions. Course syllabi: [`5-week MBA`](docs/course-formats/5-week-mba-capstone.md) | [`10-week undergraduate`](docs/course-formats/10-week-undergraduate.md).

## Contributing

Have a messy business workflow, a process you've debated automating, or a news story that stuck with you? [**Open an issue**](../../issues/new?template=scenario.yml) and tell us about it. You don't need to know our framework — we'll structure it, run it through the pipeline, and credit you. Takes 2 minutes.

Also accepting [model evaluation results](CONTRIBUTING.md#model-evaluation-results-pr) — run ARA-Eval through a different LLM and submit the output.

## License

Apache 2.0 — see [LICENSE](LICENSE).
