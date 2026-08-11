# Security Policy

ARA-Eval is maintained by [Digital Rain Technologies](https://digitalrain.studio). We take
reports about the hosted evaluator and this codebase seriously, and we'd rather hear about a
problem privately than read about it publicly.

## Reporting a vulnerability

**Preferred:** use GitHub's private reporting —
[Report a vulnerability](https://github.com/digital-rain-tech/ara-eval/security/advisories/new).
This opens a draft advisory visible only to you and the maintainers, and keeps the discussion,
the fix, and any eventual CVE in one place.

**Alternative:** email <security@digitalrain.studio>.

Please **do not open a public issue** for a suspected vulnerability. Public issues are the right
place for bugs, wrong classifications, and scenario disputes — see "Not a vulnerability" below.

A useful report includes: what you did, what happened, what you expected, and enough detail for us
to reproduce it. A minimal proof of concept beats a scanner export.

### What to expect

This is a small, largely volunteer-maintained project — we're setting expectations we can actually
meet rather than ones that sound impressive:

| Stage | Target |
|---|---|
| Acknowledgement | 5 business days |
| Initial assessment | 10 business days |
| Fix or documented mitigation | Depends on severity; we'll tell you what we're doing and when |

We'll keep you updated as we work, and credit you in the advisory and release notes unless you'd
rather stay anonymous. **We do not run a paid bounty program.**

## Scope

### In scope

- **The hosted evaluator** — `app.ara-eval.org` and its Vercel deployment.
- **API routes** under `web/src/app/api/` — `evaluate`, `chat`, `chat/sessions`, `runs`,
  `requests`, `scenarios`, `prompt`, `agent-prompt`, `reference`.
- **Data isolation** — Supabase row-level security on the `ara_*` tables, anonymous-auth session
  handling, and anything that lets one user read or modify another user's runs, chat sessions, or
  request logs.
- **Secret exposure** — any path that leaks `OPENROUTER_API_KEY`, Supabase keys, or other
  server-side configuration to a client.
- **Path traversal** in prompt and scenario loading (`load_prompt()` / `load_scenarios()` in
  `ara_eval/core.py`, and the web app's equivalents).
- **Server-side request forgery, injection, or RCE** reachable from the deployed app.
- **The self-host path** — `web/Dockerfile` and the `BUILD_STANDALONE=1` build.
- **Dependency vulnerabilities** where you can show a plausible path to exploitation in this
  project. (Dependabot alerts are enabled; a report that merely restates one adds little.)

### Not a vulnerability

ARA-Eval is an *adversarial evaluation framework*, so a few things that look like findings are
working as designed:

- **Manipulating model output.** Making the evaluator produce a wrong risk fingerprint, hallucinate
  a regulatory citation, or disagree with a reference fingerprint is a *research finding*, not a
  security issue. Open a public issue — we want these.
- **Jailbreaking the judge.** The red-teaming chat at `/chat` exists to be attacked. Prompt
  injection that only changes what the model *says* is the product working.
- **"I bypassed the gate."** Gating rules are deterministic Python in `ara_eval/core.py`, never
  delegated to the model. Influencing the LLM does not bypass a gate — the gate re-derives its
  verdict from the classification in code. If you find a case where it *does*, that's a
  correctness bug worth a public issue.
- **Third-party infrastructure** — Vercel, Supabase, OpenRouter, and the upstream model providers.
  Report those to the vendor directly.
- **Model provider behaviour** — safety failures, refusals, or data handling by models reached via
  OpenRouter.
- Missing security headers, rate limiting, or cookie flags with no demonstrated impact.
- Automated scanner output without a working proof of concept.
- Social engineering, physical attacks, or denial of service.

The line worth stating plainly: **prompt injection is in scope when it causes server-side effects**
— exfiltrating secrets, reaching another user's data, or making the server issue requests on the
attacker's behalf. It is out of scope when it only steers the conversation.

## Testing guidelines

If you're probing the hosted app, please:

- Use your own anonymous session and your own data.
- Stop at proof of concept — don't pivot, pull data at scale, or persist access.
- Don't run automated scanners or load tests against `app.ara-eval.org`. Run the app locally
  instead (see the README); it's designed for that.
- Don't degrade service for other users. The evaluator is used in classrooms.

## Supported versions

There are no tagged releases. Security fixes land on `main` and are deployed to
`app.ara-eval.org`. If you self-host, track `main`.

## Secrets

If you find a credential committed to this repository or exposed by the app, report it privately
through the channels above — don't test how far it gets you. Secret scanning and push protection
are enabled, but neither is a guarantee.
