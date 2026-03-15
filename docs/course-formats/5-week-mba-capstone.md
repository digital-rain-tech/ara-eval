# ARA-Eval: 5-Week MBA Capstone

**Agentic Readiness Assessment — When Can Enterprises Trust Autonomous AI?**

Course format for a 5-week MBA capstone module. Students produce risk fingerprints for financial services scenarios using an LLM judge, then critically evaluate the instrument they just used. The recursive structure is intentional: by using AI to evaluate AI autonomy, students discover LLM inconsistency, framing sensitivity, and perspective-dependence firsthand — not from a slide deck.

---

## Course Overview

| Component | Detail |
|-----------|--------|
| **Duration** | 5 weeks |
| **Workload** | ~6 hours/week (2 hrs lab + 4 hrs analysis/writing) |
| **Prerequisites** | Command line basics, Python environment setup. No ML background required. |
| **Deliverables** | 4 memos (Weeks 1--4) + 1 capstone presentation (Week 5) |
| **Grading** | Memos 60% (15% each) / Capstone 30% / Participation 10% |
| **API Cost** | ~$2--5 total per student across all labs (varies by model) |

### The 7 Dimensions

Every scenario is classified across seven risk dimensions, each rated A (highest risk) through D (lowest risk):

| # | Dimension | What It Captures |
|---|-----------|-----------------|
| 1 | **Decision Reversibility** | Can the action be undone? At what cost? |
| 2 | **Failure Blast Radius** | How many people, systems, or markets are affected if this goes wrong? |
| 3 | **Regulatory Exposure** | Is there a specific regulatory mandate governing this decision? |
| 4 | **Decision Time Pressure** | How much time does the situation allow before a decision must be made? |
| 5 | **Data Confidence** | Is the data complete, structured, and unambiguous? |
| 6 | **Accountability Chain** | Can we trace who is responsible and how the decision was made? |
| 7 | **Graceful Degradation** | What happens when the agent fails? Cascade or safe state? |

### Gating Rules

Classifications are not averages. Two hard gates override everything else:

- **Regulatory Exposure = A** --> Autonomy not permitted. Human-in-loop required.
- **Failure Blast Radius = A** --> Human oversight required. Supervised autonomy at most.

Any other dimension at Level A triggers a soft gate: autonomy is conditional on documented risk acceptance from an appropriate authority. This mirrors how aviation and nuclear safety handle automation decisions — a single critical dimension vetoes.

### Reference Fingerprints

Each scenario ships with a reference fingerprint. These are not "the LLM's answer." They were produced through a three-stage validation:

1. **Candidate generation** by Claude Opus 4.6 across multiple personality variants
2. **Professor review** against the rubric and regulatory context
3. **Industry partner validation** by practitioners in Hong Kong financial services

The reference is a benchmark for discussion, not a grade key. Reasonable professionals can disagree on individual dimensions — the question is whether the disagreement is principled.

---

## Technical Setup

All labs share the same environment. Set this up once in Week 1.

### Prerequisites

```bash
# Clone the repository
git clone <repository-url>
cd ara-eval

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows (Command Prompt)
# .venv\Scripts\Activate.ps1  # Windows (PowerShell)

# Install dependencies
pip install -r requirements.txt

# Configure API access
# Create .env.local with your OpenRouter API key:
echo "OPENROUTER_API_KEY=your-key-here" > .env.local
```

> **Tip:** You need to activate the virtual environment (`source .venv/bin/activate`) each time you open a new terminal before running the labs.

Get an API key at [openrouter.ai](https://openrouter.ai). The default model is `arcee-ai/trinity-large-preview:free`. Students can override with `ARA_MODEL=model-name` for the Week 4 model comparison.

### Scenario Library

| Set | Count | Default | Description |
|-----|-------|---------|-------------|
| Core | 6 | Yes | 1 low-risk, 2 medium-risk, 3 high-risk. Selected for maximum discrimination across dimensions. |
| Backup | 7 | `--all` flag | Real-incident-based scenarios for extra credit and validation. |

**Core scenarios:**

| Scenario | Why It's in the Core Set |
|----------|-------------------------|
| Banking customer service | Control case — trivially autonomous, near-all-D profile |
| Insurance claims processing | Single hard gate (Regulatory Exposure = A) on an otherwise permissive profile |
| GenAI data leakage prevention | The "messy middle" — maximum personality divergence expected |
| Claims denial (UnitedHealth/nH Predict) | Ethical tension — real-incident basis |
| Algo trading deployment (Knight Capital) | Time-pressure extreme — 5 A-level dimensions in reference |
| Cross-border model governance | Jurisdiction-sensitive — PIPL/PDPO cross-border transfer rules |

---

## Week 1: Framework and Dimensions

**Lab 01 — Risk Fingerprinting (core scenarios, generic jurisdiction)**

### Learning Objectives

- Interpret a 7-dimension risk fingerprint and explain what each dimension captures in a specific operational context
- Apply gating rules to determine whether a scenario is "ready now," "ready with prerequisites," or "human-in-loop required"
- Compare LLM-generated classifications against validated reference fingerprints and articulate where and why they diverge

### Lab Setup

```bash
# Run Lab 01 with core scenarios (6 scenarios x 3 personalities = 18 LLM calls)
python labs/lab-01-risk-fingerprinting.py

# Output: results/lab-01-output.json
```

The pipeline evaluates each scenario from three stakeholder perspectives (ConFIRM personality variants):

- **Compliance Officer** — regulatory risk, policy adherence, audit trail
- **Chief Risk Officer (CRO)** — enterprise risk, capital exposure, systemic impact
- **Operations Director** — operational feasibility, throughput, degradation paths

### Assignment

Open `results/lab-01-output.json` and review the fingerprints, gating classifications, and personality deltas.

**Part A — Fingerprint Interpretation (all 6 scenarios)**

For each scenario, answer:

1. What is the fingerprint string and resulting classification?
2. Which gating rules triggered, if any? Were they hard or soft gates?
3. Where did the three personality variants agree? Where did they disagree, and by how many levels?

Present this as a summary table — one row per scenario, columns for fingerprint, classification, and maximum personality spread.

**Part B — Deep Dive Memo (1 scenario of your choice)**

Write a 500--750 word executive memo on a single scenario, addressed to a Chief Operating Officer deciding whether to deploy the agent. Your memo should:

1. Explain the fingerprint in plain language — what does each dimension rating mean *for this specific scenario*?
2. Identify the binding constraint. Which dimension or gate is the reason this scenario can or cannot proceed?
3. Assess the personality deltas. Where stakeholders disagree, whose perspective should carry more weight for this decision, and why?
4. Recommend a path forward. If the classification is "human-in-loop required," what would need to change to move toward supervised autonomy?

### Deliverable

- Summary table (Part A) + executive memo (Part B)
- Format: PDF or Markdown, 2--3 pages total
- Due: End of Week 1

### Going Deeper

Run the full scenario set with `--all` and identify which backup scenario has the most personality disagreement. Draft a one-paragraph hypothesis for why that scenario produces divergence — what is ambiguous about it that different stakeholders would read differently?

**Bonus Exercise — Whose Clock Are You On?**

Decision Time Pressure (Dimension 4) depends on whose perspective you adopt. For the **claims-denial** and **genai-data-leakage** scenarios, rate Decision Time Pressure (A-D) from three perspectives:

1. **The system operator** (the company running the AI agent)
2. **The affected party** (the patient, customer, or data subject)
3. **The regulator** (the relevant supervisory authority)

Then argue in one paragraph: which perspective should the framework adopt, and why? Does the answer change by industry? Consider: in the UnitedHealth nH Predict case, the insurer's process ran on a 3-day reviewer turnaround (Level C), but the patient's health deteriorated during the wait — Gene Lokken's family paid $150,000 out-of-pocket before he died (Level B). The Samsung ChatGPT leak had no one harmed during the delay — the employee just waited a few seconds (Level C from all perspectives).

The point of this exercise is that every risk framework embeds a value judgment about whose interests to center. There is no "objective" rating.

---

## Week 2: Regulatory Grounding

**Lab 02 — Grounding Experiment (hk vs hk-grounded jurisdiction)**

### Learning Objectives

- Measure the empirical effect of providing regulatory citations (vs. regulation names only) on LLM risk classifications
- Develop hypotheses for why specific dimensions shift when grounding is introduced — distinguish between information effects and framing effects
- Evaluate the implications for how enterprises should structure prompts when using LLMs for compliance-adjacent tasks

### Lab Setup

```bash
# Run Lab 02 (6 scenarios x 3 personalities x 2 jurisdictions = 36 LLM calls)
python labs/lab-02-grounding-experiment.py

# Output: results/lab-02-grounding.json
```

Lab 02 runs each scenario twice:

- **Condition A (`hk`):** The LLM is told about HKMA, SFC, PCPD, and PIPL by name only
- **Condition B (`hk-grounded`):** The LLM receives the same names plus actual regulatory requirements, circular references, and enforcement precedents

The output includes per-dimension shifts (which dimensions moved, in which direction, by how many levels) for each scenario and personality.

### Assignment

**Part A — Shift Analysis**

Build a matrix: scenarios (rows) x dimensions (columns), with cells showing the direction and magnitude of shift when grounding is added (e.g., "B --> A, +1 stricter" or "no change"). Aggregate across personalities by taking the modal shift.

1. Which dimensions are most sensitive to grounding? Compute the percentage of scenario-personality pairs where each dimension changed.
2. Which dimensions are stable regardless of grounding? What does that stability tell you about the dimension?
3. Is there a direction bias — does grounding make the LLM systematically stricter, looser, or is the effect mixed?

**Part B — Hypothesis Memo (750--1,000 words)**

For the two scenarios that showed the largest grounding effect, write an analytical memo:

1. What shifted, and by how much? Quote the specific fingerprint changes.
2. Why did it shift? Was this an *information effect* (the LLM genuinely did not know the regulation) or a *framing effect* (the citation made existing knowledge more salient)? How would you distinguish between the two?
3. What does this mean for production use? If you were deploying an LLM for compliance review at a Hong Kong bank, would you invest in building grounded prompts with full regulatory citations? What is the cost-benefit?
4. Where did grounding *not* help? Identify at least one scenario where the grounded condition produced a worse (less accurate relative to reference) classification. What went wrong?

### Deliverable

- Shift matrix (Part A) + analytical memo (Part B)
- Format: PDF or Markdown, 3--4 pages total
- Due: End of Week 2

### Going Deeper

#### Option A: Extended Grounding Analysis

Run Lab 02 with `--all` to include backup scenarios. The `cross-border-model-001` scenario involves PIPL Articles 38--43 and the GBA Standard Contract for cross-boundary data flows — highly technical regulatory content.

Compare its grounding delta against simpler scenarios. Does the LLM benefit more from grounding when the regulation is more obscure? Write a one-page analysis.

#### Option B: Structured Input Experiment

The core scenarios include a `structured_context` field that decomposes the narrative into subject, object, action, regulatory triggers, and other structured metadata. Run Lab 01 with the `--structured` flag to inject this context into the prompt alongside the narrative:

```bash
# Narrative only (your Week 1 baseline)
python labs/lab-01-risk-fingerprinting.py

# Narrative + structured context
python labs/lab-01-risk-fingerprinting.py --structured
```

Compare the two runs:

1. Did structured context improve accuracy against reference fingerprints? Which dimensions benefited most?
2. Did it reduce personality variance? (Structured inputs should anchor all three stakeholders on the same facts.)
3. The structured context was authored by humans. In practice, you would use an LLM to extract it from the narrative. What happens if the structuring LLM misses the same regulatory trigger the judge LLM misses — have you automated your blind spot?

This connects directly to the grounding experiment: regulatory citations (Lab 02) and structured context are both ways of telling the LLM what to pay attention to. Which is more effective, and why?

---

## Week 3: Reliability and Trust

**Lab 03 — Intra-Rater Reliability (5 repetitions)**

### Learning Objectives

- Quantify the consistency of an LLM judge by measuring agreement rates across repeated evaluations of identical inputs
- Identify which dimensions and scenarios are most susceptible to classification instability
- Assess whether an LLM-based evaluation instrument meets the reliability threshold you would require before using it in a production governance process

### Lab Setup

```bash
# Run Lab 03 with 5 repetitions (6 scenarios x 3 personalities x 5 reps = 90 LLM calls)
python labs/lab-03-intra-rater-reliability.py --repetitions 5

# Output: results/lab-03-reliability.json
```

Lab 03 runs each scenario-personality pair five times with identical prompts and computes per-dimension agreement rates: what percentage of runs produced the same classification?

### Assignment

**Part A — Reliability Dashboard**

From `results/lab-03-reliability.json`, construct:

1. **Dimension reliability table.** For each of the 7 dimensions, compute the average agreement rate across all scenario-personality pairs. Rank dimensions from most to least reliable.
2. **Scenario reliability table.** For each scenario, compute the average agreement rate across all dimensions and personalities. Which scenarios does the LLM classify most consistently? Which are volatile?
3. **Unanimity rate.** What percentage of dimension-scenario-personality cells achieved perfect agreement (5/5 identical classifications)?

**Part B — Deployment Implications Memo (750--1,000 words)**

You are the Head of AI Governance at a Hong Kong bank. Your team has just completed this reliability study. Write a memo to the Chief Risk Officer:

1. Is this instrument reliable enough to use in production risk assessments? Define what "reliable enough" means — pick a threshold and defend it. (Hint: medical diagnostics, credit scoring, and judicial risk assessment all have published reliability standards. What is the relevant comparator for your use case?)
2. Which dimensions would you trust for automated classification, and which would you flag for mandatory human review? Use your data to draw the line.
3. The LLM classifies `banking-customer-service-001` (the trivially low-risk scenario) with near-perfect agreement and `algo-trading-deployment-001` with more variance. Why? Is the variance a bug or a feature — does it tell you something real about the difficulty of the classification task?
4. If you needed to improve reliability, what would you try? Consider: temperature settings, prompt engineering, ensemble methods (multiple models voting), or restricting the LLM to binary rather than 4-level classifications.

### Deliverable

- Reliability dashboard (Part A) + governance memo (Part B)
- Format: PDF or Markdown, 3--4 pages total
- Due: End of Week 3

### Going Deeper

Run Lab 03 with 10 repetitions on a single high-risk scenario (`python labs/lab-03-intra-rater-reliability.py --repetitions 10 --scenarios algo-trading-deployment-001`). Does the agreement distribution stabilize, or does more data reveal more variance? Compute Cohen's kappa (provided in the output) and compare it against published inter-rater reliability benchmarks in your field.

---

## Week 4: Model Comparison

**Lab 01 — Run with two different models**

### Learning Objectives

- Compare risk classifications across different LLM architectures on the same evaluation task, holding prompts constant
- Analyze the cost-accuracy-reliability tradeoff between models for a specific enterprise governance application
- Develop a recommendation framework for model selection that goes beyond benchmark leaderboards

### Lab Setup

```bash
# Run Lab 01 with the default model
python labs/lab-01-risk-fingerprinting.py
# Note the output file: results/lab-01-<model-slug>-<timestamp>.json

# Run Lab 01 with a different model
ARA_MODEL=<your-chosen-model> python labs/lab-01-risk-fingerprinting.py
# See docs/models.md for current model recommendations and pricing

# Compare the two output files
```

Choose your second model based on what question interests you most:

| If you want to explore... | Try |
|--------------------------|-----|
| Premium vs. budget tradeoff | A premium model vs. a free-tier model (see `docs/models.md` for current options) |
| Provider differences | Two models from different providers at a similar tier |
| Size-performance scaling | Two models from the same family at different sizes |

### Assignment

**Cost-Accuracy Tradeoff Memo (1,000--1,250 words)**

Addressed to a VP of Engineering evaluating which model to deploy for an internal AI governance tool:

1. **Accuracy comparison.** For each scenario, how do the two models' fingerprints compare to each other and to the reference? Build a table: scenario, Model A fingerprint, Model B fingerprint, reference fingerprint, number of dimension-level disagreements between each model and the reference.

2. **Where do they disagree with each other?** Identify the dimensions and scenarios where the two models diverge. Are the disagreements on "easy" dimensions (where the reference is clearly D or clearly A) or on "hard" dimensions (B/C boundary)? What does the pattern tell you about model strengths?

3. **Cost analysis.** Using the token counts and cost data from each run (logged in the output JSON and in `results/ara-eval.db`), compute:
   - Cost per scenario-evaluation
   - Cost per fingerprint
   - Projected cost for 100 scenarios/month, 1,000 scenarios/month

4. **Recommendation.** Given the accuracy-cost tradeoff, which model would you recommend for (a) a production governance tool running daily, (b) a quarterly audit review, and (c) an exploratory research tool? Justify each recommendation differently — the cost sensitivity and accuracy requirements differ by use case.

5. **Limitations of this comparison.** You tested 6 scenarios with 3 personalities each. Is that enough to draw conclusions? What would a more rigorous model evaluation look like?

### Deliverable

- Cost-accuracy tradeoff memo
- Format: PDF or Markdown, 3--4 pages including tables
- Due: End of Week 4

### Going Deeper

Run Lab 03 (reliability) with your second model and compare intra-rater agreement rates between models. Is the more expensive model more consistent? If a cheaper model is equally reliable but less accurate relative to reference, would you prefer it to a more accurate but less consistent expensive model? Write a one-page analysis on the reliability-accuracy distinction.

---

## Week 5: Capstone — Design, Predict, Run, Present

### Learning Objectives

- Apply the ARA-Eval framework to a novel domain by authoring an original scenario with a predicted risk fingerprint
- Demonstrate judgment about where AI autonomy is and is not appropriate, grounded in the 7-dimension rubric
- Critically evaluate the gap between your expert prediction and the LLM's output — and explain which one is more defensible

### Assignment

**Design a scenario from your industry or domain of expertise.** This is where the course becomes personal. You know something the LLM does not — the operational reality of your field.

#### Step 1: Author the Scenario

Write a scenario in the same format as the starter scenarios. It must include:

- A specific operational decision an AI agent could make autonomously
- Enough domain context for the LLM (and your classmates) to evaluate it
- At least one genuine tension — a dimension where reasonable people would disagree on the level
- Jurisdiction notes (use Hong Kong financial services context, or propose an equivalent regulatory environment for your industry)

Add your scenario to a new JSON file: `scenarios/custom/<your-name>.json`

#### Step 2: Predict the Fingerprint

Before running the LLM, write your own reference fingerprint with reasoning for each dimension. This is your expert judgment. Commit to it in writing — no revisions after seeing the LLM output.

#### Step 3: Run the Evaluation

```bash
# Run your custom scenario through Lab 01
# (You'll need to modify the scenario path or add your scenario to starter-scenarios.json)
python labs/lab-01-risk-fingerprinting.py
```

#### Step 4: Analyze the Gap

Compare your predicted fingerprint against the LLM's output across all three personality variants.

#### Step 5: Present

Prepare a 10-minute presentation for the class:

1. **The Scenario (2 min).** What is the operational context? Why does this decision matter?
2. **Your Prediction (2 min).** Walk through your fingerprint. Which dimensions were hardest to classify? Where did you hesitate?
3. **The LLM's Output (3 min).** Where did the LLM agree and disagree with you? Where did the personality variants diverge? Show the actual fingerprint strings.
4. **The Verdict (3 min).** When you and the LLM disagree, who is right — and how would you resolve it? What does this scenario reveal about the limits (or strengths) of LLM-assisted risk assessment?

### Deliverable

- Written scenario + predicted fingerprint + LLM output comparison (2--3 pages)
- Presentation slides (10 minutes)
- Due: Week 5 class session

### Going Deeper

Run your scenario through Lab 02 (grounding) and Lab 03 (reliability). Does the LLM's classification of your custom scenario improve with grounding? Is it consistent across repetitions?

If you designed a scenario that exploits a domain the LLM knows poorly, the reliability results will be revealing. Write a one-page appendix on what the grounding and reliability results tell you about the LLM's competence in your domain.

---

## Assessment Rubric

All written deliverables are evaluated on:

| Criterion | Weight | What Distinguishes an A |
|-----------|--------|------------------------|
| **Analytical rigor** | 40% | Claims are supported by data from the lab output. Quantitative where appropriate. Doesn't just describe what the model said — explains why. |
| **Critical judgment** | 30% | Identifies limitations, questions assumptions, distinguishes correlation from causation. Doesn't treat the LLM's output or the reference fingerprint as ground truth. |
| **Professional communication** | 20% | Written as a memo or briefing a senior stakeholder would actually read. Clear structure, no jargon without definition, actionable recommendations. |
| **Technical execution** | 10% | Labs ran successfully, results are correctly interpreted, tables and data are accurate. |

### A Note on the Reference Fingerprints

The reference fingerprints are a starting point for analysis, not an answer key. If your LLM's output matches the reference perfectly, that is interesting — but not automatically correct. If it diverges, the question is whether the LLM's reasoning or the reference reasoning is more defensible for that dimension. The strongest submissions will engage with the *reasoning* behind classifications, not just the letter grades.

---

## Appendix: Call Budget and Cost Estimates

Assuming core scenarios only (6 scenarios, 3 personalities):

| Week | Lab | Formula | LLM Calls |
|------|-----|---------|-----------|
| 1 | Lab 01 | 6 x 3 | 18 |
| 2 | Lab 02 | 6 x 3 x 2 jurisdictions | 36 |
| 3 | Lab 03 | 6 x 3 x 5 repetitions | 90 |
| 4 | Lab 01 x 2 models | 6 x 3 x 2 | 36 |
| 5 | Lab 01 (custom scenario) | 1 x 3 | 3 |
| | **Total** | | **183** |

At approximately $0.01--0.03 per call (varies by model), total cost per student is roughly **$2--5** for the full course.

## Appendix: Key Commands Reference

```bash
# Lab 01 — Risk Fingerprinting
python labs/lab-01-risk-fingerprinting.py              # Core scenarios (6)
python labs/lab-01-risk-fingerprinting.py --all         # All scenarios (13)
python labs/lab-01-risk-fingerprinting.py --structured  # Core scenarios with structured context

# Lab 02 — Regulatory Grounding
python labs/lab-02-grounding-experiment.py              # Core scenarios
python labs/lab-02-grounding-experiment.py --all        # All scenarios

# Lab 03 — Intra-Rater Reliability
python labs/lab-03-intra-rater-reliability.py --repetitions 5       # Core, 5 reps
python labs/lab-03-intra-rater-reliability.py --repetitions 10 \
    --scenarios algo-trading-deployment-001                         # Single scenario, 10 reps

# Override model
ARA_MODEL=anthropic/claude-sonnet-4 python labs/lab-01-risk-fingerprinting.py

# Results
ls results/                    # All output files
cat results/lab-01-output.json # Latest Lab 01 results (symlink)
```
