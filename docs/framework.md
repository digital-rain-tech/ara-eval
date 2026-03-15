# ARA Framework Specification

## Classification System

Each dimension uses a four-level classification with narrative anchors — not numerical scores. Numbers compress judgment into something that looks objective while discarding the reasoning that produced it. Two "3s" are rarely the same creature. Levels preserve meaning.

### Decision Reversibility

| Level | Label | Description | Example |
|-------|-------|-------------|---------|
| A | Irreversible | Action cannot be undone or correction is extremely costly | Irreversible trade execution |
| B | Hard to reverse | Correction requires manual intervention or causes customer impact | Rejecting a legitimate claim |
| C | Easily reversible | Correction is straightforward and contained | Reversing a customer service refund |
| D | Fully reversible / sandboxed | Can be automatically rolled back without user impact | Recommendation ranking experiments |

### Failure Blast Radius

| Level | Label | Description | Example |
|-------|-------|-------------|---------|
| A | Systemic | Impacts many users, markets, or regulatory obligations | Market-wide trading halt |
| B | Multi-customer | Affects a group of customers or significant financial exposure | Batch processing error |
| C | Single-customer | Contained to one account or interaction | Incorrect product recommendation |
| D | Internal / test domain | No external impact | Internal report formatting |

### Regulatory Exposure

| Level | Label | Description | Example |
|-------|-------|-------------|---------|
| A | Direct regulatory mandate | Decision falls under specific regulatory requirements | Autonomous lending approval under HKMA |
| B | Regulatory guidance applies | Relevant guidance exists but is not prescriptive | AI-assisted advisory under SFC 24EC55 |
| C | General compliance | Standard business regulations apply | Customer communications |
| D | Unregulated domain | No specific regulatory framework applies | Internal tooling |

### Decision Time Pressure

| Level | Label | Description | Example |
|-------|-------|-------------|---------|
| A | No time to decide | Situation demands immediate action — seconds or less. Human involvement is physically impossible. | Real-time trading decisions |
| B | Hours, not days | Decision should be made within hours. Delay creates material risk but doesn't foreclose options. | Overnight fraud detection |
| C | Days are acceptable | Decision can wait days. Normal review workflows apply. Delay has minor operational cost. | Claims processing queue |
| D | No deadline | Decision can wait weeks or indefinitely. Time is not a factor in the autonomy question. | Policy document drafting |

### Data Confidence

| Level | Label | Description | Example |
|-------|-------|-------------|---------|
| A | Ambiguous / conflicting signals | Data is incomplete, contradictory, or requires interpretation | Ambiguous customer intent |
| B | Partial signal | Some structured data but key inputs are uncertain | Mixed fraud indicators |
| C | Strong signal with caveats | Mostly structured, reliable data with known limitations | Historical claims data |
| D | High-confidence structured data | Complete, structured, validated data | Pricing data from exchange feeds |

### Accountability Chain

| Level | Label | Description | Example |
|-------|-------|-------------|---------|
| A | No clear accountability | Cannot determine who is responsible for the decision | Opaque model inference chain |
| B | Accountability exists but gaps | Responsible party identified but audit trail is incomplete | Multi-model pipeline with partial logging |
| C | Clear accountability with audit | Responsible party and decision trail are documented | Logged API call with reasoning |
| D | Full transparency | Complete audit trail with human-readable reasoning | Rule-based decision with full logging |

### Graceful Degradation

| Level | Label | Description | Example |
|-------|-------|-------------|---------|
| A | Cascading failure | Agent failure triggers downstream failures | Silent data corruption propagating through systems |
| B | Ungraceful failure | Agent fails in a way that requires manual recovery | Stuck transaction requiring database intervention |
| C | Contained failure | Agent fails but damage is limited and recoverable | Failed recommendation falls back to default |
| D | Safe failure | Agent fails into a known-safe state | Fallback to human queue with no data loss |

## Gating Rules

The framework behaves like a decision tree, not a weighted average — mirroring how aviation, nuclear safety, and medicine handle automation decisions.

### Hard Gates (override all other dimensions)

1. **Regulatory Exposure = A** → Autonomy not permitted. Human-in-loop required regardless of all other dimensions.
2. **Failure Blast Radius = A** → Human oversight required. May permit supervised autonomy with real-time monitoring.

### Soft Gates (conditional autonomy)

3. **Reversibility ≥ C** AND **Blast Radius ≤ C** → Autonomy possible with audit trail.
4. **All dimensions ≥ C** → Strong candidate for full autonomy.
5. **Any dimension = A** (beyond regulatory/blast radius) → Requires documented risk acceptance from appropriate authority.

### Risk Fingerprint Interpretation

A risk fingerprint is the ordered tuple of level classifications across all 7 dimensions. For example:

```
Fraud Detection: A-B-A-A-C-B-C
                 │ │ │ │ │ │ └─ Graceful Degradation
                 │ │ │ │ │ └─── Accountability Chain
                 │ │ │ │ └───── Data Confidence
                 │ │ │ └─────── Decision Time Pressure
                 │ │ └───────── Regulatory Exposure
                 │ └─────────── Failure Blast Radius
                 └───────────── Decision Reversibility
```

The pattern tells the story. Gating rules are applied to determine the readiness classification:
- **Ready Now** — No hard gates triggered, all dimensions ≥ C
- **Ready with Prerequisites** — Soft gates triggered, specific conditions can be met
- **Human-in-Loop Required** — Hard gates triggered, autonomy not appropriate
