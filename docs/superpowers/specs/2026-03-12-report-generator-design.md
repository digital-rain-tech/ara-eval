# Report Generator & Course Assignment System

**Date:** 2026-03-12
**Status:** Draft

## Purpose

Auto-generate markdown reports from ARA-Eval lab results that double as student homework worksheets. Support two course formats (5-week MBA capstone, 10-week undergraduate) for professor presentation on Monday.

## Architecture

### Report Generator: `labs/generate-report.py`

Single Python script, no new dependencies. Uses the same SQLite DB and JSON results already produced by Labs 01-03.

**Three modes:**
```bash
python labs/generate-report.py --last                    # most recent run
python labs/generate-report.py <run_id>                  # specific run
python labs/generate-report.py --compare <id1> <id2>     # side-by-side
```

**Output:** `results/report-<run_id_short>.md` or `results/report-compare-<short1>-vs-<short2>.md`

### Single-Run Report Sections

1. **Header** — Run ID, model, jurisdiction, rubric, timestamp, cost, call success rate
2. **Fingerprint Matrix** — Scenarios (rows) × Personalities (columns), each cell = fingerprint string + gating classification
3. **Gating Summary** — Counts: ready-now / ready-with-prerequisites / human-in-loop-required
4. **Dimension Heatmap** (text) — Per-dimension level distribution across all evaluations (how often A/B/C/D appears)
5. **Personality Delta Analysis** — Where stakeholders disagree most, ranked by max dimension divergence
6. **Reference Comparison** (Lab 01 only) — Accuracy vs human-authored reference fingerprints, per-dimension match rates
7. **Homework Questions** — Auto-generated from pattern detection (see below)

### Comparison Report (adds)

- Side-by-side fingerprint diff table (bolding changed dimensions)
- Per-dimension shift summary: stricter / looser / unchanged counts
- Cost and token comparison
- Homework questions specific to the comparison (e.g., "why did grounding change this dimension?")

### Pattern-Based Homework Question Generation

The report auto-detects interesting patterns and generates targeted questions. Each detector is a simple function that examines results and emits 0-2 questions.

**Detectors:**

| Pattern | Example Question |
|---------|-----------------|
| Hard gate triggered | "Regulatory Exposure = A blocked autonomy for [scenario]. What specific regulatory requirements drive this? Would a different jurisdiction change the outcome?" |
| All personalities agree | "All three stakeholders produced identical fingerprints for [scenario]. Does consensus mean the classification is correct? What conditions would make you question unanimous agreement?" |
| Personality split (max delta ≥ 2 levels) | "The compliance officer rated [dim] as [A] while the CRO rated it [C]. What does each role optimize for that explains this gap?" |
| Reference mismatch | "[scenario] fingerprint diverged from the reference on [dims]. The reference was authored by [Opus 4.6 + professor review + industry partner validation]. Which do you trust more, and why?" |
| Grounding shift (compare mode) | "Adding HK regulatory citations shifted [dim] from [X] to [Y]. The LLM likely has this information in training data — why does explicit citation change its judgment?" |
| Reliability wobble (if Lab 03 data available) | "[dim] showed only [X%] agreement across [N] runs. What makes this dimension harder to classify consistently?" |

### Answer Key Provenance

The reference fingerprints are NOT "the right answer from an LLM." They are produced through a three-layer validation process:

1. **Opus 4.6** generates candidate fingerprints with reasoning
2. **Professor review** validates pedagogical soundness and adjusts where academic judgment differs
3. **Industry partner review** (Digital Rain Technologies / IRAI Labs) validates against real-world regulatory practice

Reports and course materials must make this provenance explicit. The answer key is a calibrated human-AI consensus, not ground truth.

## Course Format Templates

Two standalone markdown documents in `docs/course-formats/`.

### Option A: 5-Week MBA Capstone

`docs/course-formats/5-week-mba-capstone.md`

| Week | Topic | Lab Activity | Deliverable |
|------|-------|-------------|-------------|
| 1 | Framework & Dimensions | Lab 01 (core, generic jurisdiction) | Interpret your fingerprints, compare to reference, write memo on one scenario |
| 2 | Regulatory Grounding | Lab 02 (hk vs hk-grounded) | Analyze grounding effect, identify which dimensions shift and hypothesize why |
| 3 | Reliability & Trust | Lab 03 (5 reps) | Measure judge consistency, discuss implications for production deployment |
| 4 | Model Comparison | Lab 01 with 2 different models | Cost-accuracy tradeoff memo: when is "good enough" good enough? |
| 5 | Capstone | Write custom scenario + present | Design scenario for your industry, predict fingerprint, run it, present findings |

### Option B: 10-Week Undergraduate

`docs/course-formats/10-week-undergraduate.md`

| Week | Topic | Lab Activity | Deliverable |
|------|-------|-------------|-------------|
| 1 | What is Autonomous AI? | Reading + discussion | Reflection: identify 3 autonomous systems you interact with daily |
| 2 | Risk Dimensions (intro) | Lab 01 (3 core scenarios, generic) | Annotate each dimension classification with your own reasoning |
| 3 | The Full Core Set | Lab 01 (all 6 core, generic) | Complete fingerprint matrix, identify patterns across scenarios |
| 4 | Stakeholder Perspectives | Lab 01 analysis deep-dive | Essay: why do stakeholders disagree? Pick one scenario, argue each perspective |
| 5 | Regulatory Context | Lab 02 (hk vs hk-grounded) | Grounding experiment report + 500-word essay on regulation's role in AI safety |
| 6 | Reliability as a Concept | Lab 03 (5 reps) | Statistical analysis: which dimensions are stable? What does that mean? |
| 7 | Model Effects | Lab 01 with free vs paid model | Cost-accuracy analysis: is the expensive model worth it? |
| 8 | Extended Scenarios | Lab 01 --all (backup scenarios) | Compare core vs backup difficulty. What makes a scenario "hard"? |
| 9 | Design Your Own | Write custom scenario | Create scenario relevant to a domain you care about, predict fingerprint, run it |
| 10 | Final Portfolio | Compile all labs | Present: key finding from each lab + one policy recommendation for an organization considering AI autonomy |

### Shared Principles (both formats)

- Every assignment asks "why" — not just "what did the model output"
- Reference fingerprints come from Opus 4.6 + professor + industry review (not "the right answer")
- Students must engage with the recursive nature: they're using AI to evaluate AI, and that's the point (see ADR-004)
- Reports auto-generated by `generate-report.py` serve as the starting artifact for each assignment
- Backup scenarios (7) available for extra credit or extensions in either format

## Implementation Plan

1. Build `labs/generate-report.py` with single-run and compare modes
2. Build homework question detectors (6 pattern functions)
3. Write `docs/course-formats/5-week-mba-capstone.md` with weekly assignments
4. Write `docs/course-formats/10-week-undergraduate.md` with weekly assignments
5. Run Labs 01-03 with Qwen3 235B to generate "paid model" comparison data
6. Generate sample reports to validate the format
