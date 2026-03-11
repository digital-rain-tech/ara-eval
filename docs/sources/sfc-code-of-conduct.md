# SFC Code of Conduct for Persons Licensed by or Registered with the SFC

- **Source:** Securities and Futures Commission of Hong Kong
- **Date:** Latest version January 2026 (originally issued various dates)
- **URL:** https://www.sfc.hk/en/Rules-and-standards/Codes-and-guidelines/Codes
- **Archived:** 2026-03-11 (from manual PDF download `raw/Code_of_conduct Dec 2025_Eng Final with Bookmark_Jan 2026.pdf`)

---

## Overview

The comprehensive code governing conduct of all persons licensed by or registered with the SFC. Contains suitability requirements, know-your-client obligations, and standards for providing investment advice — directly relevant to robo-advisory scenarios.

## Key Provisions for ARA-Eval

### Suitability Requirements
Licensed corporations must ensure investment recommendations are suitable for each client based on their:
- Financial situation
- Investment experience
- Investment objectives
- Risk tolerance

### Know Your Client
Requirements for understanding client circumstances before making recommendations, including periodic review of suitability assessments.

### Robo-Advisory Implications
The suitability requirements apply equally to algorithm-driven and human-driven investment advice, meaning robo-advisors must meet the same standards as human advisors.

## Relevance to ARA-Eval

Source for `robo-advisory-001` scenario. The Code's suitability requirements mean:
- AI-generated portfolio rebalancing recommendations must consider individual client suitability
- Stale suitability profiles (e.g., 18 months old in our scenario) create compliance risk
- Autonomous execution without suitability re-confirmation may violate the Code
