# ADR-017: ARA Expands to "Agentic Risk Assessment"

**Status:** Accepted
**Date:** 2026-07-18

## Context

The ARA acronym had drifted into three competing expansions across the project's repos:

- **ara-eval** (this repo): "Agentic **Readiness** Assessment" — in `pyproject.toml`, the package docstring, `CLAUDE.md`, the web app title, OpenRouter `X-Title` headers, and the LLM judge prompts
- **ara-eval-site**: "Agentic **Risk** Assessment" — in the page title, homepage H1, README, and a dedicated SEO landing page at `/agentic-risk-assessment` with FAQ structured data
- **augustinchan.dev** `/ara-eval`: "**Agent** Risk Assessment" — in page metadata, OG images, and FAQ schema

Three surfaces telling search engines (and the eval judge itself) three different names splits SEO equity and muddles the product story.

## Decision

The canonical expansion is **Agentic Risk Assessment**.

**Why "risk" over "readiness":**

1. The product's vocabulary is risk-native — risk fingerprints, risk gates, 7 risk dimensions, recall weighted over precision because a missed risk gate is worse than a false alarm. "Readiness assessment" would be the one non-risk term in the system.
2. "Risk assessment" is an established enterprise term that compliance and security buyers already search for and budget against. "Readiness assessment" reads as consulting-ware.
3. Semantically, readiness is the *output*, not the activity: the framework assesses risk and *derives* a readiness verdict. Naming the assessment after what it measures is more accurate.
4. The public site had already canonicalized "risk" — including an indexed URL and structured data — so "readiness" was the cheaper side to change.

**Why "agentic" over "agent":**

1. It is the industry term of art ("agentic AI") that the target buyer — enterprise compliance and platform teams — actually searches for.
2. Plain "agent risk" collides with established meanings: insurance/broker agent risk and especially principal–agent ("agency") risk in finance, the exact domain this framework sells into.
3. Grammatically, "agentic" is an adjective; "agent risk assessment" is an ambiguous noun pile-up.

The acknowledged cost: "agentic" sounds jargony. See register rules below for how prose avoids it.

## Register rules

- **Canonical/SEO surfaces** — page titles, H1s, URLs, structured data, package descriptions, LLM judge prompts, API `X-Title` headers: **"Agentic Risk Assessment"**, exactly.
- **Prose, body copy, spoken language**: plain "AI agent risk assessment" or "risk assessment for AI agents" is preferred. The canonical term is for machines and search; humans don't have to talk like a keynote.
- **"Readiness" survives as verdict language only**: readiness classification, "ready now" / "ready with prerequisites" / "human-in-loop required". Risk is what's measured; readiness is the verdict. Do not "fix" these.
- **Historical documents** — dated plans (`docs/superpowers/plans/`), review transcripts (`reviews/`), and prior ADRs — keep whatever name they were written with. They are point-in-time records; don't sweep them.

## Consequences

- 2026-07-18: all living files in ara-eval renamed (pyproject, package docstring, CLAUDE.md, web title, X-Title headers, judge prompts, course-format header); augustinchan.dev `/ara-eval` metadata and FAQ schema moved from "Agent" to "Agentic"; ara-eval-site needed no changes and is the reference for the canonical usage.
- The judge prompts now self-describe with the same name the public site uses, so eval transcripts and marketing copy agree.
- Any new repo, deck, or page under the ARA umbrella should follow the register rules above rather than re-litigating the name.
