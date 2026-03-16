# ADR-011: Adversarial Chat Design and LLM Red-Teaming Landscape

**Status:** Accepted
**Date:** 2026-03-16

## Context

ARA-Eval needs a way for students to manually probe the LLM judge — to test whether changing context (personality, grounding, rubric) actually changes classifications, and to discover failure modes that automated evaluation can't surface. Before designing this, we surveyed the existing LLM red-teaming landscape to understand what tools exist, where ARA-Eval fits, and what we can learn from them.

## The Landscape

### Automated Red-Teaming Frameworks

Four major open-source tools dominate LLM adversarial testing as of early 2026:

| Tool | Maintainer | Approach | Strength |
|------|-----------|----------|----------|
| **[Promptfoo](https://github.com/promptfoo/promptfoo)** | Promptfoo Inc | Application-aware attack generation, 50+ vulnerability types, CI/CD integration | Most practical for engineering teams; generates attacks tailored to your specific prompts and tools |
| **[DeepTeam](https://github.com/confident-ai/deepteam)** | Confident AI | 40+ vulnerability types, 10+ attack methods (single-turn and multi-turn) | Broadest coverage of bias, PII leakage, toxicity, misinformation |
| **[PyRIT](https://github.com/Azure/PyRIT)** | Microsoft AI Red Team | Programmatic orchestration with converters and scoring engines | Most flexible for custom red-teaming scenarios; building blocks over opinions |
| **[Garak](https://github.com/NVIDIA/garak)** | NVIDIA | Probe-based vulnerability scanning modeled on nmap | Best for systematic vulnerability enumeration |

All four focus on **automated** adversarial testing — generating adversarial inputs programmatically and scoring model responses at scale. They are tools for security professionals and ML engineers, not teaching instruments.

### LLM-as-a-Judge Robustness Research

Recent research (2025-2026) directly validates the pedagogical approach ARA-Eval takes:

- **"LLMs Cannot Reliably Judge (Yet?)"** ([arXiv 2506.09443](https://arxiv.org/abs/2506.09443v1)) — Comprehensive assessment showing LLM-as-a-Judge systems are vulnerable to adversarial attacks including Combined Attack and PAIR. Defense mechanisms like re-tokenization and LLM-based detectors offer some protection, but fundamental reliability gaps remain. This is exactly what Lab 03 (intra-rater reliability) measures empirically.

- **Risk-Adjusted Harm Scoring for Financial Services** ([arXiv 2603.10807](https://arxiv.org/html/2603.10807), Dimino, Sarmah & Pasquali, March 2026) — The closest work to ARA-Eval. Proposes RAHS (Risk-Adjusted Harm Score), a domain-specific evaluation framework for LLMs in banking/financial services/insurance. See detailed analysis below.

- **JHU Reusable AI Safety Framework** ([March 2026](https://hub.jhu.edu/2026/03/11/efficient-ai-safety-testing/)) — Argues for reusable, efficient safety evaluation that can generalize across models. ARA-Eval's shared test fixtures and cross-runtime contract tests align with this principle.

- **RedBench** ([arXiv 2601.03699](https://arxiv.org/pdf/2601.03699)) — Universal dataset for comprehensive red teaming. Demonstrates that standardized test cases enable meaningful cross-model comparison — same principle as ARA-Eval's reference fingerprints and inter-model comparison (Lab 04).

### Deep Dive: RAHS and ARA-Eval Complementarity

The RAHS paper (Dimino et al., 2026) is the most structurally similar work to ARA-Eval. Both are domain-specific to financial services, both reject binary pass/fail for ordinal severity, and both use multiple evaluator perspectives. The differences reveal a gap that ARA-Eval is positioned to fill.

**What RAHS does:**

- Defines **7 financial harm categories**: market abuse, financial crime, fraud, improper advice, discrimination, information integrity, crypto/DeFi risks. A benchmark of 989 adversarial prompts (FinRedTeamBench) maps to these categories.
- Uses an **ensemble of 3 heterogeneous LLM judges** (a safety-specialized model, Qwen3-235B, Llama-3.3-Nemotron-49B) with majority voting to classify each response as Refusal, Safe Alternative, or Harmful Disclosure.
- Assigns **severity levels** (low/medium/high) to harmful disclosures based on operational actionability — vague information scores lower than step-by-step instructions.
- Computes a **composite RAHS score** incorporating judge agreement strength, severity weighting, mitigation signals (legal disclaimers reduce but don't eliminate risk), and a disagreement penalty.
- Runs **multi-turn adversarial escalation** (up to 5 rounds) using DeepSeek-V3.2 as the attacker. Key finding: attack success rate increases monotonically across rounds (e.g., 76.3% at round 2 → 95.9% at round 5 for Nemotron-3-Nano-30B), and harm *severity* also escalates. Models that appear robust in single-turn evaluation break under sustained pressure.

**Structural parallels with ARA-Eval:**

| RAHS | ARA-Eval | Parallel |
|------|----------|----------|
| 7 harm categories | 7 risk dimensions | Multidimensional taxonomy over single score |
| Low/medium/high severity | A/B/C/D levels | Ordinal severity, not binary |
| 3 heterogeneous model judges | 3 stakeholder personality variants | Multiple evaluator perspectives to reduce bias |
| FinRedTeamBench (989 prompts) | 13 scenarios with reference fingerprints | Domain-specific test cases with ground truth |
| Multi-turn escalation | Adversarial chat with full history | Sustained interaction reveals hidden failures |

**The gap RAHS identifies — that ARA-Eval fills:**

The RAHS authors explicitly acknowledge their framework doesn't cover autonomous agent actions: tool use, state modification, irreversible decisions, multi-agent coordination, or institutional accountability structures. These are precisely the dimensions ARA-Eval evaluates:

- **Decision Reversibility** — can the agent's action be undone? (RAHS evaluates language output, not actions)
- **Failure Blast Radius** — how many people/dollars are affected? (RAHS measures harm *potential* in text; ARA-Eval measures harm *scope* in deployment)
- **Accountability Chain** — who is responsible when the agent acts? (not addressed in RAHS)
- **Graceful Degradation** — does the agent fail safely? (RAHS tests whether the model *says* harmful things; ARA-Eval tests whether the agent *does* harmful things)

RAHS answers: "Is this model safe to deploy?" ARA-Eval answers: "Is this agent ready to act autonomously?" These are complementary questions. A model could pass RAHS (never generates harmful financial advice) but fail ARA-Eval (makes irreversible decisions in a regulated domain without accountability).

### Where ARA-Eval Differs

The existing tools are designed for security professionals running automated scans. ARA-Eval occupies a different niche:

1. **Manual over automated.** Students do the adversarial testing themselves. The learning comes from the *process* of trying to break the judge, not from reading a scan report. This is the recursive pedagogy from ADR-004 — the adversarial chat is where students discover that the judge is framing-sensitive, perspective-dependent, and context-responsive.

2. **Domain-specific evaluation, not general safety.** Promptfoo tests for prompt injection, PII leaks, and toxicity. ARA-Eval tests whether an LLM can reliably classify regulatory risk across 7 dimensions for Hong Kong financial services. The failure modes are different: not "did it leak data" but "did it change its regulatory exposure classification when you rephrased the scenario?"

3. **Context as the independent variable.** The adversarial chat's key feature is live-swappable context controls (personality, jurisdiction/grounding, rubric). Students can be mid-conversation, swap from Generic to HK-Grounded, and immediately see how the same model responds differently. No existing tool provides this kind of interactive prompt inspection with side-by-side cause-and-effect display.

4. **Pedagogical, not defensive.** The goal isn't to harden the model — it's to teach students that LLM judgment has measurable limitations. Every failure mode they discover *is the lesson*.

## Decision

### Adversarial Chat Design

We add a chat page (`/chat`) with these design principles:

**Split-pane layout with live prompt inspection.** Left pane shows the assembled system prompt with color-coded sections (personality=blue, rubric=purple, jurisdiction=amber). Right pane is the chat. When any control changes, the affected section highlights and auto-expands. Students see cause (what the model receives) and effect (how it responds) simultaneously.

**All context controls are live.** Personality, jurisdiction, rubric, and model can be changed mid-conversation. Context changes are logged as system messages in the chat transcript with the exact change description (e.g., "Context changed: jurisdiction Generic → HK-Grounded"). Every message records the active context at time of sending.

**Full persistence.** Chat sessions and messages are stored in the same SQLite database as evaluation runs, with the active context (personality, jurisdiction, rubric, model) recorded per-message. The professor can review what failure modes students discovered.

**Model restricted to tested free models.** A dropdown offers the 3 models tested to 100% reliability (Arcee Trinity, Hunter Alpha, Healer Alpha) plus a custom option limited to `:free` models. Server-side validation prevents spending credits on paid models.

### What We Learned From the Landscape

- **Promptfoo's attack taxonomy** (50+ vulnerability types) could inform a future "challenge cards" feature — predefined adversarial testing goals for students. Not implemented now (YAGNI) but the schema supports it via session metadata.
- **DeepTeam's multi-turn attack methods** validate our choice to send full conversation history on each message. Multi-turn adversarial testing is strictly harder than single-turn; the chat interface naturally supports it.
- **The LLM-as-a-Judge robustness research** confirms that the failure modes students will discover in the chat are real and documented in the literature. The adversarial chat is an experiential entry point into that body of research.

## Building on RAHS: Practical Extensions (80/20)

The RAHS paper opens several research directions. Applying the Pareto principle — what 20% of effort yields 80% of the insight? — we identify three extensions that leverage ARA-Eval's existing infrastructure with minimal new work.

### 1. Multi-Turn Classification Drift Detection

**The RAHS finding:** Models break under sustained adversarial pressure. Attack success rate rises monotonically across rounds.

**The ARA-Eval extension:** The adversarial chat already persists every message with the active context. We can detect **classification drift** — does the judge become more permissive across a multi-turn conversation? If a student starts by asking the judge to evaluate a high-risk scenario and the judge correctly classifies it as human-in-loop-required, does continued conversation erode that classification?

**Implementation (low effort):** Post-hoc analysis on chat transcripts. Parse assistant messages for classification language (A/B/C/D levels, "ready now", "human oversight"). Track whether the judge's stated risk assessment drifts toward lower risk across the conversation. No new code needed — just a Lab 06 analysis script reading from `chat_messages`.

### 2. Perspective Ensemble Scoring

**The RAHS approach:** 3 different models vote; majority rules; disagreement is penalized.

**The ARA-Eval extension:** We already have 3 personality variants that often disagree (Lab 01's personality delta analysis). We can compute an **ensemble confidence score** inspired by RAHS: when all 3 personalities agree on a dimension level, confidence is high; when they spread across 2+ levels, confidence is low and the dimension is flagged for human review.

**Implementation (low effort):** Already computed in `personality_delta()`. The extension is framing: instead of just reporting disagreement, compute a RAHS-style confidence-weighted fingerprint where dimensions with personality consensus get higher weight in the gating decision. This is 20-30 lines of Python in `core.py`.

### 3. Severity-Aware Blast Radius

**The RAHS innovation:** Severity isn't binary — vague harmful information scores lower than step-by-step instructions.

**The ARA-Eval gap (identified in ADR-010):** Blast Radius measures *breadth* (how many affected) but not *severity* (how badly). A scenario affecting 1,000 people with minor inconvenience and one affecting 1,000 people with life-changing financial loss both score Blast Radius = A.

**Implementation (medium effort):** Add a severity modifier to the Blast Radius dimension, inspired by RAHS's low/medium/high stratification. This doesn't require changing the A-D level system — it adds a sub-classification within each level. For example, Blast Radius = A (systemic, high severity) vs Blast Radius = A (systemic, low severity). The gating rules remain the same, but the interpretation is richer. Requires rubric update and new reference fingerprints.

### What We Don't Need to Build

RAHS includes several components that would be over-engineering for ARA-Eval:

- **Automated attacker model** (DeepSeek-V3.2 as adversary) — Our adversarial testing is pedagogical; students *are* the attacker. Automation removes the learning.
- **Mitigation signal detection** (legal disclaimer discounting) — Relevant for production safety but not for evaluating agent autonomy readiness.
- **FinRedTeamBench** (989 adversarial prompts) — Our 13 scenarios are curated for pedagogical depth over breadth. Quality over quantity; students build their own in Lab 05.

## Consequences

- Students get a hands-on tool for adversarial testing that no existing framework provides in this pedagogical context
- Chat transcripts become a data source for course assessment — what failure modes did each student discover?
- The prompt inspector's sectioned display makes the relationship between input framing and output classification visually obvious
- The RAHS parallels position ARA-Eval as a pedagogical complement to automated financial services red-teaming — bridging the gap between "is the model safe?" and "is the agent ready?"
- Three concrete extensions (drift detection, ensemble scoring, severity-aware blast radius) are identified with low-to-medium implementation effort, building directly on RAHS findings and ARA-Eval's existing data
