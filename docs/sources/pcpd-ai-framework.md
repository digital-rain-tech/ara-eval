# PCPD: Artificial Intelligence — Model Personal Data Protection Framework

- **Source:** Office of the Privacy Commissioner for Personal Data, Hong Kong (PCPD)
- **Date:** June 2024 (foreword date)
- **URL:** https://www.pcpd.org.hk/english/resources_centre/publications/files/ai_framework_2024.pdf
- **Archived:** 2026-03-11 (from manual PDF download `raw/ai_protection_framework.pdf`, 54pp)

---

## Overview

A comprehensive risk-based framework providing practical recommendations for Hong Kong enterprises procuring, implementing, and using AI systems. Published with support from the Office of the Government Chief Information Officer and Hong Kong Applied Science and Technology Research Institute (ASTRI).

## Structure (4 Parts)

### Part I: AI Strategy and Governance (pp. 11–21)
- 1.1 AI Strategy
- 1.2 Governance Considerations for Procuring AI Solutions
- 1.3 Governance Structure
- 1.4 Training and Awareness Raising

### Part II: Risk Assessment and Human Oversight (pp. 23–31)
- 2.1 Risk Factors
- 2.2 **Determining the Level of Human Oversight** — graduated human oversight based on risk level
- 2.3 Risk Mitigation Trade-offs

### Part III: Customisation of AI Models, Implementation, and Management (pp. 32–46)
- 3.1 Data Preparation for Customisation and Use of AI
- 3.2 Customisation and Implementation of AI Solutions
- 3.3 Management and Continuous Monitoring of AI Systems

### Part IV: Communication and Engagement with Stakeholders (pp. 47–50)
- 4.1 Information Provision
- 4.2 Data Subject Rights and Feedback
- 4.3 **Explainable AI** — requirements for transparency in AI decision-making
- 4.4 Language and Manner

### Appendices
- Appendix A: Data Protection Principles under the Personal Data (Privacy) Ordinance
- Appendix B: Main Publication Reference List

## Relevance to ARA-Eval

This framework is cited in `hk-grounded.md` as a primary PCPD source. Key sections:
- **Part II (Human Oversight)** directly informs our Human Override Latency dimension — the framework provides a graduated approach to determining when human oversight is required
- **Part II (Risk Factors)** aligns with our risk fingerprinting approach — both use multi-dimensional risk assessment
- **Part IV (Explainable AI)** supports our Graceful Degradation dimension — requirement for transparent AI decision-making
- The risk-based approach mirrors ARA-Eval's tiered autonomy recommendations
