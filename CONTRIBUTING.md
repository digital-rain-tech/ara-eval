# Contributing to ARA-Eval

The most valuable thing you can contribute is a **story** — a business situation where AI autonomy gets interesting. You don't need to know anything about our framework, our rubric, or our evaluation pipeline. Just tell us what happened.

## Share a scenario (2 minutes)

[**Open an issue**](../../issues/new?template=scenario.yml) and answer four questions:

1. **What happened?** — Describe the situation. A messy workflow, a process you've debated automating, something that went wrong, a news story that stuck with you.
2. **What industry?** — Pick from the dropdown.
3. **Rough company size?** — Small / mid / large.
4. **Is this from public reporting?** — If it's a news story or enforcement action, just include the link. If it's from your own experience, keep it anonymized (no company names, no individual names, no exact figures that could identify a specific transaction).

That's it. We'll convert your story into a structured scenario, run it through the evaluation pipeline, and credit you.

### What makes a good submission

The best stories have **tension** — situations where the right answer isn't obvious:

- A business process where you've debated whether AI could handle it — and people disagree
- A workflow that's routine 95% of the time but catastrophic in the other 5%
- A case where speed matters but so does getting it right
- Something that went wrong — an algorithm caused harm, or a manual process was too slow
- A situation where compliance, operations, and legal would each give a different answer

You don't need to have AI in place already. "Here's a messy workflow we're thinking about automating" is just as valuable as "here's what happened when we tried."

### What we do with your submission

1. We structure it into the ARA-Eval scenario format (7-dimension risk fingerprint)
2. We run it through our model battery to see how different LLMs evaluate the risk
3. If it adds genuine evaluation value, it gets promoted to the core scenario set
4. You get credited as a contributor

### Public stories vs. personal experience

- **Public stories** (news articles, enforcement actions, case studies): Include the link. No anonymization needed — it's already public. Our existing scenarios include the Knight Capital $440M trading loss, Samsung's ChatGPT data leak, and UnitedHealth's algorithmic claims denial.
- **Personal experience**: Keep it anonymized. No company names, no individual names, round the dollar amounts. We want to know the *shape* of the problem, not the identity of the company.

---

## Technical contributions

If you want to go deeper, there are two additional ways to contribute.

### Structured scenarios (PR)

If you're familiar with the framework and want to submit a fully structured scenario, add a JSON file to `contributions/scenarios/<vertical>/` following the format in `scenarios/starter-scenarios.json`. Include the `origin` field:

| Origin | Meaning |
|--------|---------|
| `industry-practitioner` | Based on a real decision you or your team faced |
| `llm-assisted` | Real experience, structured or anonymized with LLM help |
| `public-incident` | Based on published reporting (cite sources) |
| `llm-generated` | Primarily LLM-generated |
| `academic` | Created for teaching or research |

Branch naming: `scenario/<scenario-id>`. See `scenarios/starter-scenarios.json` for the full schema.

### Model evaluation results (PR)

Run ARA-Eval through a different LLM and submit the results so we can build a cross-model comparison dataset measuring instruction following, judgement quality, and reliability.

1. Run Lab 01 (`--all` flag) and Lab 03 (at least 5 reps) with your model
2. Copy results to `contributions/models/<model-name>/` with a `metadata.json` (model ID, provider, run date, commit hash, cost)
3. Open a PR with title `model: <model-name>`

See `docs/models.md` for the model list and `labs/README.md` for lab details.

---

## Questions?

Open an issue with the `question` label, or see the [framework specification](docs/framework.md) for rubric definitions.
