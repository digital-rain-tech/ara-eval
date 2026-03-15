# Contributing to ARA-Eval

We welcome two types of contributions:

1. **Business scenarios** — real-world situations where autonomous AI decisions create risk, organized by industry vertical
2. **Model evaluation results** — run ARA-Eval through different LLMs to build a cross-model comparison dataset

Both contribution types follow the same process: fork, add, open a PR.

---

## 1. Business Scenarios

The most valuable contribution to ARA-Eval is **scenarios grounded in real operational decisions** — situations your organization has actually faced (or plausibly would face) when considering autonomous AI.

### Anonymization requirements

Scenarios **must** be anonymized. We will reject any PR that contains:
- Company names, product names, or brand-identifiable details
- Names of individuals
- Exact dollar amounts traceable to a specific transaction
- Internal system names or proprietary process descriptions
- Dates or details that identify a specific incident

We **do** want:
- **Industry vertical** (e.g., Banking, Insurance, Capital Markets, Wealth Management, Healthcare, Logistics)
- **Company size band**: `startup` (<50 employees), `smb` (50–500), `mid-market` (500–5,000), `enterprise` (5,000+)
- **Jurisdiction** (e.g., Hong Kong, Singapore, EU, US, multi-jurisdiction)
- Realistic operational detail — round numbers, representative workflows, plausible confidence levels

### Scenario format

Add scenarios to `contributions/scenarios/` organized by vertical:

```
contributions/scenarios/
├── banking/
│   └── your-scenario-id.json
├── insurance/
│   └── your-scenario-id.json
├── capital-markets/
│   └── your-scenario-id.json
├── wealth-management/
│   └── your-scenario-id.json
├── healthcare/
│   └── your-scenario-id.json
├── logistics/
│   └── your-scenario-id.json
├── legal/
│   └── your-scenario-id.json
├── technology/
│   └── your-scenario-id.json
└── other/
    └── your-scenario-id.json
```

Each scenario is a single JSON file following this schema:

```json
{
  "id": "vertical-domain-nnn",
  "origin": "industry-practitioner | llm-assisted | llm-generated | public-incident | academic",
  "domain": "Operational domain (e.g., Claims Processing, Trade Surveillance)",
  "industry": "Industry vertical",
  "company_size": "startup | smb | mid-market | enterprise",
  "jurisdiction": "Primary jurisdiction (e.g., Hong Kong, Singapore, EU)",
  "risk_tier": "low | medium | high",
  "scenario": "Narrative description of the scenario. Be specific about what the AI agent can do, what the stakes are, and what the decision space looks like. Include confidence levels, time pressure, and blast radius where relevant.",
  "structured_context": {
    "subject": "Who/what is acting",
    "object": "What is being acted upon",
    "action": "The specific autonomous action under consideration",
    "regulatory_triggers": ["List of applicable regulations or frameworks"],
    "time_pressure": "Description of urgency",
    "confidence_signal": "What data supports the action",
    "reversibility": "Can the action be undone? At what cost?",
    "blast_radius": "Who/what is affected if the agent is wrong"
  },
  "reference_fingerprint": {
    "decision_reversibility": "A|B|C|D",
    "failure_blast_radius": "A|B|C|D",
    "regulatory_exposure": "A|B|C|D",
    "human_override_latency": "A|B|C|D",
    "data_confidence": "A|B|C|D",
    "accountability_chain": "A|B|C|D",
    "graceful_degradation": "A|B|C|D"
  },
  "reference_interpretation": "One-sentence summary of the gating decision and why",
  "jurisdiction_notes": "Relevant regulatory context",
  "contributor": {
    "vertical": "Industry vertical of the contributor",
    "company_size": "startup | smb | mid-market | enterprise",
    "role_category": "e.g., compliance, engineering, operations, risk, legal"
  }
}
```

### Scenario origin

The `origin` field tracks how the scenario was created. Be honest — we value all origins differently:

| Origin | Meaning | Review priority |
|--------|---------|-----------------|
| `industry-practitioner` | Based on a real decision you or your team faced (anonymized) | Highest — this is the gold standard |
| `llm-assisted` | You described a real situation and used an LLM to help structure/anonymize it | High — real experience, LLM-polished |
| `public-incident` | Based on a published enforcement action, news report, or case study (cite sources) | High — verifiable and educational |
| `llm-generated` | Primarily LLM-generated, possibly from a prompt like "give me a scenario about X" | Lower — accepted but tagged; useful for coverage gaps |
| `academic` | Created for teaching or research purposes | Moderate — good for edge cases and dimension stress-tests |

We won't reject scenarios based on origin, but `industry-practitioner` and `public-incident` submissions will be prioritized for promotion to the core scenario set. The tag lets us track dataset composition and avoid an LLM-echo-chamber problem where models are evaluated on scenarios that models wrote.
```

### Guidelines for good scenarios

**Do:**
- Describe a decision your organization has actually grappled with (anonymized)
- Include the tension — what makes this hard? Why can't a simple rule handle it?
- Provide a reference fingerprint with your best assessment of each dimension
- Include `structured_context` — it makes scenarios more useful for the structured input pipeline
- Note regulatory triggers specific to your jurisdiction

**Don't:**
- Submit hypothetical scenarios that read like textbook exercises — we want operational reality
- Copy existing scenarios with minor modifications
- Submit scenarios where the answer is obviously "all D" or "all A" — the interesting cases live in the middle
- Include any information that could identify your organization or specific transactions

### Scenario ID convention

Use the format: `vertical-domain-nnn`

Examples: `healthcare-triage-001`, `logistics-routing-003`, `banking-kyc-002`

### What happens after submission

1. We review for anonymization compliance (hard requirement)
2. We run the scenario through the existing model battery to generate baseline fingerprints
3. If the scenario adds genuine evaluation value (tests a new dimension tension, covers an underrepresented vertical), it gets merged into `contributions/scenarios/` and may be promoted to the core scenario set in a future release

---

## 2. Model Evaluation Results

Running ARA-Eval across different judge models helps the community understand which models are reliable for risk classification — and where they diverge.

### What we're measuring

- **Instruction following** — does the model return valid JSON matching the 7-dimension schema?
- **Judgement quality** — how closely do the model's risk classifications match human-authored reference fingerprints?
- **Persona consistency** — does the model produce meaningfully different classifications across the 3 ConFIRM personality variants?
- **Intra-rater reliability** — does the model produce the same answer when asked the same question multiple times?

### How to contribute a model run

1. **Run Lab 01** with your chosen model:
   ```bash
   ARA_MODEL=your-model/id python3 labs/lab-01-risk-fingerprinting.py --all
   ```

2. **Run Lab 03** (reliability) — at least 5 repetitions:
   ```bash
   ARA_MODEL=your-model/id python3 labs/lab-03-intra-rater-reliability.py
   ```

3. **Copy your results** into `contributions/models/`:
   ```
   contributions/models/<model-name>/
   ├── lab-01-output.json        # full fingerprinting results
   ├── lab-03-output.json        # reliability results
   └── metadata.json             # see template below
   ```

4. **Fill in `metadata.json`**:
   ```json
   {
     "model_id": "openrouter-model-id",
     "model_name": "Human-readable name",
     "provider": "Provider name",
     "run_date": "2026-03-15",
     "ara_eval_commit": "git commit hash you ran against",
     "openrouter_pricing": {
       "input_per_million": 0.07,
       "output_per_million": 0.10
     },
     "total_cost_usd": 0.003,
     "notes": "Any observations — retries needed, JSON formatting issues, etc."
   }
   ```

5. **Open a PR** with the title: `model: <model-name>`

### What makes a good model submission

- Run against the **full** scenario set (`--all` flag) so results are comparable
- Include Lab 03 reliability data — a model that scores well once but inconsistently is less useful than a consistent B-grade model
- Note any manual intervention required (e.g., "had to retry 4 of 18 calls due to malformed JSON")
- If the model required prompt modifications to produce valid output, describe what you changed

### What we'll do with it

Model results will be aggregated into a comparison table in `docs/models.md` showing per-model accuracy, reliability, and cost. The raw data stays in `contributions/models/` for anyone to analyze.

---

## Contributing Without a PR

Not everyone wants to write JSON and open pull requests. If you have a scenario to share but don't want to deal with the mechanics, you have two options:

### Option A: GitHub Issue (easiest)

Open an issue with the `scenario` label and answer these questions in plain text:

1. **What's the situation?** Describe the autonomous AI decision in a few sentences.
2. **What makes it hard?** Why can't a simple rule handle this?
3. **What industry and rough company size?** (e.g., "mid-size insurer" or "large bank")
4. **What jurisdiction?** Where does this operate?
5. **What's your role?** (e.g., compliance, engineering, operations — helps us understand the perspective)
6. **How was this created?** Real experience, based on a news story, LLM-assisted, etc.

We'll convert it to the JSON format, run it through the pipeline, and credit you in the PR.

### Option B: Google Form

*(Coming soon)* — a structured form that collects the same information without requiring a GitHub account.

---

## PR Process

1. Fork the repository
2. Create a branch: `model/<model-name>` or `scenario/<scenario-id>`
3. Add your files to the appropriate `contributions/` directory
4. Open a PR with a clear title and description
5. Ensure your submission passes the anonymization checklist below

### Anonymization checklist (for scenario PRs)

Include this in your PR description:

```
- [ ] No company names, product names, or brand-identifiable details
- [ ] No individual names
- [ ] Dollar amounts are rounded/representative, not traceable to specific transactions
- [ ] No internal system names or proprietary process descriptions
- [ ] No dates or details that identify a specific incident
- [ ] Industry vertical and company size band are included
- [ ] Jurisdiction is specified
```

---

## Questions?

Open an issue with the `question` label, or see the [framework specification](docs/framework.md) for rubric definitions and gating rules.
