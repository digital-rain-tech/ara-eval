# ARA-Eval

**Agentic Readiness Assessment** — An open evaluation framework for determining when enterprises can safely deploy autonomous AI agents.

Developed by [IRAI Labs](https://irai.co) × [Digital Rain Technologies](https://digitalrain.studio).

## What This Is

Most AI governance frameworks answer "should we use AI?" ARA answers a harder question: **"Under what conditions can we trust AI to act autonomously — without human approval?"**

The framework evaluates operational domains across 7 dimensions, producing a **risk fingerprint** — a pattern of level classifications (A–D) that preserves reasoning rather than collapsing it into a single score. Gating rules then determine readiness: which domains are ready now, which need prerequisites, which should stay human-in-loop.

## Quickstart

```bash
python3 -m venv .venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows (Command Prompt)

pip install -r requirements.txt
```

Add your OpenRouter API key to `.env.local`:
```
OPENROUTER_API_KEY=your-key-here
```

Run the evaluation pipeline (6 core scenarios × 3 personality variants = 18 LLM calls):
```bash
python3 labs/lab-01-risk-fingerprinting.py          # core scenarios (~$0.003 with Qwen3 235B)
python3 labs/lab-01-risk-fingerprinting.py --all     # all 13 scenarios (~$0.005)
```

Default model: **Arcee Trinity Large** (`arcee-ai/trinity-large-preview:free`) via OpenRouter. Swap models without touching code:
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

Output: `results/lab-01-output.json` (structured results) and `results/ara-eval.db` (SQLite request log with full provenance).

## Repository Structure

```
docs/           # Framework specification, rubric definitions, model guide
labs/           # Runnable Python labs for the eval pipeline
scenarios/      # Starter scenario library (JSON)
results/        # Output (gitignored) — JSON results + SQLite request log
```

## The 7 Dimensions

| # | Dimension | Core Question |
|---|-----------|---------------|
| 01 | Decision Reversibility | Can the action be undone? |
| 02 | Failure Blast Radius | If the agent is wrong, how many people or dollars are affected? |
| 03 | Regulatory Exposure | Does this decision touch safety, privacy, or compliance? |
| 04 | Human Override Latency | How fast can a human intervene? Is that fast enough? |
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

See [`labs/`](labs/) for runnable evaluation exercises.

## License

Framework and methodology: open.
