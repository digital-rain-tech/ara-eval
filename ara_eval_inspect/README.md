# ARA-Eval × Inspect

The risk-fingerprinting evaluation (lab-01) exposed as an [Inspect](https://inspect.aisi.org.uk) task. Everything substantive — prompt composition, scenario loading, JSON repair, gating rules — is imported from `ara_eval.core`; this package is only the adapter, so lab results and Inspect results stay comparable by construction.

## Setup

```bash
source venv/bin/activate
pip install -e . -r requirements-dev.txt   # inspect-ai + openai (the openrouter provider client)
# OPENROUTER_API_KEY in .env.local is NOT picked up by inspect — export it:
export OPENROUTER_API_KEY=$(grep OPENROUTER_API_KEY .env.local | cut -d= -f2)
```

## Run

```bash
# Core 6 scenarios, default judge prompts
inspect eval ara_eval_inspect --model openrouter/openai/gpt-4o

# All 13, structured decomposition, Singapore grounding (mirrors lab-01 flags)
inspect eval ara_eval_inspect --model openrouter/qwen/qwen3-235b-a22b-2507 \
    -T use_all=true -T structured=true \
    -T scenarios_file=singapore-scenarios.json -T jurisdiction=sg-grounded

# The lab-04 leaderboard, the Inspect way: one eval per model, then compare
inspect eval ara_eval_inspect --model openrouter/<model-a>
inspect eval ara_eval_inspect --model openrouter/<model-b>
inspect view          # browse logs, per-sample transcripts, scores
```

Smoke test without an API key (canned model output, pipeline only):

```bash
inspect eval ara_eval_inspect --model mockllm/model --limit 1
```

## Scoring

| Scorer | Metric | Meaning |
|---|---|---|
| `fingerprint_agreement` | mean ± stderr | Fraction of the 7 dimensions exactly matching the human reference fingerprint. Per-dimension breakdown + mean level distance in score metadata. |
| `gate_match` | accuracy ± stderr | Does the deterministic gating verdict (`apply_gating_rules`) from the judge's fingerprint match the verdict from the reference fingerprint? |
| `hard_gate_detection` | gate_recall / gate_precision / gate_f2 | Per-sample hard-gate confusion counts pooled into corpus-level recall, precision, and F2 (β=2) — the same metric stack as lab-04's leaderboard "Risk Detection" column (`HARD_GATE_DIMS` shared via `ara_eval.core`). Unparseable output counts as FN for gates that should fire. |

`gate_match` is the deployment-relevant number: two fingerprints can disagree on levels yet land on the same readiness verdict — and vice versa, one flipped `regulatory_exposure` level can flip a hard gate. `hard_gate_detection` is the leaderboard-comparable number.

## Rescoring stored outputs (no API calls)

`labs/rescore-inspect-metrics.py` applies this same scorer logic (shared functions `hard_gate_counts` / `gate_prf`) to existing Lab 01 result JSON — one metric implementation, two data paths. Validated 2026-07-23: rescoring `results/2026-07-22/` reproduces lab-04's freshly-computed recall/precision/F2 and FP-match figures exactly for all three models.

```bash
python labs/rescore-inspect-metrics.py                     # newest results/<date>/
python labs/rescore-inspect-metrics.py results/2026-07-22/*.json
```

## Task parameters

All mirror `labs/lab-01-risk-fingerprinting.py`: `scenarios_file`, `use_all`, `jurisdiction`, `personality`, `rubric`, `structured`. Pass with `-T name=value`.

One difference from lab-01: lab-01 crosses every scenario with all three personality archetypes in a single run; here `personality` defaults to `operations_director` (the neutral archetype) and you run one eval per personality for the delta comparison:

```bash
for p in operations_director compliance_officer cro; do
  inspect eval ara_eval_inspect --model openrouter/<model> -T personality=$p
done
```

## Comparability with lab-01

Prompts, parsing, and gating are imported from `ara_eval.core`, so those are identical by construction. Generation is aligned where it affects output: the task pins `max_tokens=16384` to match lab-01's request, so truncation behaves the same. Two harness differences are deliberate and do **not** affect a single call's output, only throughput and failure handling:

- **Pacing/retry:** lab-01 hand-paces free models at a fixed interval and retries with its own backoff; here Inspect owns retry, rate-limit handling, and `--max-connections`. For volatile free models, cap concurrency (`--max-connections 1`) to approximate lab-01's sequential pacing.
- **Sampling temperature** is left at the provider default in both, so it is not pinned here either.
