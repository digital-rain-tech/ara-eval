# ARA-Eval Labs

## Lab 01: Risk Fingerprinting with LLM-Assisted Evaluation

Run pre-built scenarios through an LLM judge using the 7-dimension rubric, then apply gating rules programmatically to determine autonomy readiness. ConFIRM-based personality variants reveal where stakeholder archetypes disagree.

### Setup

```bash
pip install -r requirements.txt
```

Add your OpenRouter API key to `.env.local`:
```
OPENROUTER_API_KEY=your-key-here
```

### Run

```bash
python labs/lab-01-risk-fingerprinting.py
```

### Exercises

1. **Run the pipeline** on 6 starter scenarios across 3 personality variants (18 evaluations total)
2. **Compare LLM output** against reference fingerprints — where does the judge agree/disagree?
3. **Analyze personality deltas** — on which dimensions do the compliance officer, CRO, and operations director disagree most?
4. **Write new scenarios** for a specific domain, add them to `scenarios/starter-scenarios.json`, and re-run

### Key Questions

- Which dimensions show the most personality-variant disagreement? Why?
- Where does the LLM judge diverge from reference fingerprints? What does this reveal about LLM evaluation reliability for governance assessment?
- For new scenarios: what risk fingerprints emerge, and are they surprising?

---

## Lab 02: Regulatory Grounding Experiment

Does giving the LLM judge actual regulatory requirements — instead of just framework names — change how it classifies risk?

### Run

```bash
python labs/lab-02-grounding-experiment.py
```

Runs the same 6 scenarios × 3 personalities under two conditions:
- **Condition A** (`hk`): jurisdiction prompt lists framework names only (e.g., "HKMA BDAI/GenAI circulars")
- **Condition B** (`hk-grounded`): jurisdiction prompt includes actual requirements (e.g., "Fully autonomous AI decision-making is prohibited in banking")

### Key Questions

- Which dimensions shift most when grounding is added? Is it Regulatory Exposure, or do other dimensions move too?
- Does grounding make the judge stricter or looser? Is the effect uniform across personalities?
- For which scenarios does grounding change the readiness classification (e.g., from "ready with prerequisites" to "human-in-loop required")?
- What does this reveal about how much the LLM "knows" vs. what it needs to be told?

---

## Lab 03: Intra-Rater Reliability

Does the LLM judge agree with itself? If the same scenario × personality produces different fingerprints on repeated runs, the instrument is unreliable and nothing else we test matters.

### Run

```bash
python labs/lab-03-intra-rater-reliability.py
python labs/lab-03-intra-rater-reliability.py --repetitions 5
python labs/lab-03-intra-rater-reliability.py --scenarios banking-fraud-001,banking-customer-service-001
```

Runs each scenario × personality N times (default 5) and reports:
- Per-dimension agreement rate (how often the modal classification appears)
- Which dimensions are most unstable
- Which scenario × personality cells are perfectly stable vs noisy

### Key Questions

- Which dimensions are most stable? Which are noisiest?
- Are "easy" scenarios (all-D) more stable than "hard" scenarios (mixed A/B/C)?
- What agreement rate is acceptable for a governance framework? (Hint: if it's below 80%, the framework has a reliability problem)
- Does stability vary by personality? Are some stakeholder perspectives more deterministic than others?

---

## Lab 04: Inter-Model Comparison

Compare risk fingerprints across multiple judge models. Reads from `results/reference/` — no API calls needed.

### Run

```bash
python labs/lab-04-inter-model-comparison.py
```

Scores each model on gate accuracy, dimension match rate, and personality differentiation against human-authored reference fingerprints.

### Key Questions

- Do different models fire the same hard gates? If not, is the model choice a policy decision?
- Which model is most calibrated to the reference? Which is most aggressive?
- Which dimensions show the most inter-model variance? Are those the same dimensions that are noisy in Lab 03?

---

## Lab 05: Build Your Own Scenario

Write a scenario from a real-world case, predict its fingerprint, run it through the pipeline, and compare your prediction against the LLM judge.

### Workflow

```bash
# 1. Create a scenario template
python labs/lab-05-build-your-own-scenario.py --init my-scenario-001

# 2. Edit scenarios/custom/my-scenario-001.json (fill in the blanks)

# 3. Predict your fingerprint BEFORE running the model
python labs/lab-05-build-your-own-scenario.py --predict my-scenario-001

# 4. Run the model
python labs/lab-05-build-your-own-scenario.py --run my-scenario-001

# 5. Compare your prediction vs the model
python labs/lab-05-build-your-own-scenario.py --compare my-scenario-001
```

### Key Questions

- Where did you and the model disagree? What information were you weighing differently?
- Would you change your prediction after seeing the model's output? Why or why not?
- If you were writing the reference fingerprint for other students, what would you set?

---

## Rubric Variants

Three rubric detail levels are available for ablation experiments:

| Rubric | Detail Level | File |
|--------|-------------|------|
| **Full** | Dimension names, definitions, A/B/C/D anchors with examples | `prompts/rubric.md` |
| **Compact** | Dimension names, A/B/C/D labels, one-line definitions | `prompts/rubric-compact.md` |
| **Bare** | Dimension names only, no definitions or examples | `prompts/rubric-bare.md` |

Pass `rubric="rubric-compact.md"` or `rubric="rubric-bare.md"` to `evaluate_scenario()`.

## Jurisdiction Variants

| Jurisdiction | Detail Level | File |
|-------------|-------------|------|
| `generic` | No jurisdiction-specific context (control) | `prompts/jurisdictions/generic.md` |
| `hk` | Framework names only | `prompts/jurisdictions/hk.md` |
| `hk-grounded` | Full regulatory requirements | `prompts/jurisdictions/hk-grounded.md` |
