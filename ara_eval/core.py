"""
ARA-Eval Core: Shared constants, utilities, and functions.
==========================================================

Single source of truth for dimensions, gating rules, LLM interaction,
prompt templates, DB persistence, and scenario loading.

All lab scripts import from this module rather than duplicating logic.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import chevron
import httpx
from dotenv import load_dotenv
from json_repair import repair_json

# ---------------------------------------------------------------------------
# Environment and paths
# ---------------------------------------------------------------------------

_root = Path(__file__).parent.parent
load_dotenv(_root / ".env.local")
load_dotenv(_root / ".env")

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Load shared constants from shared/dimensions.json (single source of truth)
_shared_dir = _root / "shared"
with open(_shared_dir / "dimensions.json") as _f:
    _dim_config = json.load(_f)

DIMENSIONS = _dim_config["dimensions"]
DIMENSION_LABELS = _dim_config["dimension_labels"]
LEVEL_ORDER = _dim_config["level_order"]

with open(_shared_dir / "models.json") as _f:
    _models_config = json.load(_f)

DEFAULT_MODEL = next(m["id"] for m in _models_config if m.get("is_default"))
# Median response time for Arcee Trinity across 387 calls. Used as the minimum
# interval between API calls to avoid rate-limiting on free-tier models.
DEFAULT_CALL_DELAY = 17.0

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.environ.get("ARA_MODEL", DEFAULT_MODEL)


def make_headers(api_key: str) -> dict:
    """Build OpenRouter request headers from an API key."""
    return {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://github.com/digital-rain-tech/ara-eval",
        "X-Title": "ARA-Eval (Agentic Readiness Assessment)",
        "Content-Type": "application/json",
    }


OPENROUTER_HEADERS = make_headers(OPENROUTER_API_KEY) if OPENROUTER_API_KEY else None


# ---------------------------------------------------------------------------
# Prompt templates (loaded from prompts/ directory, composed via Mustache)
# ---------------------------------------------------------------------------

PROMPTS_DIR = _root / "prompts"


def load_prompt(relative_path: str) -> str:
    resolved = (PROMPTS_DIR / relative_path).resolve()
    if not str(resolved).startswith(str(PROMPTS_DIR.resolve())):
        raise ValueError(f"Prompt path escapes prompts directory: {relative_path}")
    return resolved.read_text()


def load_index(subdir: str) -> dict:
    return json.loads((PROMPTS_DIR / subdir / "_index.json").read_text())


def build_system_prompt(personality_id: str, jurisdiction: str = "hk", rubric: str = "rubric.md") -> str:
    """Compose system prompt from personality + rubric + jurisdiction + output format."""
    jurisdictions = load_index("jurisdictions")
    personalities = load_index("personalities")

    jurisdiction_label = jurisdictions[jurisdiction]["label"]
    jurisdiction_content = load_prompt(f"jurisdictions/{jurisdictions[jurisdiction]['file']}")

    # Render personality with jurisdiction label
    personality_template = load_prompt(f"personalities/{personalities[personality_id]['file']}")
    personality_rendered = chevron.render(personality_template, {"jurisdiction_label": jurisdiction_label})

    # Render rubric with jurisdiction as a partial
    rubric_template = load_prompt(rubric)
    rubric_rendered = chevron.render(rubric_template, {}, partials_dict={"jurisdiction": jurisdiction_content})

    output_format = load_prompt("output_format.md")

    return personality_rendered.strip() + "\n\n" + rubric_rendered.strip() + "\n\n" + output_format.strip()


def build_user_prompt(scenario: dict, structured: bool = False) -> str:
    """Render user prompt template with scenario data.

    If structured=True and the scenario has structured_context, uses the
    structured prompt template which includes subject/object/action decomposition.
    """
    sc = scenario.get("structured_context", {})
    if structured and sc:
        template = load_prompt("user_prompt_structured.md")
        return chevron.render(template, {
            "scenario": scenario.get("scenario", ""),
            "domain": scenario.get("domain", ""),
            "industry": scenario.get("industry", ""),
            "jurisdiction_notes": scenario.get("jurisdiction_notes", "N/A"),
            "subject": sc.get("subject", ""),
            "object": sc.get("object", ""),
            "action": sc.get("action", ""),
            "regulatory_triggers": ", ".join(sc.get("regulatory_triggers", [])),
            "time_pressure": sc.get("time_pressure", ""),
            "confidence_signal": sc.get("confidence_signal", ""),
            "reversibility": sc.get("reversibility", ""),
            "blast_radius": sc.get("blast_radius", ""),
        }).strip()

    template = load_prompt("user_prompt.md")
    return chevron.render(template, {
        "scenario": scenario.get("scenario", ""),
        "domain": scenario.get("domain", ""),
        "industry": scenario.get("industry", ""),
        "jurisdiction_notes": scenario.get("jurisdiction_notes", "N/A"),
    }).strip()


# Load personality index for iteration
PERSONALITIES = load_index("personalities")


# ---------------------------------------------------------------------------
# SQLite persistence
# ---------------------------------------------------------------------------

def init_db(db_path: Path) -> sqlite3.Connection:
    """Create tables for full traceability."""
    conn = sqlite3.connect(str(db_path))

    # Runs table — groups all calls from a single pipeline execution
    conn.execute("""
        CREATE TABLE IF NOT EXISTS eval_runs (
            run_id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            model_requested TEXT NOT NULL,
            scenario_count INTEGER NOT NULL,
            personality_count INTEGER NOT NULL,
            total_calls INTEGER NOT NULL DEFAULT 0,
            successful_calls INTEGER NOT NULL DEFAULT 0,
            failed_calls INTEGER NOT NULL DEFAULT 0,
            total_input_tokens INTEGER NOT NULL DEFAULT 0,
            total_output_tokens INTEGER NOT NULL DEFAULT 0,
            total_cost_usd REAL NOT NULL DEFAULT 0.0,
            total_duration_ms INTEGER NOT NULL DEFAULT 0,
            python_version TEXT,
            metadata TEXT
        )
    """)

    # Requests table — one row per LLM call with full provenance
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_provider_requests (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            run_id TEXT NOT NULL,
            request_id TEXT NOT NULL,
            provider TEXT NOT NULL,
            model_requested TEXT NOT NULL,
            model_used TEXT,
            actual_provider TEXT,
            use_case TEXT NOT NULL,
            scenario_id TEXT,
            personality TEXT,
            response_status INTEGER,
            error_message TEXT,
            input_tokens INTEGER,
            output_tokens INTEGER,
            total_tokens INTEGER,
            cost_usd REAL,
            response_time_ms INTEGER,
            fingerprint_string TEXT,
            gating_classification TEXT,
            gating_rules_triggered TEXT,
            raw_request TEXT,
            raw_response TEXT,
            parsed_result TEXT,
            openrouter_id TEXT,
            system_fingerprint TEXT,
            jurisdiction TEXT,
            rubric TEXT,
            FOREIGN KEY (run_id) REFERENCES eval_runs(run_id)
        )
    """)

    # Migration: add columns for existing databases
    for col, col_type in [("jurisdiction", "TEXT"), ("rubric", "TEXT")]:
        try:
            conn.execute(f"ALTER TABLE ai_provider_requests ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass  # column already exists

    conn.execute("CREATE INDEX IF NOT EXISTS idx_run_id ON ai_provider_requests(run_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_request_id ON ai_provider_requests(request_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scenario_id ON ai_provider_requests(scenario_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scenario_personality ON ai_provider_requests(scenario_id, personality)")
    conn.commit()
    return conn


def log_request(
    conn: sqlite3.Connection,
    *,
    run_id: str,
    request_id: str,
    scenario_id: str,
    personality: str,
    response_status: Optional[int],
    error_message: Optional[str],
    input_tokens: Optional[int],
    output_tokens: Optional[int],
    total_tokens: Optional[int],
    cost_usd: Optional[float],
    response_time_ms: int,
    model_used: Optional[str],
    actual_provider: Optional[str],
    fingerprint_string: Optional[str],
    gating_classification: Optional[str],
    gating_rules_triggered: Optional[List[str]],
    raw_request: dict,
    raw_response: Optional[dict],
    parsed_result: Optional[dict],
    openrouter_id: Optional[str],
    system_fingerprint: Optional[str],
    jurisdiction: Optional[str] = None,
    rubric: Optional[str] = None,
):
    """Persist a single LLM request/response with full metadata."""
    conn.execute(
        """INSERT INTO ai_provider_requests
           (id, created_at, run_id, request_id, provider, model_requested,
            model_used, actual_provider, use_case, scenario_id, personality,
            response_status, error_message, input_tokens, output_tokens,
            total_tokens, cost_usd, response_time_ms, fingerprint_string,
            gating_classification, gating_rules_triggered,
            raw_request, raw_response, parsed_result,
            openrouter_id, system_fingerprint, jurisdiction, rubric)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            str(uuid.uuid4()),
            datetime.now(timezone.utc).isoformat(),
            run_id,
            request_id,
            "openrouter",
            MODEL,
            model_used,
            actual_provider,
            "risk_fingerprinting",
            scenario_id,
            personality,
            response_status,
            error_message,
            input_tokens,
            output_tokens,
            total_tokens,
            cost_usd,
            response_time_ms,
            fingerprint_string,
            gating_classification,
            json.dumps(gating_rules_triggered) if gating_rules_triggered else None,
            json.dumps(raw_request),
            json.dumps(raw_response) if raw_response else None,
            json.dumps(parsed_result) if parsed_result else None,
            openrouter_id,
            system_fingerprint,
            jurisdiction,
            rubric,
        ),
    )
    conn.commit()


def update_run(conn: sqlite3.Connection, run_id: str, **kwargs: Any):
    """Update run-level aggregates."""
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    conn.execute(
        f"UPDATE eval_runs SET {sets} WHERE run_id = ?",
        (*kwargs.values(), run_id),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Gating rules (applied programmatically, not by the LLM)
# ---------------------------------------------------------------------------

def apply_gating_rules(fingerprint: dict) -> dict:
    """
    Apply deterministic gating rules to a risk fingerprint.
    Returns the readiness classification and which rules triggered.
    """
    levels = {dim: fingerprint[dim]["level"] for dim in DIMENSIONS}
    triggered = []

    # Hard gates
    if levels["regulatory_exposure"] == "A":
        triggered.append("HARD GATE: Regulatory Exposure = A → autonomy not permitted")
    if levels["failure_blast_radius"] == "A":
        triggered.append("HARD GATE: Failure Blast Radius = A → human oversight required")

    # Check for any Level A
    a_dims = [d for d, l in levels.items() if l == "A"]
    for d in a_dims:
        if d not in ("regulatory_exposure", "failure_blast_radius"):
            triggered.append(f"SOFT GATE: {DIMENSION_LABELS[d]} = A → requires documented risk acceptance")

    # Determine classification
    if any("HARD GATE" in t for t in triggered):
        classification = "human_in_loop_required"
    elif any("SOFT GATE" in t for t in triggered):
        classification = "ready_with_prerequisites"
    elif all(levels[d] in ("C", "D") for d in DIMENSIONS):
        classification = "ready_now"
    else:
        classification = "ready_with_prerequisites"

    return {
        "classification": classification,
        "triggered_rules": triggered,
        "fingerprint_string": "-".join(levels[d] for d in DIMENSIONS),
    }


# ---------------------------------------------------------------------------
# OpenRouter response parsing helpers
# ---------------------------------------------------------------------------

def extract_usage(data: dict) -> Dict[str, Optional[int]]:
    """Extract token usage from OpenRouter response."""
    usage = data.get("usage", {})
    return {
        "input_tokens": usage.get("prompt_tokens"),
        "output_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"),
    }


def extract_provider_info(data: dict) -> Dict[str, Optional[str]]:
    """Extract actual model/provider from OpenRouter response."""
    return {
        "model_used": data.get("model"),
        "openrouter_id": data.get("id"),
        "system_fingerprint": data.get("system_fingerprint"),
        "actual_provider": data.get("provider"),
    }


def extract_cost(data: dict) -> Optional[float]:
    """Extract cost from OpenRouter response. Returns 0.0 for free models."""
    usage = data.get("usage", {})
    # OpenRouter uses "cost" in the usage block
    if "cost" in usage:
        return usage["cost"]
    if "total_cost" in usage:
        return usage["total_cost"]
    # Free models don't report cost — check the model ID
    model_id = data.get("model", "") or MODEL
    if model_id.endswith(":free"):
        return 0.0
    return None


def parse_llm_json(text: str) -> dict:
    """
    Parse JSON from LLM response with multi-strategy fallback.

    Strategies (in order):
      1. Strip thinking tags and markdown fences, then direct parse
      2. json_repair for truncated/malformed output
      3. Fix common syntax issues (trailing commas, double commas)
      4. Brace-counting extraction (handles preamble/postamble text)
    """
    # Pre-processing: strip thinking tags (Qwen3 may include <think>...</think>)
    if "<think>" in text:
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

    # Pre-processing: strip markdown code fences
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    # Strategy 1: Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: json_repair library (handles truncation, missing brackets, etc.)
    try:
        repaired = repair_json(text, skip_json_loads=True)
        parsed = json.loads(repaired)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Strategy 3: Fix common syntax issues, then repair
    cleaned = text
    cleaned = re.sub(r",,+", ",", cleaned)              # double commas
    cleaned = re.sub(r",(\s*[}\]])", r"\1", cleaned)     # trailing commas
    try:
        repaired = repair_json(cleaned, skip_json_loads=True)
        parsed = json.loads(repaired)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Strategy 4: Brace-counting extraction (LLM added preamble/postamble)
    start = text.find("{")
    if start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    candidate = text[start:i + 1]
                    try:
                        repaired = repair_json(candidate, skip_json_loads=True)
                        parsed = json.loads(repaired)
                        if isinstance(parsed, dict):
                            return parsed
                    except Exception:
                        pass
                    break

    # All strategies failed — raise with context
    raise json.JSONDecodeError(
        f"All JSON parsing strategies failed. Response preview: {text[:200]}",
        text, 0
    )


# ---------------------------------------------------------------------------
# LLM evaluation via OpenRouter
# ---------------------------------------------------------------------------

def evaluate_scenario(
    http_client: httpx.Client,
    db_conn: sqlite3.Connection,
    run_id: str,
    scenario: dict,
    personality_id: str,
    jurisdiction: str = "hk",
    rubric: str = "rubric.md",
    structured: bool = False,
) -> dict:
    """
    Submit a scenario to the LLM judge via OpenRouter.
    Logs full request/response metadata to SQLite.
    Returns the parsed risk fingerprint.
    """
    system = build_system_prompt(personality_id, jurisdiction, rubric)
    user_content = build_user_prompt(scenario, structured=structured)

    request_body = {
        "model": MODEL,
        "max_tokens": 4096,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
    }

    request_id = str(uuid.uuid4())
    start = time.monotonic()

    try:
        response = http_client.post(OPENROUTER_URL, json=request_body)
        elapsed_ms = int((time.monotonic() - start) * 1000)

        response.raise_for_status()
        data = response.json()

        # Extract all metadata from response
        usage = extract_usage(data)
        provider_info = extract_provider_info(data)
        cost = extract_cost(data)

        # Parse the LLM's JSON output
        content = data["choices"][0]["message"]["content"]
        if content is None:
            raise ValueError("LLM returned empty content (None)")
        text = content.strip()
        if not text:
            raise ValueError("LLM returned empty content (blank string)")
        parsed = parse_llm_json(text)

        # Validate parsed structure before applying gating rules
        if not isinstance(parsed, dict) or "dimensions" not in parsed:
            raise ValueError(f"LLM response missing 'dimensions' key. Got keys: {list(parsed.keys()) if isinstance(parsed, dict) else type(parsed).__name__}")
        dims = parsed["dimensions"]
        if not isinstance(dims, dict):
            raise ValueError(f"'dimensions' is {type(dims).__name__}, expected dict")
        missing = [d for d in DIMENSIONS if d not in dims]
        if missing:
            raise ValueError(f"Missing dimensions: {', '.join(missing)}")
        valid_levels = set(LEVEL_ORDER.keys())
        for d in DIMENSIONS:
            if not isinstance(dims[d], dict) or "level" not in dims[d]:
                raise ValueError(f"Dimension '{d}' malformed: expected dict with 'level' key, got {dims[d]}")
            if dims[d]["level"] not in valid_levels:
                raise ValueError(f"Dimension '{d}' has invalid level '{dims[d]['level']}', expected one of {sorted(valid_levels)}")

        # Apply gating rules
        gating = apply_gating_rules(parsed["dimensions"])

        log_request(
            db_conn,
            run_id=run_id,
            request_id=request_id,
            scenario_id=scenario["id"],
            personality=personality_id,
            response_status=response.status_code,
            error_message=None,
            input_tokens=usage["input_tokens"],
            output_tokens=usage["output_tokens"],
            total_tokens=usage["total_tokens"],
            cost_usd=cost,
            response_time_ms=elapsed_ms,
            model_used=provider_info["model_used"],
            actual_provider=provider_info["actual_provider"],
            fingerprint_string=gating["fingerprint_string"],
            gating_classification=gating["classification"],
            gating_rules_triggered=gating["triggered_rules"],
            raw_request=request_body,
            raw_response=data,
            parsed_result=parsed,
            openrouter_id=provider_info["openrouter_id"],
            system_fingerprint=provider_info["system_fingerprint"],
            jurisdiction=jurisdiction,
            rubric=rubric,
        )

        return {"parsed": parsed, "gating": gating, "usage": usage, "cost": cost,
                "response_time_ms": elapsed_ms, "model_used": provider_info["model_used"]}

    except Exception as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        status = getattr(getattr(e, "response", None), "status_code", None)
        raw_resp = None
        try:
            raw_resp = getattr(e, "response", None)
            if raw_resp is not None:
                raw_resp = raw_resp.json()
        except Exception:
            pass

        log_request(
            db_conn,
            run_id=run_id,
            request_id=request_id,
            scenario_id=scenario["id"],
            personality=personality_id,
            response_status=status,
            error_message=str(e),
            input_tokens=None,
            output_tokens=None,
            total_tokens=None,
            cost_usd=None,
            response_time_ms=elapsed_ms,
            model_used=None,
            actual_provider=None,
            fingerprint_string=None,
            gating_classification=None,
            gating_rules_triggered=None,
            raw_request=request_body,
            raw_response=raw_resp,
            parsed_result=None,
            openrouter_id=None,
            system_fingerprint=None,
            jurisdiction=jurisdiction,
            rubric=rubric,
        )
        raise


# ---------------------------------------------------------------------------
# Analysis helpers
# ---------------------------------------------------------------------------

def get_run_dir(results_dir: Path) -> Path:
    """Create and return a date-stamped subdirectory under results/."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    run_dir = results_dir / today
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def personality_delta(results: dict) -> dict:
    """
    Compute where personality variants disagree on classifications.
    The delta between perspectives reveals where organizational alignment
    is needed before deploying autonomous agents.
    """
    deltas = {}
    for dim in DIMENSIONS:
        levels = {}
        for personality_id, result in results.items():
            levels[personality_id] = result["parsed"]["dimensions"][dim]["level"]

        unique_levels = set(levels.values())
        if len(unique_levels) > 1:
            ordinals = [LEVEL_ORDER[l] for l in levels.values()]
            spread = max(ordinals) - min(ordinals)
            deltas[DIMENSION_LABELS[dim]] = {
                "levels": {PERSONALITIES[p]["label"]: l for p, l in levels.items()},
                "spread": spread,
                "consensus": False,
            }
        else:
            deltas[DIMENSION_LABELS[dim]] = {
                "levels": {PERSONALITIES[p]["label"]: l for p, l in levels.items()},
                "spread": 0,
                "consensus": True,
            }

    return deltas


def print_fingerprint(scenario_id: str, personality_label: str, result: dict):
    """Pretty-print a single evaluation result."""
    parsed = result["parsed"]
    gating = result["gating"]

    print(f"\n{'='*70}")
    print(f"  {scenario_id} — {personality_label}")
    print(f"  Fingerprint: {gating['fingerprint_string']}")
    print(f"  Classification: {gating['classification'].replace('_', ' ').upper()}")
    if result.get("model_used"):
        print(f"  Model: {result['model_used']}")
    if result.get("usage", {}).get("total_tokens"):
        u = result["usage"]
        cost_str = f"  ${result['cost']:.6f}" if result.get("cost") else ""
        print(f"  Tokens: {u['input_tokens']} in / {u['output_tokens']} out / {u['total_tokens']} total{cost_str}")
    print(f"  Latency: {result['response_time_ms']}ms")
    print(f"{'='*70}")

    for dim in DIMENSIONS:
        d = parsed["dimensions"][dim]
        label = DIMENSION_LABELS[dim].ljust(25)
        print(f"  {label} Level {d['level']}  {d.get('reasoning', '')}")

    if gating["triggered_rules"]:
        print(f"\n  Triggered rules:")
        for rule in gating["triggered_rules"]:
            print(f"    → {rule}")

    print(f"\n  Interpretation: {parsed.get('interpretation', 'N/A')}")


def print_delta_report(scenario_id: str, deltas: dict):
    """Print the personality-variant delta analysis."""
    disagreements = {k: v for k, v in deltas.items() if not v["consensus"]}

    print(f"\n{'='*70}")
    print(f"  PERSONALITY DELTA ANALYSIS — {scenario_id}")
    print(f"{'='*70}")

    if not disagreements:
        print("  All stakeholder archetypes agree on all dimensions.")
        return

    print(f"  Disagreements found on {len(disagreements)}/{len(DIMENSIONS)} dimensions:\n")

    for dim_label, delta in sorted(disagreements.items(), key=lambda x: -x[1]["spread"]):
        print(f"  {dim_label} (spread: {delta['spread']} levels)")
        for personality_label, level in delta["levels"].items():
            print(f"    {personality_label.ljust(35)} Level {level}")
        print()


def print_run_summary(run_stats: dict):
    """Print run-level summary."""
    print(f"\n{'='*70}")
    print(f"  RUN SUMMARY")
    print(f"{'='*70}")
    print(f"  Run ID:       {run_stats['run_id']}")
    print(f"  Model:        {MODEL}")
    print(f"  Calls:        {run_stats['successful']}/{run_stats['total']} successful")
    print(f"  Total tokens: {run_stats['input_tokens']} in / {run_stats['output_tokens']} out")
    print(f"  Total cost:   ${run_stats['cost']:.6f}")
    print(f"  Total time:   {run_stats['duration_ms']}ms ({run_stats['duration_ms']/1000:.1f}s)")
    print(f"{'='*70}")


# ---------------------------------------------------------------------------
# Scenario loading
# ---------------------------------------------------------------------------

def load_scenarios(use_all: bool = False) -> list:
    """Load scenarios, filtering to core set unless --all is specified."""
    scenarios_path = _root / "scenarios" / "starter-scenarios.json"
    with open(scenarios_path) as f:
        all_scenarios = json.load(f)
    if use_all:
        return all_scenarios
    core = [s for s in all_scenarios if s.get("core", False)]
    return core if core else all_scenarios


# ---------------------------------------------------------------------------
# Retry with pacing and exponential backoff
# ---------------------------------------------------------------------------

def _is_rate_limit_error(exc: Exception) -> bool:
    """Check if an exception indicates rate-limiting or empty response."""
    status = getattr(getattr(exc, "response", None), "status_code", None)
    if status == 429:
        return True
    msg = str(exc)
    if "empty content" in msg.lower():
        return True
    return False


def evaluate_with_retry(
    http_client: httpx.Client,
    db_conn: sqlite3.Connection,
    run_id: str,
    scenario: dict,
    personality_id: str,
    *,
    jurisdiction: str = "hk",
    rubric: str = "rubric.md",
    structured: bool = False,
    max_retries: int = 2,
    call_delay: float = DEFAULT_CALL_DELAY,
    verbose: bool = True,
) -> dict:
    """
    Call evaluate_scenario with pacing and exponential backoff.

    - Ensures at least `call_delay` seconds elapse between the start of each
      attempt (matches Arcee Trinity's median latency so faster models don't
      outrun free-tier rate limits).
    - On rate-limit errors (429 or empty content), backs off exponentially:
      wait 2^attempt * call_delay before the next retry.
    - On other errors, retries immediately (up to max_retries).
    """
    last_attempt_start = 0.0

    for attempt in range(1 + max_retries):
        # Pacing: ensure minimum interval since last attempt started
        if last_attempt_start > 0:
            elapsed_since_start = time.monotonic() - last_attempt_start
            if _is_rate_limit_error(Exception("")) if attempt == 0 else False:
                pass  # first attempt, no delay
            wait = call_delay - elapsed_since_start
            if wait > 0:
                time.sleep(wait)

        last_attempt_start = time.monotonic()

        try:
            result = evaluate_scenario(
                http_client, db_conn, run_id, scenario, personality_id,
                jurisdiction=jurisdiction, rubric=rubric, structured=structured,
            )
            return result

        except Exception as e:
            is_last = attempt >= max_retries
            if is_last:
                raise

            if _is_rate_limit_error(e):
                # Exponential backoff: 2^attempt * base delay
                backoff = (2 ** (attempt + 1)) * call_delay
                if verbose:
                    print(f"rate-limited, backing off {backoff:.0f}s...", end=" ", flush=True)
                time.sleep(backoff)
            else:
                if verbose:
                    print(f"attempt {attempt + 1} failed ({e}), retrying...", end=" ", flush=True)
