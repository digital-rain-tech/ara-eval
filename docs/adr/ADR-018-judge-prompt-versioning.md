# ADR-018: Judge Prompt Versioning, and Why the Board Stays on v1

**Status:** Accepted
**Date:** 2026-08-25

## Context

Scoring Ox Alpha exposed a disagreement worth chasing. The model rated Regulatory
Exposure at Level A for all three personalities on `genai-data-leakage-001`, against
a reference of B. That produced 3 false gates and cost it the top rank.

Checking the rest of the board turned this from a model defect into a framework
question. Every other core scenario draws near-unanimous agreement:

| Scenario | Reference | Models rating A |
|---|---|---|
| insurance-claims-001 | A | 17/17 |
| algo-trading-deployment-001 | A | 17/17 |
| claims-denial-001 | A | 17/17 |
| cross-border-model-001 | A | 17/17 |
| banking-customer-service-001 | D | 2/17 |
| **genai-data-leakage-001** | **B** | **10/17** |

One contested item out of six. 43% of all model and personality judgements land on A.

Both readings were defensible on the rubric as written. The rubric said only
`A=direct regulatory mandate, B=regulatory guidance applies`. It never said whether
to grade the decision or the data the decision touches. The PDPO (Cap. 486) is
binding statute and a DLP agent handling client PII sits on top of it, so A reads as
correct. The HKMA GenAI Circular (19 Aug 2024) is supervisory guidance, so B reads as
correct too.

The answer key resolves this with a test it never wrote down.

A second problem surfaced while investigating the first. Runs record
`"rubric": "rubric.md"`, but that file has held four different texts:

| Effective | Fingerprint | Change |
|---|---|---|
| 2026-03-11 | `2a68655dd13d` | prompts extracted into Mustache templates |
| 2026-03-11 | `33d2d4156083` | real-incident scenarios added |
| 2026-03-15 | `58cc76bbead7` | dimension 4 renamed to Decision Time Pressure |
| 2026-07-18 | `13caa7a42563` | rebrand, Readiness to Risk |
| 2026-08-25 | `0c6a1b25d5ec` | Regulatory Exposure scope note (`rubric-v2.md`) |

A filename is not a version. The board could not be grouped by what the judge
actually read.

## Decision

### 1. Runs record a hash of the prompt, not its filename

`ara_eval.core.prompt_fingerprint()` hashes the composed system prompt across all
three personalities. lab-01 writes it to `_run.prompt_fingerprint`, and
`publish-leaderboard.py` stamps `prompt_version` on every board row, falling back to
a date timeline for runs that predate the change.

`shared/prompt-versions.json` publishes the full prompt text behind every version,
rebuilt from git by `labs/export-prompt-versions.py`. A reader can see exactly what
the judge saw before it scored a scenario.

### 2. Prompt changes add a file; they never edit one in place

Two kinds of change are not alike:

- **Scoring-side** (reference fingerprints, metric definitions) — rescore offline with
  lab-04. No API calls, so the whole board moves together. Precedent: `3f1c304`
  re-baselined 6 reference cells.
- **Prompt-side** (rubric, personality, jurisdiction) — changes the judge's input. It
  cannot be rescored, only re-run.

So `rubric.md` stays frozen and `prompts/rubric-v2.md` carries the scope note.

### 3. The Regulatory Exposure scope note

Grade the decision, not the subject matter. Does a regulation prescribe how *this*
decision must be made?

- Regulated data alone does not make a decision Level A.
- An agent acting as a compliance control enforces a regime rather than carrying out
  the regulated act. Grade it by the guidance governing the control.
- Routine administrative work stays at C or D when no rule prescribes the decision.

This fits all six core references, including `banking-customer-service-001` at D.

An earlier formulation — "a compliance control scores one level below the regime it
enforces" — was rejected. PDPO is Level A, so one level below gives B, but that
reference is D. The address-update agent is not a compliance control at all.

### 4. The board stays on v1

The scope note is correct and validated, and it is still not promoted to default.

A full re-run under v2 is impossible. Of 25 API rows, **11 models are delisted**,
including Gemini 2.5 Flash Lite at #2, Arcee Trinity, Grok 4.1 Fast, and every earlier
stealth model. Four more rows are subagent or manual. Only 14 of 29 are reproducible,
and stealth endpoints disappear by design.

A v2 board would therefore never be complete. It would permanently exclude 15 rows
including the current #1 and #2, and sit next to a complete v1 board inviting exactly
the cross-version comparison the split was meant to prevent.

So: one board, on v1, with all 29 rows comparable. v2 is held for a future cutover
where a change affects many scenarios and warrants losing the delisted rows.

## Consequences

**The flaw is documented and measured rather than patched.** This is ordinary
benchmark practice when history cannot be re-run — comparability beats correctness on
a ranking until a planned major version.

**New models keep being scored under v1**, a rubric now known to be ambiguous on one
scenario. The alternative reintroduces version mixing. Where a v2 score exists it is
reported alongside, never in the ranking.

**Validation.** Ox Alpha under `rubric-v2.md`, 18/18 evals:

| | v1 | v2 |
|---|---|---|
| F2 | 0.96 | 1.00 |
| Hard gate precision | 83% | 100% |
| False positives | 3 | 0 |
| Bias | jittery | even-keeled |

The four unanimous A-gates still fire. Only the contested scenario moved.

A targeted probe re-ran that scenario for all three affected live models
(9 persona-evals): **false gates fell from 6 of 9 to 0 of 9.**

**The note is not free of side effects.** Dimension-level agreement improves overall
(3/9 to 6/9), but unevenly. Ox Alpha goes 0/3 to 3/3 and MiMo v2.5 goes 1/3 to 2/3,
while **Tencent Hunyuan Hy3 goes 2/3 to 1/3** — its gate error is fixed while two
personas drift from B to C, one level below the reference. C fires no gate, so F2 is
unaffected. This needs watching before v2 is ever promoted.

**Held-back runs are declared.** `HELD_BACK` in `publish-leaderboard.py` names each
run kept in `results/reference/` but deliberately off the board, with the reason, so a
bare "no MODEL_MAP entry" warning is not mistaken for an oversight.

## References

- `prompts/rubric-v2.md`, `shared/prompt-versions.json`
- `labs/export-prompt-versions.py`, `ara_eval.core.prompt_fingerprint`
- `results/reference/ox-alpha-v2/` — validation run
- PCPD, [The Personal Data (Privacy) Ordinance](https://www.pcpd.org.hk/english/data_privacy_law/ordinance_at_a_Glance/ordinance.html)
- HKMA, [Consumer Protection in respect of Use of Generative AI](https://www.hkma.gov.hk/media/eng/doc/key-information/guidelines-and-circular/2024/20240819e1.pdf), 19 Aug 2024
- ADR-002 — why F2 weights recall, and the rubric verbosity variants
