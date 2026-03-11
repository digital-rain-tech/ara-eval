# ARA-Eval Labs

## Lab 01: Risk Fingerprinting with LLM-Assisted Evaluation

**Week 3 exercise** — Scenario Modeling & LLM Eval

Students run pre-built scenarios through an LLM judge using the 7-dimension rubric, then apply gating rules programmatically to determine autonomy readiness. ConFIRM-based personality variants reveal where stakeholder archetypes disagree.

### Setup

```bash
pip install anthropic python-dotenv
export ANTHROPIC_API_KEY=your-key-here
```

### Run

```bash
python labs/lab-01-risk-fingerprinting.py
```

### What Students Do

1. **Run the pipeline** on 6 starter scenarios across 3 personality variants (18 evaluations total)
2. **Compare LLM output** against reference fingerprints — where does the judge agree/disagree with the human-authored classifications?
3. **Analyze personality deltas** — on which dimensions do the compliance officer, CRO, and operations director disagree most?
4. **Write 2 new scenarios** adapted to a specific partner's domain, add them to `scenarios/starter-scenarios.json`, and re-run

### What Students Submit

- The `results/lab-01-output.json` file
- A 1-page analysis answering:
  - Which dimensions showed the most personality-variant disagreement? Why?
  - Where did the LLM judge diverge from reference fingerprints? What does this tell you about LLM evaluation reliability for governance assessment?
  - For your 2 new scenarios: what risk fingerprints emerged, and were they surprising?

### Learning Objectives

- Implement and run an LLM-as-judge evaluation pipeline
- Understand how structured rubrics constrain LLM output for reproducibility
- Experience how stakeholder perspective changes risk assessment (ConFIRM methodology)
- Apply deterministic gating rules to probabilistic LLM classifications
- Calibrate LLM output against human expert judgment
