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
