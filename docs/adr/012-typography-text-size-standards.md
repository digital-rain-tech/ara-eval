# ADR-012: Typography & Text Size Standards

**Status:** Accepted
**Date:** 2026-03-17
**Context:** Establishing consistent text sizing across the ARA-Eval web interface for readability and mobile accessibility. Adapted from 8-Bit Oracle's typography standards (ADR-001), adjusted for a data-dense evaluation tool.

## Background

The ARA-Eval web interface is a split-pane evaluation tool with dense information displays (fingerprint matrices, prompt text, chat messages, data tables). Unlike a consumer-facing app, it serves students and professors in a lab setting — primarily on laptops, occasionally on tablets.

The 8-Bit Oracle project established a strict 20px minimum for all user-facing content based on mobile accessibility research. ARA-Eval needs a more nuanced approach: interactive content (chat, forms, buttons) should be large and readable, while reference/inspection content (prompt text, metadata, data tables) can be smaller since it's read rather than interacted with.

## Decision

### Two Tiers of Content

**Tier 1 — Interactive content** (the student reads and acts on this):
- Chat messages, form inputs, buttons, scenario descriptions, challenge banners, gating verdicts
- Minimum: 16px (`text-base`), target: 18-20px (`text-lg` to `text-xl`)

**Tier 2 — Reference/inspection content** (the student scans or inspects this):
- Prompt inspector text, data table cells, metadata, token counts, session IDs, timestamps
- Minimum: 12px (`text-xs`), target: 14px (`text-sm`)

### Text Size Hierarchy

| Use Case | Tailwind Class | Size | Tier | Notes |
|----------|---------------|------|------|-------|
| **Page titles** | `text-lg` or larger | 18px+ | 1 | Nav, section headings |
| **Chat messages** | `text-sm` or larger | 14px+ | 1 | User and assistant messages |
| **Scenario narrative** | `text-sm` | 14px | 1 | Scenario description in input area |
| **Form inputs** | `text-sm` | 14px | 1 | Text inputs, textareas, dropdowns |
| **Buttons** | `text-sm` | 14px | 1 | Evaluate, Send, mode toggles |
| **Gating verdict** | `text-lg` | 18px | 1 | Classification badge text |
| **Challenge text** | `text-sm` | 14px | 1 | Attack target descriptions |
| **Fingerprint cells** | `text-sm font-bold` | 14px | 1 | A/B/C/D level indicators |
| **Prompt inspector** | `text-xs` | 12px | 2 | Full system prompt display |
| **Data table cells** | `text-xs` to `text-sm` | 12-14px | 2 | History, request inspector |
| **Metadata** | `text-xs` | 12px | 2 | Token counts, latency, session IDs |
| **Section labels** | `text-xs font-medium` | 12px | 2 | "Grounding Level:", "Model:" |

### Prompt Inspector Exception

The prompt inspector displays full system prompts that can be 60+ lines. Using `text-xs` (12px) with `leading-relaxed` is intentional — it maximizes visible content in the split pane so students can see more of the prompt without scrolling. The prompt text is reference material, not interactive content.

### Responsive Considerations

- ARA-Eval is primarily a desktop/laptop tool — the split-pane layout requires ~1024px minimum width
- On narrower screens, consider stacking panes vertically rather than increasing text sizes
- Chat messages should use `text-sm` minimum (14px) since they are the primary read surface
- Touch targets (buttons, dropdowns) should be at least 36px tall regardless of text size

### What NOT to Do

- Don't use `text-[10px]` or smaller for anything, including metadata
- Don't reduce prompt inspector text below `text-xs` (12px) — it becomes unreadable
- Don't use large text (`text-xl`+) for data tables — density matters for comparison
- Don't mix font sizes inconsistently within a component — pick one size per content type

## Rationale

1. **Data density** — Evaluation tools need to display 7-dimension matrices, 3-personality comparisons, and full prompt text simultaneously. Larger text means more scrolling and less context visible at once.
2. **Split-pane constraint** — Each pane gets 40-60% of viewport width. Content must be readable within ~400-600px width.
3. **Two audiences** — Interactive content (chat, forms) benefits from larger text. Inspection content (prompts, metadata) benefits from density.
4. **Laptop-first** — Students use this in a computer lab or on personal laptops, not primarily on phones.
5. **Consistency with 8-Bit Oracle principles** — We adopt the tier system and minimum floors, adapted for a data-dense context.

## References

- 8-Bit Oracle ADR-001: Typography & Text Size Standards (20px minimum for consumer mobile app)
- [WCAG Minimum Font Size Guide](https://www.a11y-collective.com/blog/wcag-minimum-font-size/) — No hard minimum specified, but recommends relative sizing and sufficient contrast
- [Font Size Guidelines for Responsive Websites](https://www.learnui.design/blog/mobile-desktop-website-font-size-guidelines.html) — 16-20px for body text depending on context
