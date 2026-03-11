# HKMA: Responsible Innovation with GenA.I. in the Banking Industry

- **Source:** Hong Kong Monetary Authority
- **Date:** 31 October 2025 (inferred from PDF ID: 20251031-6-EN)
- **URL:** https://www.hkma.gov.hk/media/eng/doc/key-information/guidelines-and-circular/2025/20251031e1.pdf (estimated; original redirect failed)
- **Archived:** 2026-03-11 (from manual PDF download, 42 pages)
- **Local PDF:** `raw/20251031-6-EN.pdf`

---

## Overview

Report on practical insights from the HKMA GenA.I. Sandbox initiative, launched in collaboration with Hong Kong Cyberport. The inaugural cohort included 15 use cases from 10 banks and 4 technology partners, selected from 40+ submissions. Focus areas: risk management, anti-fraud, and customer experience.

## Key Sections Relevant to ARA-Eval

### Section 1.3: Use Case Domains
- **Risk Management:** Credit risk, KYC, compliance workflows
- **Anti-Fraud:** Transaction-based fraud detection, deepfake identification
- **Customer Experience:** Personalised banking solutions, chatbots

### Section 3.3: Validation and Evaluation (pp. 21–26)

#### LLM as a Judge (p. 26)
The report describes using an LLM to assess other model outputs — directly analogous to ARA-Eval's approach:
1. **Define Evaluation Criteria** — metrics like fairness, bias, helpfulness, safety; each unambiguous and measurable
2. **Design the Judge's Evaluation Protocol** — structured prompt with evaluation criteria, scoring guidelines, template for inserting test prompt + response, clear output format (JSON with specific keys)
3. **Analyse Results** — aggregate scores across test cases, identify patterns, calculate averages per criterion, analyse specific failures

Example judge prompt uses 1–5 scale across fairness_score, stereotyping_score, inclusivity_score with rationale.

### Section 4: Addressing Key Challenges and Risks (pp. 27–38)

#### 4.1 Hallucination and Inaccuracy (pp. 27–30)
Mitigation strategies employed by participating banks:
- **Self-Verification and Critical Thinking Prompts** — model critiques its own response against provided context
- **Step-by-Step Reasoning (Chain-of-Thought) with Grounding** — explicitly cite sources for each logical step
- **Structured Output Mandates** — JSON/XML with predefined fields (final_answer, confidence_score, source_references)
- **Contextual Bounding and Explicit Prohibition** — strictly limit response domain to provided information
- **Inference Parameters Tuning** — lower temperature (0.1–0.3), top-p (0.4–0.6), top-k (10–30) for factual applications

#### 4.2 Bias and Fairness (pp. 31–33)
- **Structured prompting with neutral persona** — explicit directives for objective, equitable advice
- **Pre-processing with targeted word filtering** — detect/filter language likely to elicit biased responses
- Case study: bank tested 500+ results using ROUGE-L, BLEU, embedding similarity, and LLM-based sentiment/clarity scoring across demographic groups

#### 4.3 Security and Privacy (pp. 34–35)
Risk mitigation strategies (Table 2):
- **Prompt injection:** monitoring/detection systems, secondary classifier models, strict separation of system instructions from user input, dynamic intent evaluation rules
- **Sensitive information disclosure:** tokenisation, least-privilege access, access control on vector databases
- **Improper output handling:** input validation on model responses, structured output schema enforcement, robust logging
- **Misinformation:** confidence scores for factual statements, automatic escalation of low-confidence responses, audit trails linking responses to source materials

Privacy measures: intelligent data masking (NER-based), synthetic data generation with differential privacy, data minimisation, temporal access controls

#### 4.4 Explainability and Transparency (pp. 36)
- **Chain-of-Thought for credit assessment** — step-by-step reasoning with explicit rule references
- **Source citation in RAG chatbots** — always cite specific document and paragraph used to generate answer
- "Glass-box" strategies making reasoning visible and auditable

### Section 5: Business Outcomes (p. 37)
- 30–80% reduction in Suspicious Transaction Report preparation time
- Memo document processing reduced from 1 day to ~5 minutes
- 60% cut in production time for high-quality outputs
- 86% positive user feedback; 70% of credit assessment outputs rated as valuable references
- 100% case narrative analysis coverage vs. traditional sampling

## Relevance to ARA-Eval

This report provides the strongest HKMA signal on GenAI governance expectations for banking:
1. The "LLM as a Judge" pattern validates our evaluation methodology
2. The hallucination mitigation requirements (structured output, grounding, confidence scores) align with our rubric dimensions
3. The security risk table (prompt injection, information disclosure, misinformation) maps to our Regulatory Exposure and Graceful Degradation dimensions
4. The bias testing methodology (paired questions, demographic attribute replacement) could inform future ARA-Eval fairness scenarios
5. The emphasis on human oversight, audit trails, and explainability directly supports our Human Override Latency and Accountability Chain dimensions
