# Backlog

Items identified through code review and project analysis. Not prioritized for immediate work.

## Infrastructure

- **Add CI workflow** — GitHub Actions to run `pytest` and a lightweight CLI smoke check on PRs. No CI exists today; regressions can merge undetected.

- **Extract shared module** — Labs 02, 03, and tests depend on `sys.path` mutation + `importlib.spec_from_file_location` to load Lab 01. Extract shared logic (LLM calls, gating rules, fingerprint parsing) into a proper package module (e.g., `ara_eval/core.py`).

- **Centralize framework constants** — Dimensions, level ordering, and gating rules are duplicated across lab scripts and `generate-report.py`. Single source of truth to prevent drift.

## Developer experience

- **Add `requirements-dev.txt`** — Split test/tooling dependencies (`pytest`, etc.) from runtime dependencies. Document a single reproducible test flow for contributors.

- **Align default model references** — `docs/models.md` says Qwen3 235B is the current default; code and README default to Arcee Trinity. Pick one source of truth.

## Documentation

- **Add `AGENTS.md`** — Model-agnostic repo guidance (run/test/review commands, architecture map, conventions) for multi-agent contributors. `CLAUDE.md` is Claude-specific.
