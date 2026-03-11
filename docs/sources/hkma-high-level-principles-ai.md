# HKMA High-level Principles on Artificial Intelligence

- **Source:** Hong Kong Monetary Authority
- **Date:** 1 November 2019
- **Ref:** B1/15C, B9/29C
- **URL:** https://www.hkma.gov.hk/media/eng/doc/key-information/guidelines-and-circular/2019/20191101e1.pdf
- **Archived:** 2026-03-11 (from manual PDF download `raw/20191101-1-EN.pdf`)

---

## Overview

The HKMA issued high-level principles for banks on the use of AI and big data analytics (BDAI) applications. These are deliberately principles-based to avoid inhibiting development, with proportionate application based on risk.

## The 12 Principles

### Governance (Principle 1)
**Board and senior management accountable for AI outcomes.** They must ensure proper governance frameworks and risk management measures are in place. Three lines of defence roles must be clearly defined.

### Application Design and Development (Principles 2–8)

2. **Possessing sufficient expertise** — developers must have requisite competence; senior management must supervise; recruit/train/retain appropriate staff

3. **Ensuring appropriate explainability** — "no black-box excuse"; level of explainability should be commensurate with materiality of the AI application

4. **Using data of good quality** — effective data governance framework; data quality assessment on accuracy, completeness, timeliness, consistency

5. **Conducting rigorous model validation** — rigorous testing before production; preferable to involve independent party (2nd/3rd line of defence or external consultant)

6. **Ensuring auditability** — track outcomes continuously; build sufficient audit logs; retain documentation for appropriate period

7. **Implementing effective management oversight of third-party vendors** — due diligence on vendors; periodic reviews of services

8. **Being ethical, fair and transparent** — AI decisions must not discriminate; comply with corporate values and consumer protection principles; disclose to consumers that service is AI-powered and the risks involved

### On-going Monitoring and Maintenance (Principles 9–12)

9. **Conducting periodic reviews and on-going monitoring** — AI models may change after deployment from live data; conduct periodic re-validation

10. **Complying with data protection requirements** — comply with Personal Data (Privacy) Ordinance; use sanitised data instead of PII where appropriate

11. **Ensuring consumer protection** — feedback channels for customers; special care for vulnerable groups

12. **Managing cybersecurity and technology risks** — AI applications are potentially new attack vectors; robust cybersecurity measures required

## Relevance to ARA-Eval

Maps directly to our rubric dimensions:
- Principle 1 (accountability) → Accountability Chain
- Principle 3 (explainability) → Graceful Degradation (transparent failure modes)
- Principle 5 (model validation) → Data Confidence
- Principle 8 (fairness, transparency) → Regulatory Exposure
- Principle 9 (ongoing monitoring) → Human Override Latency
