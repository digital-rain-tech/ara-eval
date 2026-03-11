# Knight Capital's $440 Million Software Error

- **Source:** Henrico Dolfing case study
- **Date:** Originally August 2012; case study undated
- **URL:** https://www.henricodolfing.ch/en/case-study-4-the-440-million-software-error-at-knight-capital/
- **Archived:** 2026-03-11

---

## Overview

Knight Capital Group, once Wall Street's largest equities trader with 17% NYSE market share, nearly collapsed on August 1, 2012, due to a catastrophic software deployment error that cost the firm $440 million in a single hour.

## The Context

Knight faced pressure from the NYSE's new Retail Liquidity Program (RLP), approved by the SEC in early June 2012 with a go-live date of August 1 — just 30 days away. The firm's CEO Thomas Joyce believed participation was essential to avoid losing profitable order flow to competitors.

## What Went Wrong

### The Dead Code Problem

Knight's trading system SMARS (Smart Market Access Routing System) contained legacy code from "Power Peg," an algorithm discontinued in 2003. This test program was "specifically designed to move stock prices higher and lower in order to verify the behavior of other proprietary trading algorithms." The old code remained in the system despite years of disuse.

### The Flag Repurposing Error

During RLP code deployment, developers reused a flag previously associated with Power Peg activation. When set to "yes," this flag was intended to activate the new RLP component instead. This "repurposing often creates confusion, had no substantial benefit, and was a major mistake."

### Inadequate Code Refactoring

In 2005, Knight modified SMARS's cumulative quantity function without thorough regression testing. This change inadvertently disconnected Power Peg from its throttling mechanism, preventing it from stopping when orders were executed.

### Deployment Failure

A Knight engineer manually deployed new RLP code to eight servers but failed to update one system. The firm had no peer review process, automated verification system, or written supervisory procedures to catch this discrepancy.

## The Catastrophe

At 9:30 a.m. on August 1, the defective server activated Power Peg through the repurposed flag. The algorithm began "continuously sending child orders for each incoming parent order without regard to the number of confirmed executions Knight had already received."

Within 45 minutes:
- 4 million executions across 154 stocks
- 397 million shares traded
- Prices moved more than 5% in 75 stocks
- Knight's trades exceeded 20% of volume in those issues
- 37 stocks experienced 10%+ price moves where Knight represented over 50% of trading

## Financial Impact

Goldman Sachs purchased Knight's entire unwanted position, costing the firm $440 million. The trades consumed critical capital, forcing Knight to seek outside investment. A week later, the company received a $400 million cash infusion from investors. By summer 2013, Getco LLC acquired Knight.

## Key Lessons

The disaster resulted from converging failures: dormant code retention, flag reuse without documentation, inadequate regression testing, manual deployment without verification, and absent operational review procedures. The missed opportunity came at 8:01 a.m. when BNET generated 97 internal error messages mentioning "Power Peg disabled" — signals sent to non-critical alert channels that staff didn't monitor in real-time.
