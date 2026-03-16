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

- **Risk-Adjusted Harm Scoring for Financial Services** ([arXiv 2603.10807](https://arxiv.org/html/2603.10807)) — Proposes domain-specific harm scoring for financial services red teaming. Closest to ARA-Eval's focus on HK financial regulation, though it targets automated scoring rather than pedagogical use.

- **JHU Reusable AI Safety Framework** ([March 2026](https://hub.jhu.edu/2026/03/11/efficient-ai-safety-testing/)) — Argues for reusable, efficient safety evaluation that can generalize across models. ARA-Eval's shared test fixtures and cross-runtime contract tests align with this principle.

- **RedBench** ([arXiv 2601.03699](https://arxiv.org/pdf/2601.03699)) — Universal dataset for comprehensive red teaming. Demonstrates that standardized test cases enable meaningful cross-model comparison — same principle as ARA-Eval's reference fingerprints and inter-model comparison (Lab 04).

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

## Consequences

- Students get a hands-on tool for adversarial testing that no existing framework provides in this pedagogical context
- Chat transcripts become a data source for course assessment — what failure modes did each student discover?
- The prompt inspector's sectioned display makes the relationship between input framing and output classification visually obvious
- Future work could add automated challenge scoring (did the student successfully get the judge to misclassify?) but manual discovery is sufficient for now
