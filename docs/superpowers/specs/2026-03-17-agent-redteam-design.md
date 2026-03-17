# ARA-Eval Agent Red-Team Chat — Design Spec

## Purpose

Refactor the chat page to support two modes:

1. **Agent Mode** (primary) — Students red-team an AI agent operating under fingerprint-derived behavioral constraints. The agent role-plays as the deployed system; students try to get it to violate its guardrails.
2. **Judge Mode** (secondary, existing) — Students probe the LLM evaluation judge's classification reasoning.

Agent Mode makes the fingerprint concrete: A-D levels become CAN/CANNOT rules the student can push against.

## Agent Mode

### Entry Points

- **From Evaluate page**: "Red Team This Agent" button on results → opens `/chat?scenario=<id>&fingerprint=<string>`
- **From Chat page**: Scenario dropdown with reference fingerprints

### System Prompt Construction

Given a scenario + fingerprint, the agent persona prompt (`prompts/agent_persona.md`) includes:
- The scenario narrative (who the agent is, what domain)
- CAN/CANNOT rules from `shared/challenges.json`, one per dimension level
- The gating classification as an operating principle
- Jurisdiction context (same grounding levels)

Level A dimensions become hard constraints ("You CANNOT...").
Level B dimensions become conditional constraints ("You CAN... only with approval").
Level C/D dimensions become light/open permissions.

### Challenge Banner

Above the chat, a banner shows:
- Gating classification badge (color-coded)
- 2-3 concrete challenges derived from A-rated dimensions only
- Triggered gating rules
- Collapsible full fingerprint matrix

This focuses student attention on the interesting attack surfaces without overwhelming with all 7 dimensions.

### Shared Data

`shared/challenges.json` — constraint text and challenge prompts per dimension per level. Single source of truth read by TypeScript.

### New Files

- `prompts/agent_persona.md` — Mustache template for agent system prompt
- `shared/challenges.json` — CAN/CANNOT constraints and challenges per dimension/level
- `web/src/lib/agent-prompt.ts` — Builds agent prompt from scenario + fingerprint
- `web/src/lib/challenges.ts` — Generates challenges and constraints from fingerprint
- `web/src/components/ChallengeBanner.tsx` — Challenge card with attack targets
- `web/src/app/api/agent-prompt/route.ts` — POST endpoint to build agent prompt

### Modified Files

- `web/src/app/chat/page.tsx` — Agent/Judge mode toggle, scenario selector, challenge banner
- `web/src/app/api/chat/route.ts` — Accept `mode` and `agentPrompt` params
- `web/src/app/page.tsx` — "Red Team This Agent" button on results
