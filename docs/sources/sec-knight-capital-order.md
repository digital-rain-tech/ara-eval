# SEC Administrative Proceeding: Knight Capital Americas LLC

- **Source:** U.S. Securities and Exchange Commission
- **Date:** 16 October 2013
- **Ref:** Release No. 70694, File No. 3-15570
- **URL:** https://www.sec.gov/litigation/admin/2013/34-70694.pdf
- **Archived:** 2026-03-11 (from manual PDF download `raw/34-70694.pdf`)

---

## Summary

The SEC found that Knight Capital Americas LLC violated Exchange Act Rule 15c3-5 (Market Access Rule) by failing to have adequate risk management controls and supervisory procedures when it experienced a catastrophic software error on August 1, 2012.

## Key Facts from SEC Findings

### The Incident (Para. 1)
On August 1, 2012, while processing 212 small retail orders, SMARS (Knight's automated order routing system) routed millions of orders into the market over a 45-minute period, obtaining over 4 million executions in 154 stocks for more than 397 million shares. Knight assumed net long positions of ~$3.5 billion in 80 stocks and net short positions of ~$3.15 billion in 74 stocks. **Knight lost over $460 million** from these unwanted positions.

### Specific Violations (Para. 9)
Knight violated Rule 15c3-5 in six specific ways:

A. **No pre-trade controls** to prevent erroneous orders at the point of submission
B. **No capital threshold controls** — failed to link accounts to firm-wide capital thresholds; relied on financial risk controls incapable of preventing order entry
C. **Inadequate written description** of risk management controls
D. **No technology governance controls** sufficient to ensure orderly deployment of new code or prevent activation of code no longer intended for use; **no supervisory procedures to guide employee responses** to significant tech/compliance incidents
E. **Failed to adequately review** overall effectiveness of risk management controls
F. **Defective CEO certification** for 2012

### The Power Peg Error (Paras. 12–14)
- Knight was preparing for NYSE's Retail Liquidity Program (RLP), scheduled August 1, 2012
- New RLP code in SMARS was intended to **replace unused code** previously used for "Power Peg" functionality (discontinued years earlier)
- Despite lack of use, Power Peg code **remained present and callable** at time of RLP deployment
- New RLP code **repurposed a flag** formerly used to activate Power Peg — when set to "yes," intended to engage RLP, not Power Peg
- In 2005, Knight moved the cumulative shares tracking function earlier in the code sequence **without retesting** whether Power Peg would still function correctly if called

### The $460 Million Loss (Para. 10)
Knight's technology staff worked to identify and resolve the issue, but Knight remained connected to the markets and continued sending orders. Over approximately 45 minutes, Knight accumulated an unintended multi-billion dollar portfolio.

## SEC's Key Principles (Paras. 3–4)
- "In the absence of appropriate controls, the speed with which automated trading systems enter orders into the marketplace can turn an otherwise manageable error into an extreme event with potentially wide-spread impact"
- Prudent technology risk management requires: quality assurance, controlled testing, user acceptance, process measurement and control, regular compliance review, strong independent audit
- "The failure by, or unwillingness of, a firm to do so can have potentially catastrophic consequences"

## Relevance to ARA-Eval

Primary source for `algo-trading-deployment-001` scenario. Demonstrates:
- Dead code + flag reuse → catastrophic activation (Decision Reversibility = A)
- 45 minutes of uncontrolled trading across 154 stocks (Blast Radius = A)
- No automated kill switch or alert monitoring (Human Override Latency = A)
- Missing deployment verification procedures (Accountability Chain = C)
