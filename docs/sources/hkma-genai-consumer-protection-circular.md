# HKMA Circular: Consumer Protection in respect of Use of Generative Artificial Intelligence

- **Source:** Hong Kong Monetary Authority
- **Date:** 19 August 2024
- **Ref:** B1/15C, B9/67C
- **URL:** https://www.hkma.gov.hk/media/eng/doc/key-information/guidelines-and-circular/2024/20241107e1.pdf (estimated)
- **Archived:** 2026-03-11 (from manual PDF download `raw/20241107-1-EN.pdf`)

---

## Overview

This is the actual HKMA GenAI circular — consumer protection guiding principles for authorized institutions using GenAI in customer-facing applications. It extends the 2019 BDAI Guiding Principles with GenAI-specific requirements.

## Context

- References the 2019 BDAI Guiding Principles (see `hkma-high-level-principles-ai.md`)
- Notes GenAI adoption is at early stage, mostly internal (chatbots, coding)
- Potential customer-facing uses: customer chatbots, personalised products, robo-advisors in wealth management and insurance
- Acknowledges GenAI-specific risks: lack of explainability, hallucination (factually incorrect/incomplete/irrelevant outputs)

## Four Guiding Principles for GenAI

### 1. Governance and Accountability
- Board and senior management remain accountable for all GenAI-driven decisions
- Must consider potential impact on customers through appropriate governance committee
- Requirements:
  - (a) Clearly define scope of customer-facing GenAI — prevent unintended use
  - (b) Develop proper policies and procedures for responsible GenAI use with control measures
  - (c) Proper model validation; **during early stage, adopt "human-in-the-loop" approach** — human retains control to ensure outputs are accurate and not misleading

### 2. Fairness
- GenAI models must produce objective, consistent, ethical, and fair outcomes
- Requirements:
  - (a) No unfair bias or disadvantage against any customer group; anonymise data categories, use fair/representative datasets, adjust for bias during validation, adopt "human-in-the-loop"
  - (b) During early deployment, provide customers with **opt-out option** from GenAI and ability to request human intervention; where opt-out impossible, provide channels for review of GenAI-generated decisions

### 3. Transparency and Disclosure
- Disclose use of GenAI to customers
- Communicate purpose and limitations of GenAI models
- Enhance customers' understanding of model-generated outputs

### 4. Data Privacy and Protection
- Comply with Personal Data (Privacy) Ordinance
- Pay due regard to PCPD recommendations (see `pcpd-ai-framework.md`)

## Annex 2: BDAI Survey Results (May 2024)
- 75% of surveyed institutions adopting/planning to adopt BDAI
- Top BDAI use cases: operational automation (20), AML/fraud (19), identity/KYC (18)
- Only 39% adopting/planning GenAI; mostly for internal use (summarisation/translation: 10, coding: 4)
- Customer-facing GenAI adoption still early stage

## Relevance to ARA-Eval

**This is the primary HKMA regulatory document for our scenarios.** Key requirements:
- **Human-in-the-loop mandatory** during early GenAI deployment → directly informs Human Override Latency scoring
- **Opt-out requirement** for customers → scenarios should consider whether human alternative exists
- **Fairness requirements** with specific mention of anonymisation and representative datasets
- **Governance accountability** extends to board level → maps to Accountability Chain dimension
