# ARA-Eval: 10-Week Undergraduate Course Format

## Course Overview

**Course Title:** Autonomous AI in Financial Services: Risk, Regulation, and Judgment

**Level:** Undergraduate (3rd/4th year)

**Prerequisites:** Introduction to AI/ML concepts; introductory statistics; no programming experience required (pipeline is pre-built)

**Format:** 10 weeks, one 2-hour session per week + independent work

**Description:**
This course teaches students to evaluate whether AI agents should be trusted with autonomous decisions in regulated industries. Students use the ARA-Eval framework to produce 7-dimension risk fingerprints for real-world financial services scenarios, employing an LLM judge to classify risk (see dimension table below). Each dimension is rated A (highest risk) through D (lowest risk), and deterministic gating rules translate fingerprints into deployment recommendations.

The course embodies a recursive pedagogy: students use AI to evaluate AI autonomy. In doing so, they discover firsthand that LLM judges are inconsistent, framing-sensitive, and perspective-dependent. These are not bugs in the course design --- they are the lessons.

**Pedagogical Philosophy:**

- **Weeks 1--4 (Foundation):** Risk dimensions, fingerprinting, and stakeholder perspectives
- **Weeks 5--7 (Experimental Design):** Measure how regulatory grounding, repetition, and model choice affect classifications
- **Weeks 8--10 (Synthesis):** Independent analysis, scenario design, and a final portfolio with policy recommendations

Complexity is scaffolded deliberately --- each week builds on prior work, and no week requires skills not practiced in a previous week.

---

## Grading Breakdown

| Component | Weight | Details |
|-----------|--------|---------|
| Weekly Assignments (Weeks 1--9) | 50% | Nine assignments, weighted equally. Each includes specific deliverables described below. |
| Final Portfolio (Week 10) | 30% | Compiled analysis across all three labs, with a policy recommendation and reflection. |
| Participation | 20% | In-class discussion, peer review contributions, and engagement with weekly readings. |

**Late Policy Suggestion:** One assignment may be submitted up to 48 hours late without penalty. Beyond that, 10% per day.

---

## Lab Infrastructure

All three labs are pre-built Python pipelines. Students run them from the command line --- no coding required unless they choose to modify scenarios. The pipeline calls an LLM judge via OpenRouter and logs all results to a SQLite database and JSON output files.

**Setup (completed before Week 2):**
1. Install Python 3.10+
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # macOS / Linux
   # .venv\Scripts\activate    # Windows (Command Prompt)
   # .venv\Scripts\Activate.ps1  # Windows (PowerShell)
   ```
   > **Important:** You need to activate the virtual environment each time you open a new terminal before running the labs.
3. Install dependencies: `pip install -r requirements.txt`
4. Obtain an OpenRouter API key (free-tier models available; paid models recommended from Week 7)
5. Create `.env.local` with `OPENROUTER_API_KEY=<key>`
6. Verify setup: `python labs/lab-01-risk-fingerprinting.py` (should produce `results/lab-01-output.json`)

**Cost:** The default model (`arcee-ai/trinity-large-preview:free`) is free. Even premium models cost under $1 per run. For the model comparison in Week 7, students should use a paid model (e.g., `ARA_MODEL=qwen/qwen3-235b-a22b-2507`) alongside the default.

**Resilience:** All results are saved locally (JSON + SQLite). If the API is unavailable during a session, students can work with previously generated results or retry later --- no work is lost. For large classes, stagger lab runs across a window rather than having 100 students hit the API simultaneously.

---

## The 7 Dimensions

For reference throughout the course. Each dimension is classified A--D, where A is the highest risk.

| Dimension | A (Highest Risk) | D (Lowest Risk) |
|-----------|-------------------|------------------|
| **Decision Reversibility** | Irreversible | Fully reversible / sandboxed |
| **Failure Blast Radius** | Systemic (many users/markets) | Internal / test domain |
| **Regulatory Exposure** | Direct regulatory mandate | Unregulated domain |
| **Human Override Latency** | Override impossible in time | No time pressure |
| **Data Confidence** | Ambiguous / conflicting signals | High-confidence structured data |
| **Accountability Chain** | No clear accountability | Full transparency |
| **Graceful Degradation** | Cascading failure | Safe failure to known state |

**Gating Rules (deterministic, applied programmatically --- never by the LLM):**
- **Hard Gate 1:** Regulatory Exposure = A --> Autonomy not permitted. Human-in-loop required.
- **Hard Gate 2:** Failure Blast Radius = A --> Human oversight required.
- **Soft Gate:** Any other dimension = A --> Requires documented risk acceptance.
- **Full Autonomy Candidate:** All dimensions >= C.

---

## Week-by-Week Curriculum

---

### Week 1: What is Autonomous AI?

**Learning Objectives:**
- Define autonomous AI and distinguish it from AI-assisted and AI-augmented decision-making
- Identify real-world examples of autonomous systems and articulate what makes them autonomous
- Recognize why financial services regulators treat AI autonomy differently from other industries

**Pre-Class Preparation:**
- Read: ADR-004 (The Recursive Pedagogy) from the ARA-Eval repository --- this is short and sets the tone for the entire course
- Read: HKMA High-Level Principles on AI (summary sections only; full document available in `docs/sources/`)
- Skim: One news article about an AI failure in financial services (Knight Capital, UnitedHealth, or Samsung ChatGPT leak --- source summaries available in `docs/sources/`)

**In-Class Activity (90 minutes):**
1. **Opening discussion (20 min):** What makes a system "autonomous"? Is a spam filter autonomous? A self-driving car? A chatbot that can issue refunds? Draw a spectrum on the board from "tool" to "agent" and place examples along it.
2. **Case walkthrough (30 min):** Present the Knight Capital incident ($440M loss in 45 minutes). Walk through what happened, why human override was too slow, and what a risk assessment framework would have flagged. This introduces the idea that risk is not a single number --- it has dimensions.
3. **Framework introduction (20 min):** Introduce the 7 ARA-Eval dimensions at a high level. Do not explain the A--D levels yet --- just the dimension names and why each matters. Ask: "If you had to evaluate whether an AI should make this decision alone, what questions would you ask?" Map student responses to the 7 dimensions.
4. **Pair exercise (20 min):** In pairs, students identify 3 autonomous or semi-autonomous systems they interact with daily (e.g., recommendation algorithms, autocorrect, credit scoring, route optimization). For each, they informally rate: "How comfortable are you with this system making decisions without a human?" and "What would go wrong if it made a mistake?"

**Assignment:**
Write a 500-word reflection identifying 3 autonomous systems in your daily life. For each system:
- Describe what decisions it makes without human intervention
- Explain what would happen if it made a serious error
- Argue whether you think it *should* be autonomous, and *why*

The "why" is more important than the "what." Do not just describe the systems --- take a position and defend it.

**Deliverable Format:** 500-word written reflection, submitted as PDF or plain text. Graded on quality of reasoning, not on "correct" answers.

---

### Week 2: Risk Dimensions (Introduction to Lab 01)

**Learning Objectives:**
- Explain each of the 7 ARA-Eval dimensions and distinguish between A, B, C, and D levels using concrete examples
- Run Lab 01 on 3 core scenarios and interpret the resulting fingerprints
- Articulate personal reasoning for each dimension classification, independent of what the LLM produced

**Pre-Class Preparation:**
- Read: `docs/framework.md` (the full ARA Framework Specification --- study the dimension tables carefully)
- Complete: Technical setup (Python, OpenRouter API key, `.env.local`). Verify by running `python labs/lab-01-risk-fingerprinting.py` and confirming output appears in `results/`
- Review: The 3 scenarios that will be evaluated (instructor will specify which 3 core scenarios to use; recommended: `banking-customer-service-001`, `insurance-claims-001`, `genai-data-leakage-001`)

**In-Class Activity (90 minutes):**
1. **Dimension deep-dive (30 min):** Walk through each dimension's A--D levels using the framework specification tables. For each dimension, present two contrasting examples and ask students to classify them. Emphasize that A--D are ordinal labels with narrative anchors, not numerical scores.
2. **Live demo (15 min):** Run Lab 01 on one scenario with the class watching. Show the command, the output JSON, the fingerprint string, and the gating rule result. Explain that the LLM judge uses one of three stakeholder personalities (compliance officer, CRO, operations director) for each evaluation.
3. **Hands-on lab (30 min):** Students run Lab 01 on 3 core scenarios. They should examine the output, identify the fingerprint for each scenario-personality combination, and note where the three personalities agree and disagree.
4. **Discussion (15 min):** Which scenarios were easy to classify? Which were hard? Did the LLM produce any classifications that surprised you?

**Assignment:**
For each of the 3 scenarios evaluated, create a table with all 7 dimensions. In each cell, record:
- The LLM's classification (from Lab 01 output)
- Your own classification (your independent judgment)
- A 1-sentence explanation of your reasoning

Then answer these questions:
1. For which dimensions did you agree with the LLM? Why do you think you converged?
2. For which dimensions did you disagree? What information or reasoning led you to a different conclusion?
3. Which dimension was hardest to classify, and why?

**Deliverable Format:** Annotated dimension table (spreadsheet or formatted document) + 300-word written response to the three questions.

**Extra Credit:** Before looking at the LLM output, write down your predicted fingerprint for each scenario. Then compare. How close were you? What does this tell you about your own risk intuitions?

---

### Week 3: Full Core Set

**Learning Objectives:**
- Evaluate all 6 core scenarios and identify patterns across risk tiers (low, medium, high)
- Explain how gating rules translate multi-dimensional profiles into deployment recommendations
- Recognize that risk fingerprints are not averages --- a single A-level dimension can override everything else

**Pre-Class Preparation:**
- Read: ADR-003 (Core vs Backup Scenario Split) --- understand why these 6 scenarios were chosen and what properties the core set has
- Review: Your Week 2 annotations. Be prepared to discuss how your reasoning has evolved after studying the framework more carefully

**In-Class Activity (90 minutes):**
1. **Scenario review (20 min):** Briefly discuss each of the 6 core scenarios. For each, ask one student to predict the risk tier before seeing results. Track predictions on the board.
2. **Lab run + analysis (30 min):** Students run Lab 01 on all 6 core scenarios. They organize results into a fingerprint matrix: scenarios as rows, dimensions as columns, cells showing the modal classification across the 3 personalities.
3. **Gating rules exercise (20 min):** For each scenario, students manually apply the gating rules. Identify which scenarios trigger hard gates, which trigger soft gates, and which qualify for full autonomy. Compare their manual application to the pipeline's programmatic output.
4. **Pattern discussion (20 min):** What patterns emerge across the 6 scenarios? Do certain dimensions cluster together? Is there a scenario where the gating rules produce a surprising result?

**Assignment:**
Produce a complete fingerprint matrix for all 6 core scenarios (all 3 personality variants). Then:

1. Identify which scenarios trigger hard gates and explain *why* the framework treats Regulatory Exposure = A and Blast Radius = A as non-negotiable overrides. What would go wrong if these were soft gates instead?
2. Find at least one scenario where the overall fingerprint "looks" moderate (mostly B and C levels) but the gating rules still block autonomy. Explain why the framework is designed to behave this way. Do you agree with this design choice?
3. Compare the low-risk scenario (`banking-customer-service-001`) to the highest-risk scenario in the set. What makes customer service safe for autonomy that is absent in the high-risk case? Be specific about dimensions, not just "it's less risky."

**Deliverable Format:** Fingerprint matrix (table format) + 600-word written analysis addressing all three questions.

**Extra Credit:** The framework specification says gating rules work "like a decision tree, not a weighted average --- mirroring how aviation, nuclear safety, and medicine handle automation decisions." Research one example from aviation or medicine where a single factor overrides all others (e.g., a no-go criterion for flight, a contraindication for a drug). Write a 200-word comparison to ARA-Eval's hard gates.

---

### Week 4: Stakeholder Perspectives

**Learning Objectives:**
- Analyze personality deltas across the three ConFIRM variants (compliance officer, CRO, operations director) and explain *why* stakeholders disagree
- Evaluate whether stakeholder disagreement reflects legitimate differences in priorities or flawed reasoning
- Construct an argument for a specific deployment recommendation when stakeholders disagree

**Pre-Class Preparation:**
- Read: The three personality prompt files in the ARA-Eval repository (`prompts/personalities/`) --- understand what each stakeholder is told to prioritize
- Re-examine: Your Week 3 fingerprint matrix, specifically the cases where personalities produced different classifications

**In-Class Activity (90 minutes):**
1. **Personality prompt analysis (20 min):** Display the three personality prompts side by side. Ask: What does each stakeholder care about most? Where should their priorities lead them to diverge? Where should they agree?
2. **Delta analysis (30 min):** Students compute personality deltas for all 6 core scenarios: for each dimension, note where the compliance officer, CRO, and operations director produced different classifications. Identify the dimensions with the most disagreement and the dimensions with the most consensus.
3. **Role-play debate (25 min):** Divide the class into three groups (one per personality). Present a scenario where the three stakeholders disagree. Each group argues for their classification. After the debate, the class votes on which position they find most compelling and discusses why.
4. **Reflection (15 min):** ADR-004 notes that "the 'right' classification depends on who's asking." Is this a problem for the framework, or a feature? Can a risk assessment framework be useful if different stakeholders produce different answers?

**Assignment:**
Write a 750-word essay addressing: **Why do stakeholders disagree about AI risk, and what should organizations do about it?**

Your essay must:
- Use specific evidence from your Lab 01 results (cite at least 2 scenarios where personality variants diverged)
- Explain what each stakeholder is optimizing for and why their optimization targets lead to different risk classifications
- Propose a process for resolving stakeholder disagreement in practice --- not "everyone should agree," but a realistic governance mechanism
- Address whether the LLM is genuinely simulating stakeholder perspectives or merely following instructions to be more/less conservative (this is an honest question --- ADR-002 raises this concern)

**Deliverable Format:** 750-word essay, submitted as PDF. Graded on argument quality, use of evidence, and engagement with the "is the LLM really simulating perspectives?" question.

---

### Week 5: Regulatory Context (Lab 02)

**Learning Objectives:**
- Run Lab 02 and compare classifications under generic, HK-names-only, and HK-grounded jurisdiction conditions
- Measure and interpret classification shifts caused by regulatory grounding
- Argue whether regulatory context improves or merely biases AI risk assessment

**Pre-Class Preparation:**
- Read: One regulatory source document from `docs/sources/` relevant to a core scenario (e.g., the SFC Circular 24EC55 summary for advisory scenarios, or the HKMA GenAI Sandbox report)
- Read: `docs/models.md` --- the "Selection Criteria" section, to understand what we mean by "regulatory nuance" in model capability
- Review: Your Week 3 fingerprint matrix (this is your baseline for measuring grounding effects)

**In-Class Activity (90 minutes):**
1. **Regulatory landscape overview (25 min):** Brief introduction to the Hong Kong financial regulatory environment: HKMA (banking), SFC (securities), PCPD (data privacy), and PIPL (mainland cross-border data). Students do not need to become regulatory experts --- the goal is to understand that different regulators have different mandates and that regulatory specificity matters.
2. **Lab 02 walkthrough (15 min):** Explain the experimental design: the same scenarios are evaluated twice, once with regulation names only ("HKMA AML/CFT requirements apply") and once with full regulatory citations (specific circular numbers, provisions, and requirements). The question: does showing the LLM the actual regulation change its classifications?
3. **Hands-on lab (30 min):** Students run Lab 02 and examine the output. For each scenario, they record the fingerprint under both conditions and compute the shift per dimension.
4. **Discussion (20 min):** Which dimensions shifted most? Which scenarios were most affected by grounding? If the LLM "knew" the regulations from training data, why did providing citations change its behavior?

**Assignment:**
Produce a grounding report and a short essay.

**Grounding Report (table format):**
For each of the 6 core scenarios, show the fingerprint under both jurisdiction conditions (generic/names-only vs. grounded). Highlight every dimension that shifted. Compute the total number of shifts, the direction of shifts (stricter vs. more permissive), and the average magnitude.

**Essay (600 words):**
1. Did regulatory grounding make the LLM judge stricter or more permissive overall? Is this what you expected? Why or why not?
2. The LLM likely encountered these regulations in its training data. Why, then, does explicitly providing citations change its classifications? What does this reveal about how LLMs process information?
3. If you were advising a financial institution on using LLM-based risk assessment, would you recommend providing full regulatory citations in the prompt? Argue for or against, considering both accuracy and potential bias.

**Deliverable Format:** Grounding report (table) + 600-word essay.

**Extra Credit:** Identify the scenario where grounding produced the largest classification shift. Research the actual regulation that caused the shift and explain, in 200 words, whether the shift was *justified* --- did the full citation contain information that genuinely warrants a different risk classification, or did the LLM overreact to legalistic language?

---

### Week 6: Reliability (Lab 03)

**Learning Objectives:**
- Run Lab 03 with 5 repetitions and compute per-dimension stability metrics
- Interpret intra-rater reliability results and identify which dimensions are most and least stable
- Evaluate what LLM inconsistency means for the trustworthiness of AI-as-judge frameworks

**Pre-Class Preparation:**
- Read: ADR-002 (Experimental Design Review), Sections 1 ("No repeated measurements") and the "Intra-rater reliability" proposal
- Review: Basic concepts of inter-rater reliability (Cohen's kappa, percent agreement). A 1-page primer will be provided. No advanced statistics required --- the goal is conceptual understanding
- Prepare: Expect Lab 03 to make approximately 90 API calls (6 scenarios x 3 personalities x 5 repetitions). This will take several minutes to run and costs under $0.02 with the default model

**In-Class Activity (90 minutes):**
1. **Why reliability matters (15 min):** If you run the same evaluation twice and get different answers, what does that mean? Introduce the concept of intra-rater reliability. Analogy: if a thermometer gives you 98.6 one minute and 102.3 the next, do you trust it?
2. **Lab 03 run (20 min):** Students run Lab 03 with 5 repetitions. While waiting for results, discuss: what would "good" reliability look like? What percent agreement would make you comfortable trusting the framework?
3. **Analysis workshop (35 min):** Students compute:
   - Per-dimension agreement rate: for each dimension, how often did all 5 runs agree?
   - Modal classification: what was the most common classification for each dimension?
   - Most and least stable dimensions: which dimensions gave consistent results, and which "flickered" between levels?
4. **Implications discussion (20 min):** How does this connect to ADR-004's recursive pedagogy? The LLM judge cannot consistently classify risk --- and we are asking whether AI agents should be trusted with autonomous decisions. What does this tension teach us?

**Assignment:**
Produce a statistical analysis of Lab 03 results.

**Required Analysis:**
1. Per-dimension agreement table: for each scenario x personality combination, report the agreement rate across 5 runs (i.e., what fraction of runs produced the same classification?). Compute the average agreement rate per dimension across all scenarios.
2. Identify the 3 most stable and 3 least stable dimension-scenario combinations. For each, propose a hypothesis for why it is stable or unstable. (Hint: dimensions with clear "anchor" scenarios --- like a trivially low-risk customer service task --- should be more stable. Dimensions requiring subjective judgment may be less stable.)
3. If you were building a production risk assessment system using LLM-as-judge, what minimum reliability threshold would you require before trusting the output? Justify your threshold with reference to your data.
4. The framework applies gating rules *after* the LLM classifies. If a dimension flickers between A and B across runs, and A triggers a hard gate, what should the system do? Propose a concrete policy.

**Deliverable Format:** Statistical analysis with tables + 500-word written interpretation answering questions 3 and 4.

**Extra Credit:** Compute Cohen's kappa (or Fleiss' kappa for 5 raters) for one scenario-personality combination. Interpret the result. Is the LLM's agreement with itself better or worse than typical human inter-rater agreement on subjective classification tasks?

---

### Week 7: Model Effects

**Learning Objectives:**
- Compare fingerprints produced by a free/budget model versus a paid/premium model on the same scenarios
- Evaluate the cost-accuracy tradeoff in LLM-as-judge evaluation
- Reason about what "accuracy" means when reference fingerprints are themselves judgment calls

**Pre-Class Preparation:**
- Read: `docs/models.md` (full document --- understand the model tiers, pricing, and selection criteria)
- Decide: Choose one free-tier model and one paid model to compare. Recommended pairing: the default free model vs. a paid model (e.g., `ARA_MODEL=qwen/qwen3-235b-a22b-2507`), or any Tier 2 vs. Tier 1 model from the models document. Avoid `openrouter/free` (it routes randomly across models, making results unreproducible)
- Budget: Ensure you have sufficient API credit for at least 2 full Lab 01 runs. At Qwen3 prices this is under $0.01; premium models may cost up to $1

**In-Class Activity (90 minutes):**
1. **What makes a good judge? (15 min):** Discussion: what properties should a judge model have? (Structured output compliance, regulatory nuance, persona consistency, calibrated reasoning.) Are these the same properties that make a model "smart" in general?
2. **Paired lab run (30 min):** Students run Lab 01 twice --- once with each model. They record fingerprints for all 6 core scenarios under both models.
3. **Comparison analysis (25 min):** Students compute:
   - Inter-model agreement rate per dimension
   - Number of dimension-level disagreements and their direction (which model was stricter?)
   - Comparison of both models against reference fingerprints
   - Cost per run for each model
4. **Cost-accuracy discussion (20 min):** Is the more expensive model meaningfully better? If a model that costs 100x less produces fingerprints that are 90% identical, is the premium model worth it? When would the answer change?

**Assignment:**
Produce a cost-accuracy analysis.

**Required Analysis:**
1. Side-by-side fingerprint comparison table for all 6 core scenarios, showing both models' outputs and the reference fingerprint.
2. Compute the exact match rate against reference fingerprints for each model. Which model was closer to the human-authored ground truth?
3. Compute the cost per evaluation for each model (use actual costs from the SQLite log in `results/ara-eval.db` if available, or estimate from `docs/models.md` pricing).
4. Answer: If you were deploying this framework in a real financial institution with 1,000 scenarios to evaluate monthly, which model would you recommend, and why? Consider cost, accuracy, reliability, and risk tolerance. Show your cost projection.
5. Harder question: The reference fingerprints were generated by Claude Opus 4.6 and validated by human reviewers. If your comparison model is also an Anthropic model, what does shared lineage mean for the validity of the comparison? If it is a different provider's model, does that make the comparison more or less informative?

**Deliverable Format:** Comparison tables + 500-word cost-accuracy analysis.

**Extra Credit:** Run Lab 03 (5 repetitions) with both models. Is the cheaper model less reliable, more reliable, or about the same? Does reliability correlate with cost?

---

### Week 8: Extended Scenarios

**Learning Objectives:**
- Run Lab 01 with the `--all` flag to evaluate all 13 scenarios (6 core + 7 backup)
- Compare the difficulty and ambiguity of backup scenarios to core scenarios
- Identify which scenario properties (risk tier, domain, dimension asymmetry) make classification harder

**Pre-Class Preparation:**
- Read: The full scenario file (`scenarios/starter-scenarios.json`) --- study the 7 backup scenarios you have not yet evaluated
- Review: ADR-003's explanation of why each backup scenario was selected and what "extra credit angle" it offers
- Predict: Before running the lab, write down your predicted fingerprint for 3 of the 7 backup scenarios. Bring these predictions to class

**In-Class Activity (90 minutes):**
1. **Backup scenario preview (15 min):** Briefly review the 7 backup scenarios. What makes them different from the core set? (Higher risk concentration, more domain overlap, real-incident basis for several.)
2. **Full lab run (20 min):** Students run Lab 01 with `--all`. This produces 13 x 3 = 39 evaluations. While waiting, discuss: ADR-003 notes that 13 fingerprints per condition is "too much cognitive load." Do you agree? How do you manage information overload in analysis?
3. **Core vs. backup comparison (35 min):** Students analyze:
   - Do backup scenarios produce more A-level classifications than core scenarios?
   - Are backup scenarios more likely to trigger hard gates?
   - Do personality variants disagree more on backup scenarios than core scenarios?
   - Which backup scenario was most surprising?
4. **Prediction check (20 min):** Students compare their predictions to actual results. Discuss: Were the backup scenarios harder to predict? Why?

**Assignment:**
1. Produce the full 13-scenario fingerprint matrix (all personalities).
2. Compute summary statistics comparing core vs. backup scenarios:
   - Average number of A-level dimensions per scenario
   - Percentage of scenarios triggering hard gates in each set
   - Average personality delta (number of dimensions where at least 2 personalities disagree) for each set
3. Select the backup scenario you found most interesting. Write a 400-word analysis explaining:
   - Why this scenario is interesting (what makes it difficult, ambiguous, or surprising?)
   - How it compares to the most similar core scenario (ADR-003 pairs several backup scenarios with core counterparts)
   - Whether the LLM judge handled the complexity well, and what evidence supports your assessment
4. If you were selecting a "core set" of 6 scenarios from the full 13, which 6 would you choose and why? Your selection criteria may differ from ADR-003's --- explain your reasoning.

**Deliverable Format:** Full fingerprint matrix + summary statistics + 400-word scenario analysis + core set proposal with rationale.

---

### Week 9: Design Your Own Scenario

**Learning Objectives:**
- Write a well-constructed evaluation scenario that exercises specific dimensions of the framework
- Predict a reference fingerprint for a novel scenario and justify each dimension classification
- Compare LLM-generated fingerprints to your own predictions and analyze discrepancies

**Pre-Class Preparation:**
- Brainstorm: Identify a domain or use case for autonomous AI that is not covered by the existing 13 scenarios. It may be in financial services (e.g., mortgage origination, insurance pricing, pension fund management) or in another regulated industry (e.g., healthcare triage, legal document review, hiring decisions). It must involve a concrete decision an AI agent could make autonomously.
- Draft: Write a first draft of your scenario narrative (2--3 sentences), modeled on the existing scenarios in `starter-scenarios.json`
- Read: Review 2--3 existing scenarios to understand the level of specificity expected (dollar amounts, confidence percentages, response times, institutional context)

**In-Class Activity (90 minutes):**
1. **Scenario design workshop (30 min):** Students share their draft scenarios in small groups (3--4 students). Peer feedback focuses on: Is the scenario specific enough? Does it create genuine tension across the 7 dimensions, or is it obviously high-risk or obviously low-risk? Does it include enough detail for an LLM judge to make informed classifications?
2. **Prediction exercise (15 min):** Each student writes their predicted reference fingerprint for their own scenario, with a 1-sentence justification per dimension. These predictions are submitted *before* running the pipeline.
3. **Live evaluation (25 min):** Students add their scenario to the scenario file (or provide it to the instructor for batch evaluation) and run Lab 01. They compare the LLM's fingerprint to their prediction.
4. **Discrepancy analysis (20 min):** Where did the LLM disagree with the scenario author? Discussion: when the person who wrote the scenario disagrees with the LLM's classification, who is "right"? What does this tell us about the limits of LLM-as-judge?

**Assignment:**
Submit a complete scenario package:

1. **Scenario narrative** (2--3 sentences, matching the format of existing scenarios). Include: domain, industry, risk tier, specific details (amounts, confidence levels, timing), and jurisdiction notes.
2. **Predicted reference fingerprint** with 1-sentence justification per dimension (written before running the pipeline --- academic integrity matters here).
3. **LLM results** from Lab 01 (all 3 personality variants).
4. **Analysis (500 words):**
   - Where did the LLM agree and disagree with your prediction? For each disagreement, who do you think was more accurate, and why?
   - Did the three personality variants diverge on your scenario? If so, on which dimensions and why?
   - What gating rule result did your scenario produce? Is this the result you intended when you designed the scenario?
   - If you could revise the scenario to make it more interesting (more ambiguous, more dimensionally asymmetric, more pedagogically valuable), what would you change?

**Deliverable Format:** Scenario JSON + prediction table + Lab 01 output + 500-word analysis.

**Extra Credit:** Design a *pair* of scenarios that are superficially similar but should produce meaningfully different fingerprints (e.g., same domain, different jurisdictions; same task, different time pressures). Run both and analyze whether the framework correctly distinguishes them.

---

### Week 10: Final Portfolio

**Learning Objectives:**
- Synthesize findings from all three labs into a coherent narrative about LLM-as-judge reliability and AI autonomy readiness
- Formulate a data-driven policy recommendation for an audience of financial services executives
- Reflect on what the recursive pedagogy of the course taught you about trusting AI judgment

**Pre-Class Preparation:**
- Compile: Gather all lab outputs, analyses, and weekly assignments from Weeks 2--9
- Draft: Prepare a 1-page outline of your portfolio structure and key findings
- Prepare: A 5-minute oral presentation summarizing your portfolio's policy recommendation

**In-Class Activity (90 minutes):**
1. **Presentations (60 min):** Each student delivers a 5-minute presentation summarizing their key finding and policy recommendation. Format: 3 slides maximum. The audience is a hypothetical financial services executive committee deciding whether to deploy an AI agent autonomously.
2. **Q&A and peer feedback (20 min):** After each presentation, 2 minutes of questions from classmates and the instructor.
3. **Course reflection (10 min):** Closing discussion: What did you learn from using AI to evaluate AI that you could not have learned from a textbook? How has your thinking about AI autonomy changed over 10 weeks?

**Final Portfolio Requirements:**

The portfolio compiles and extends your work from the entire course. It is not merely a collection of previous assignments --- it requires new synthesis and a cohesive argument.

**Structure:**

1. **Executive Summary (300 words):** If a financial services executive read nothing else, what should they know about deploying autonomous AI agents based on your analysis?

2. **Lab Results Summary:**
   - Lab 01: Key fingerprint patterns across core scenarios. Which scenarios are ready for autonomy, which are not, and why?
   - Lab 02: How did regulatory grounding affect classifications? What does this imply for how institutions should configure AI evaluation systems?
   - Lab 03: How reliable was the LLM judge? What are the implications for production use?

3. **Cross-Lab Synthesis (the core of the portfolio):**
   - What are the most important findings when you consider all three labs together?
   - Which of the 7 dimensions is most sensitive to experimental conditions (model, grounding, personality, repetition)? Which is most robust?
   - What does the combination of personality divergence (Lab 01), grounding sensitivity (Lab 02), and intra-rater inconsistency (Lab 03) tell us about the current state of AI-as-judge evaluation?

4. **Policy Recommendation (500 words):**
   - Based on your analysis, recommend a specific policy for how a Hong Kong financial institution should evaluate AI agent readiness for autonomy.
   - Your recommendation must address: which framework dimensions to prioritize, how to handle LLM judge inconsistency, whether to require regulatory grounding, and how to resolve stakeholder disagreement.
   - This is not a theoretical exercise --- write it as if it will be read by a compliance team.

5. **Personal Reflection (300 words):**
   - How has your understanding of AI risk changed over the course?
   - What was the most surprising thing you discovered?
   - ADR-004 says "the moment students laugh at the absurdity of using AI to judge AI autonomy is the moment they've internalized the lesson about the limits of automated judgment." Did that moment happen for you? When?

**Deliverable Format:** Single document (PDF), 2,500--3,500 words total. Must include at least 3 tables or figures from your lab results. Presentation slides submitted separately.

**Grading Criteria for Portfolio (30% of course grade):**

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Analytical Rigor | 30% | Evidence-based claims, proper use of lab data, sound reasoning |
| Synthesis | 25% | Connections across labs, not just summaries of individual assignments |
| Policy Recommendation | 20% | Specificity, practicality, and grounding in evidence |
| Clarity and Structure | 15% | Well-organized, professional tone, appropriate for executive audience |
| Reflection | 10% | Genuine engagement with the recursive pedagogy and personal learning |

---

## Reference Materials

### Scenario Summary (Core Set)

| ID | Domain | Risk Tier | Key Feature |
|----|--------|-----------|-------------|
| `banking-customer-service-001` | Customer Service | Low | Control scenario; near-trivial D-level profile |
| `genai-data-leakage-001` | Data Governance | Medium | Messy middle; maximum personality divergence expected |
| `insurance-claims-001` | Claims Processing | Medium | Single hard gate (Reg Exposure = A) on otherwise permissive profile |
| `claims-denial-001` | Claims Assessment | High | Ethical tension; real incident (UnitedHealth) |
| `algo-trading-deployment-001` | Algorithmic Trading | High | Time pressure extreme; 5 A-level dimensions; real incident (Knight Capital) |
| `cross-border-model-001` | Model Governance | Medium | Jurisdiction-sensitive; PIPL cross-border transfer rules |

### Reference Fingerprint Validation

Reference fingerprints in the scenario file were validated through a three-stage process:
1. **Candidate generation:** Claude Opus 4.6 produced initial fingerprints
2. **Professor review:** Subject matter expert reviewed and adjusted classifications
3. **Industry partner validation:** Practitioners confirmed alignment with real-world risk assessment practice

Students should treat reference fingerprints as informed expert judgment, not ground truth. Disagreement with a reference fingerprint is acceptable when well-reasoned.

### Lab Command Reference

```bash
# Lab 01: Risk Fingerprinting
python labs/lab-01-risk-fingerprinting.py              # 6 core scenarios
python labs/lab-01-risk-fingerprinting.py --all         # All 13 scenarios

# Lab 02: Regulatory Grounding
python labs/lab-02-grounding-experiment.py              # 6 core scenarios

# Lab 03: Intra-Rater Reliability
python labs/lab-03-intra-rater-reliability.py --repetitions 5   # 6 core, 5 reps

# Change model
ARA_MODEL=arcee-ai/trinity-large-preview:free python labs/lab-01-risk-fingerprinting.py
```

### Recommended Reading (Optional)

- HKMA High-Level Principles on Artificial Intelligence (2024)
- SFC Circular 24EC55 on Use of Generative AI (2024)
- HKMA GenA.I. Sandbox Report (October 2025)
- Knight Capital Group SEC Order (2013) --- available in `docs/sources/`
- UnitedHealth algorithm case study --- available in `docs/sources/`

---

*This course format is designed for the ARA-Eval framework. For questions about setup, scenario design, or lab infrastructure, see the repository documentation or contact the course instructor.*
