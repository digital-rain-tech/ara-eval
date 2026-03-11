# ADR-003: Core vs Backup Scenario Split

**Status:** Accepted
**Date:** 2026-03-11

## Context

After adding 7 real-incident scenarios (ADR-002 action item #4), the scenario library grew from 6 to 13. Running all 13 across 3 personalities produces 39 evaluations per lab, and with jurisdictions or repetitions the numbers compound quickly:

- Lab 01: 13 × 3 = 39 calls
- Lab 02: 13 × 3 × 2 jurisdictions = 78 calls
- Lab 03: 13 × 3 × 5 repetitions = 195 calls

More importantly, 13 fingerprints per condition is too much cognitive load for students reviewing results. The signal gets lost in volume.

## Decision

Split scenarios into **core** (6) and **backup** (7). Labs default to core-only; `--all` runs the full set.

### Core Set (6 scenarios)

Selected for maximum discrimination across risk tiers, dimension coverage, and pedagogical value.

| ID | Risk | Why Core |
|----|------|----------|
| `banking-customer-service-001` | Low | **Control.** Trivially D-D-D-D-D-D-D. If the LLM can't get this right, nothing works. |
| `genai-data-leakage-001` | Medium | **Messy middle.** All C's with Reg Exposure=B. Best test of personality divergence — genuinely arguable. |
| `insurance-claims-001` | Medium | **Single hard gate.** Mostly C/D but Reg Exposure=A. Tests whether gating rules activate on an otherwise permissive profile. |
| `claims-denial-001` | High | **Ethical tension.** Physician vs algorithm, 40% override rate. Real incident (UnitedHealth). Rich discussion material. |
| `algo-trading-deployment-001` | High | **Time pressure extreme.** Five A-level dimensions. The interesting question: should the kill switch itself be autonomous? Real incident (Knight Capital). |
| `cross-border-model-001` | Medium | **Jurisdiction-sensitive.** PIPL cross-border transfer rules are the most technical jurisdiction content. Lab 02's grounding experiment should show the biggest delta here. |

### Properties of the Core Set

- **Risk distribution:** 1 low, 2 medium, 3 high
- **Source mix:** 1 original, 2 original, 3 real-incident-based
- **Expected classifications:** 1 Ready Now, 2 Ready with Prerequisites / Human-in-Loop edge, 3 Human-in-Loop Required
- **Gating rule coverage:** hard gates (Reg Exposure=A, Blast Radius=A) and soft gates all exercised
- **Dimension spread:** each of the 7 dimensions varies across at least 3 levels in the core set

### Backup Set (7 scenarios) — Extra Credit

| ID | Risk | Extra Credit Angle |
|----|------|--------------------|
| `banking-fraud-001` | High | Compare with `algo-trading-deployment-001` — both time-pressure, different domains |
| `capital-markets-surveillance-001` | High | Hardest scenario (many A-levels). Systemic risk exploration. |
| `digital-banking-credit-001` | Medium | Alternative data / fairness angle |
| `insurance-underwriting-001` | High | Cross-border pricing — pairs with `cross-border-model-001` |
| `aml-screening-002` | High | AIA fine precedent — tests whether grounding changes behavior when a real penalty is cited |
| `trade-surveillance-gap-001` | High | Most A-levels of any scenario (5). Good stress test of gating rules. |
| `robo-advisory-001` | Medium | SFC suitability — pairs with SFC 24EC55 citations |

## Implementation

1. Added `"core": true/false` field to each scenario in `starter-scenarios.json`
2. Added `load_scenarios(use_all=False)` helper to Lab 01 (shared by Labs 02 and 03)
3. All labs default to core-only; `--all` flag runs the full set
4. Lab 03's `--scenarios` flag overrides both (selects specific scenarios by ID)

### Call Budget (Core Only)

| Lab | Formula | Calls |
|-----|---------|-------|
| 01 | 6 × 3 personalities | 18 |
| 02 | 6 × 3 × 2 jurisdictions | 36 |
| 03 | 6 × 3 × 5 repetitions | 90 |
| **Total** | | **144** |

vs 312 calls with all 13. A 54% reduction.

## Alternatives Considered

1. **Random sampling** — Rejected. Students need deterministic, repeatable scenario sets.
2. **Difficulty-based tiers** — Rejected. "Difficulty" is subjective and the core set was chosen for discrimination and coverage, not difficulty ordering.
3. **Fewer scenarios overall** — Rejected. The backup set has real value for extra credit and for validating that results generalize beyond 6 scenarios.
