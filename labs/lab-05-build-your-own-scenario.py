"""
ARA-Eval Lab 05: Build Your Own Scenario
=========================================

Write a scenario, predict its risk fingerprint, run it through the
pipeline, and compare your prediction against the LLM judge.

The deepest learning comes from authoring, not analyzing. This lab
guides you through writing a scenario from a real-world case, predicting
the fingerprint yourself, then discovering where the model agrees and
disagrees with your judgment.

Prerequisites:
    pip install -r requirements.txt

Usage:
    # Step 1: Generate a scenario template
    python labs/lab-05-build-your-own-scenario.py --init my-scenario-001

    # Step 2: Edit scenarios/custom/my-scenario-001.json (fill in the blanks)

    # Step 3: Predict your fingerprint (before running the model!)
    python labs/lab-05-build-your-own-scenario.py --predict my-scenario-001

    # Step 4: Run the model and compare
    python labs/lab-05-build-your-own-scenario.py --run my-scenario-001

    # Step 5: Compare your prediction vs model vs reference (if provided)
    python labs/lab-05-build-your-own-scenario.py --compare my-scenario-001

Output:
    scenarios/custom/<id>.json — your scenario
    scenarios/custom/<id>-prediction.json — your predicted fingerprint
    results/ — model evaluation results
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

from ara_eval.core import (
    DIMENSIONS,
    DIMENSION_LABELS,
    LEVEL_ORDER,
    MODEL,
    OPENROUTER_API_KEY,
    OPENROUTER_HEADERS,
    PERSONALITIES,
    apply_gating_rules,
    evaluate_with_retry,
    get_run_dir,
    init_db,
    update_run,
)

_root = Path(__file__).parent.parent
CUSTOM_DIR = _root / "scenarios" / "custom"

TEMPLATE = {
    "id": "",
    "domain": "",
    "industry": "",
    "risk_tier": "medium",
    "based_on": "Describe the real-world case, news story, or personal experience this is based on",
    "scenario": "Write 3-5 sentences describing the situation. Include: what the AI agent does, what data it uses, what the stakes are, and what alternatives exist (escalation, human review, etc). Be specific — name amounts, timeframes, confidence levels.",
    "structured_context": {
        "subject": "Who/what is acting (e.g., 'AI claims processing agent at AIA')",
        "object": "What is being acted upon (e.g., 'health insurance claim, HK$180,000')",
        "action": "What the agent does (e.g., 'approve and disburse payment without human review')",
        "regulatory_triggers": ["List applicable regulations"],
        "time_pressure": "How much time does the situation allow before a decision must be made?",
        "confidence_signal": "What data does the agent have, and how reliable is it?",
        "reversibility": "Can the action be undone? At what cost?",
        "blast_radius": "If wrong, who or what is affected?"
    },
    "reference_fingerprint": {
        "decision_reversibility": "?",
        "failure_blast_radius": "?",
        "regulatory_exposure": "?",
        "human_override_latency": "?",
        "data_confidence": "?",
        "accountability_chain": "?",
        "graceful_degradation": "?"
    },
    "reference_interpretation": "Write one sentence: what is the readiness classification and why?",
    "jurisdiction_notes": "What regulatory frameworks apply? (e.g., HKMA, SFC, PDPO, PIPL)"
}

PREDICTION_PROMPTS = {
    "decision_reversibility": "Can the action be undone? A=irreversible, B=hard to reverse, C=easily reversible, D=fully reversible",
    "failure_blast_radius": "If wrong, how many affected? A=systemic, B=multi-customer, C=single-customer, D=internal only",
    "regulatory_exposure": "Regulatory mandate? A=direct mandate, B=guidance applies, C=general compliance, D=unregulated",
    "human_override_latency": "How much time does the situation allow? A=seconds (no human possible), B=hours, C=days, D=no deadline",
    "data_confidence": "Agent's signal quality? A=ambiguous/conflicting, B=partial, C=strong with caveats, D=high-confidence",
    "accountability_chain": "Who is responsible? A=no clear accountability, B=gaps exist, C=clear with audit, D=full transparency",
    "graceful_degradation": "If agent fails? A=cascading failure, B=ungraceful, C=contained, D=safe failure",
}


def init_scenario(scenario_id: str):
    """Create a scenario template for the student to fill in."""
    CUSTOM_DIR.mkdir(parents=True, exist_ok=True)
    path = CUSTOM_DIR / f"{scenario_id}.json"
    if path.exists():
        print(f"Scenario already exists: {path}")
        print("Edit it directly, or choose a different ID.")
        return

    template = TEMPLATE.copy()
    template["id"] = scenario_id

    with open(path, "w") as f:
        json.dump(template, f, indent=2)

    print(f"Created scenario template: {path}")
    print()
    print("Next steps:")
    print(f"  1. Edit {path} — fill in the scenario, structured context, and jurisdiction notes")
    print(f"  2. Leave reference_fingerprint as '?' for now")
    print(f"  3. Run: python labs/lab-05-build-your-own-scenario.py --predict {scenario_id}")


def predict_fingerprint(scenario_id: str):
    """Guide the student through predicting their own fingerprint."""
    path = CUSTOM_DIR / f"{scenario_id}.json"
    if not path.exists():
        print(f"Scenario not found: {path}")
        print(f"Run --init {scenario_id} first.")
        return

    with open(path) as f:
        scenario = json.load(f)

    if scenario.get("scenario", "").startswith("Write 3-5"):
        print("You haven't filled in the scenario yet!")
        print(f"Edit {path} first, then come back.")
        return

    print(f"\n{'='*70}")
    print(f"  PREDICT YOUR FINGERPRINT")
    print(f"  Scenario: {scenario_id}")
    print(f"{'='*70}")
    print()
    print(f"  {scenario['scenario'][:200]}...")
    print()

    prediction = {}
    for dim in DIMENSIONS:
        label = DIMENSION_LABELS[dim]
        prompt = PREDICTION_PROMPTS[dim]
        print(f"  {label}")
        print(f"  {prompt}")

        while True:
            level = input(f"  Your rating (A/B/C/D): ").strip().upper()
            if level in ("A", "B", "C", "D"):
                break
            print("  Please enter A, B, C, or D")

        reasoning = input(f"  One-sentence reasoning: ").strip()
        prediction[dim] = {"level": level, "reasoning": reasoning}
        print()

    # Save prediction
    pred_path = CUSTOM_DIR / f"{scenario_id}-prediction.json"
    with open(pred_path, "w") as f:
        json.dump(prediction, f, indent=2)

    # Show predicted fingerprint
    fp_string = "-".join(prediction[d]["level"] for d in DIMENSIONS)
    gating = apply_gating_rules(prediction)
    print(f"\n{'='*70}")
    print(f"  YOUR PREDICTED FINGERPRINT: {fp_string}")
    print(f"  CLASSIFICATION: {gating['classification'].replace('_', ' ').upper()}")
    if gating["triggered_rules"]:
        for rule in gating["triggered_rules"]:
            print(f"    → {rule}")
    print(f"{'='*70}")
    print(f"\n  Saved to: {pred_path}")
    print(f"\n  Now run: python labs/lab-05-build-your-own-scenario.py --run {scenario_id}")
    print(f"  IMPORTANT: Do NOT change your prediction after seeing the model's output!")


def run_scenario(scenario_id: str):
    """Run the scenario through the LLM judge."""
    if not OPENROUTER_API_KEY:
        raise SystemExit("OPENROUTER_API_KEY not set. Add it to .env.local or export it.")

    path = CUSTOM_DIR / f"{scenario_id}.json"
    if not path.exists():
        print(f"Scenario not found: {path}")
        return

    with open(path) as f:
        scenario = json.load(f)

    # Init
    results_dir = _root / "results"
    results_dir.mkdir(exist_ok=True)
    db_conn = init_db(results_dir / "ara-eval.db")
    http_client = httpx.Client(headers=OPENROUTER_HEADERS, timeout=120.0)

    run_id = str(uuid.uuid4())
    run_started = datetime.now(timezone.utc).isoformat()
    total_expected = len(PERSONALITIES)

    db_conn.execute(
        """INSERT INTO eval_runs
           (run_id, started_at, model_requested, scenario_count,
            personality_count, total_calls, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (run_id, run_started, MODEL, 1, len(PERSONALITIES), total_expected,
         json.dumps({"lab": "05-build-your-own", "scenario_id": scenario_id})),
    )
    db_conn.commit()

    print(f"\n{'='*70}")
    print(f"  LAB 05: RUNNING YOUR SCENARIO")
    print(f"  Scenario: {scenario_id}")
    print(f"  Model: {MODEL}")
    print(f"  {total_expected} personality variants")
    print(f"{'='*70}")

    all_results = {}
    run_stats = {"successful": 0, "failed": 0, "input_tokens": 0,
                 "output_tokens": 0, "cost": 0.0}

    for personality_id, personality_meta in PERSONALITIES.items():
        print(f"\n  {personality_meta['label']}...", end=" ", flush=True)
        try:
            result = evaluate_with_retry(
                http_client, db_conn, run_id, scenario, personality_id,
            )
            fp = result["gating"]["fingerprint_string"]
            print(f"{fp}")
            all_results[personality_id] = result
            run_stats["successful"] += 1
            usage = result.get("usage", {})
            run_stats["input_tokens"] += usage.get("input_tokens") or 0
            run_stats["output_tokens"] += usage.get("output_tokens") or 0
            run_stats["cost"] += result.get("cost") or 0.0
        except Exception as e:
            print(f"ERROR: {e}")
            run_stats["failed"] += 1

    # Save
    run_dir = get_run_dir(results_dir)
    model_slug = MODEL.replace("/", "_").replace(":", "_")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    output = {
        scenario_id: {"scenario": scenario, "evaluations": {}},
        "_run": {"run_id": run_id, "model": MODEL, "scenario_id": scenario_id},
    }
    for pid, result in all_results.items():
        output[scenario_id]["evaluations"][pid] = {
            "personality": PERSONALITIES[pid]["label"],
            "fingerprint": result["parsed"]["dimensions"],
            "gating": result["gating"],
        }

    output_path = run_dir / f"lab-05-{scenario_id}-{model_slug}-{timestamp}.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, default=str)

    # Also save to custom dir for easy access
    result_path = CUSTOM_DIR / f"{scenario_id}-results.json"
    with open(result_path, "w") as f:
        json.dump(output, f, indent=2, default=str)

    update_run(
        db_conn, run_id,
        finished_at=datetime.now(timezone.utc).isoformat(),
        successful_calls=run_stats["successful"],
        failed_calls=run_stats["failed"],
        total_input_tokens=run_stats["input_tokens"],
        total_output_tokens=run_stats["output_tokens"],
        total_cost_usd=run_stats["cost"],
        python_version=sys.version,
    )

    print(f"\n  Results: {output_path}")
    print(f"\n  Now run: python labs/lab-05-build-your-own-scenario.py --compare {scenario_id}")

    http_client.close()
    db_conn.close()


def compare_results(scenario_id: str):
    """Compare student prediction vs model output vs reference."""
    pred_path = CUSTOM_DIR / f"{scenario_id}-prediction.json"
    result_path = CUSTOM_DIR / f"{scenario_id}-results.json"
    scenario_path = CUSTOM_DIR / f"{scenario_id}.json"

    if not pred_path.exists():
        print(f"No prediction found. Run --predict {scenario_id} first.")
        return
    if not result_path.exists():
        print(f"No model results found. Run --run {scenario_id} first.")
        return

    with open(pred_path) as f:
        prediction = json.load(f)
    with open(result_path) as f:
        results = json.load(f)
    with open(scenario_path) as f:
        scenario = json.load(f)

    evals = results.get(scenario_id, {}).get("evaluations", {})

    # Student prediction
    pred_gating = apply_gating_rules(prediction)
    pred_fp = pred_gating["fingerprint_string"]

    # Reference (if filled in)
    ref_fp_dict = scenario.get("reference_fingerprint", {})
    has_ref = all(v != "?" for v in ref_fp_dict.values())
    ref_fp = "-".join(ref_fp_dict.get(d, "?") for d in DIMENSIONS) if has_ref else None

    print(f"\n{'='*70}")
    print(f"  LAB 05: COMPARISON — {scenario_id}")
    print(f"{'='*70}")

    # Header
    print(f"\n  {'DIMENSION':<28} {'YOU':>6}", end="")
    for pid in PERSONALITIES:
        if pid in evals:
            label = PERSONALITIES[pid]["label"][:8]
            print(f" {label:>8}", end="")
    if ref_fp:
        print(f" {'REF':>6}", end="")
    print()
    print(f"  {'-'*28} {'-'*6}" + "".join(f" {'-'*8}" for _ in evals) + (f" {'-'*6}" if ref_fp else ""))

    matches_by_personality = {pid: 0 for pid in evals}
    ref_matches = 0

    for dim in DIMENSIONS:
        label = DIMENSION_LABELS[dim]
        your_level = prediction[dim]["level"]
        print(f"  {label:<28} {your_level:>6}", end="")

        for pid in PERSONALITIES:
            if pid not in evals:
                continue
            fp = evals[pid].get("fingerprint", {})
            dim_data = fp.get(dim, {})
            model_level = dim_data.get("level", "?") if isinstance(dim_data, dict) else "?"
            marker = "=" if model_level == your_level else " "
            print(f" {marker}{model_level:>7}", end="")
            if model_level == your_level:
                matches_by_personality[pid] += 1

        if ref_fp:
            ref_level = ref_fp_dict.get(dim, "?")
            marker = "=" if ref_level == your_level else " "
            print(f" {marker}{ref_level:>5}", end="")
            if ref_level == your_level:
                ref_matches += 1

        print()

    # Summary
    print(f"\n  YOUR FINGERPRINT:    {pred_fp}")
    print(f"  YOUR CLASSIFICATION: {pred_gating['classification'].replace('_', ' ').upper()}")

    print(f"\n  AGREEMENT WITH YOUR PREDICTION:")
    for pid in PERSONALITIES:
        if pid not in evals:
            continue
        model_fp = evals[pid].get("gating", {}).get("fingerprint_string", "?")
        model_class = evals[pid].get("gating", {}).get("classification", "?")
        matches = matches_by_personality[pid]
        gate_agree = "YES" if model_class == pred_gating["classification"] else "NO"
        print(f"    {PERSONALITIES[pid]['label']:<35} {matches}/7 dims  Gate: {gate_agree}  ({model_fp})")

    if ref_fp:
        ref_gating = apply_gating_rules(ref_fp_dict)
        ref_gate_agree = "YES" if ref_gating["classification"] == pred_gating["classification"] else "NO"
        print(f"    {'Reference':<35} {ref_matches}/7 dims  Gate: {ref_gate_agree}  ({ref_fp})")

    # Discussion prompts
    print(f"\n{'='*70}")
    print(f"  REFLECTION QUESTIONS")
    print(f"{'='*70}")

    # Find biggest disagreements
    biggest_spread = 0
    biggest_dim = None
    for dim in DIMENSIONS:
        your_ord = LEVEL_ORDER[prediction[dim]["level"]]
        model_ords = []
        for pid in evals:
            fp = evals[pid].get("fingerprint", {})
            dim_data = fp.get(dim, {})
            lvl = dim_data.get("level") if isinstance(dim_data, dict) else None
            if lvl and lvl in LEVEL_ORDER:
                model_ords.append(LEVEL_ORDER[lvl])
        if model_ords:
            spread = max(abs(your_ord - o) for o in model_ords)
            if spread > biggest_spread:
                biggest_spread = spread
                biggest_dim = DIMENSION_LABELS[dim]

    if biggest_dim and biggest_spread >= 2:
        print(f"\n  1. You and the model disagree most on {biggest_dim} (spread: {biggest_spread} levels).")
        print(f"     What information did you weigh that the model might not have?")
        print(f"     What might the model be picking up that you missed?")

    gate_mismatches = [pid for pid in evals
                       if evals[pid].get("gating", {}).get("classification") != pred_gating["classification"]]
    if gate_mismatches:
        print(f"\n  2. The gating classification differs for {len(gate_mismatches)} personality variant(s).")
        print(f"     Does the model's classification change the deployment recommendation?")
        print(f"     Which perspective (yours or the model's) would you defend to a regulator?")
    else:
        print(f"\n  2. You and all model variants agree on the gating classification.")
        print(f"     Does this consensus increase your confidence, or could it be a shared blind spot?")

    print(f"\n  3. If you were writing this scenario's reference fingerprint for other students,")
    print(f"     would you change any of your original ratings? Which ones, and why?")
    print()


def show_example():
    """Show a completed scenario as a model for students."""
    # Use insurance-claims-001 as the example
    with open(_root / "scenarios" / "starter-scenarios.json") as f:
        scenarios = json.load(f)
    example = next(s for s in scenarios if s["id"] == "insurance-claims-001")

    print(f"\n{'='*70}")
    print(f"  EXAMPLE: A COMPLETED SCENARIO")
    print(f"  (insurance-claims-001 from the starter set)")
    print(f"{'='*70}")
    print()
    print(json.dumps(example, indent=2))
    print()
    print(f"{'='*70}")
    print(f"  WHAT MAKES THIS SCENARIO WORK")
    print(f"{'='*70}")
    print("""
  1. GROUNDED IN REALITY
     Based on real cross-border insurance claims in Hong Kong.
     Names a real company (AIA), real amount (HK$180,000), real
     jurisdictions (HK + Shenzhen).

  2. SPECIFIC NUMBERS
     "94% historical approval rate" — not "high confidence"
     "HK$180,000" — not "a large claim"
     These force the model to reason about magnitudes.

  3. CLEAR ALTERNATIVES
     "The agent can approve and pay autonomously" — states what
     the agent WOULD do, so the judge can assess whether it SHOULD.

  4. REGULATORY CONTEXT
     Jurisdiction notes name specific frameworks (PIPL, PDPO, IA
     requirements) — not just "regulatory concerns."

  5. STRUCTURED CONTEXT
     The structured_context fields decompose the scenario into
     the building blocks the framework evaluates: who acts, on what,
     with what authority, under what time pressure, with what data.

  YOUR SCENARIO SHOULD HAVE ALL FIVE.
  Start from a real case — a news story, a regulatory action, a process
  you've seen at work. The best scenarios come from situations where
  someone debated whether to automate.
""")


def show_research_guide():
    """Show how to use AI tools to research and refine a scenario."""
    print(f"\n{'='*70}")
    print(f"  USING AI TOOLS TO RESEARCH YOUR SCENARIO")
    print(f"{'='*70}")
    print("""
  After you've written a first draft manually, you can use an AI coding
  assistant (Claude Code, OpenAI Codex, GitHub Copilot, Cursor, etc.) to
  help research and refine it. Here's how:

  STEP 1: FIND A CASE
  Ask your AI assistant to search for real cases:

    "Search for recent regulatory enforcement actions in Hong Kong
     financial services involving AI or algorithmic decision-making.
     I need a real case I can turn into an ARA-Eval scenario."

    "Find news stories about AI systems that made autonomous decisions
     in [insurance/banking/capital markets] with negative outcomes."

  STEP 2: FILL IN REGULATORY CONTEXT
  Once you have a case, ask for the specific regulations:

    "What HKMA, SFC, PCPD, or IA regulations apply to [describe
     your scenario]? List specific circular numbers and requirements."

  STEP 3: REFINE THE STRUCTURED CONTEXT
  Ask for help decomposing the scenario:

    "Here's my scenario: [paste it]. Help me fill in the structured
     context fields — subject, object, action, regulatory triggers,
     time pressure, confidence signal, reversibility, blast radius."

  IMPORTANT: The AI can help you RESEARCH and STRUCTURE the scenario.
  But YOUR fingerprint prediction (--predict) must be YOUR judgment.
  The whole point is to discover where your assessment differs from
  the model's. If you let AI write your prediction, you learn nothing.

  EXAMPLE WORKFLOW:

    # 1. Create template
    python labs/lab-05-build-your-own-scenario.py --init my-case-001

    # 2. Write your first draft manually in the JSON file

    # 3. Use AI to research regulations and refine
    #    (in your AI coding assistant, NOT this script)

    # 4. Predict your fingerprint — this must be YOU
    python labs/lab-05-build-your-own-scenario.py --predict my-case-001

    # 5. Run and compare
    python labs/lab-05-build-your-own-scenario.py --run my-case-001
    python labs/lab-05-build-your-own-scenario.py --compare my-case-001
""")


def main():
    parser = argparse.ArgumentParser(
        description="ARA-Eval Lab 05: Build Your Own Scenario",
        epilog="Tip: run --example first to see what a good scenario looks like.",
    )
    parser.add_argument("--init", metavar="ID", help="Create a new scenario template")
    parser.add_argument("--example", action="store_true", help="Show a completed scenario as a model to follow")
    parser.add_argument("--research", action="store_true", help="Show how to use AI tools to research your scenario")
    parser.add_argument("--predict", metavar="ID", help="Record your predicted fingerprint (do this BEFORE --run)")
    parser.add_argument("--run", metavar="ID", help="Run the scenario through the LLM judge")
    parser.add_argument("--compare", metavar="ID", help="Compare your prediction vs model output")
    args = parser.parse_args()

    if args.example:
        show_example()
    elif args.research:
        show_research_guide()
    elif args.init:
        init_scenario(args.init)
    elif args.predict:
        predict_fingerprint(args.predict)
    elif args.run:
        run_scenario(args.run)
    elif args.compare:
        compare_results(args.compare)
    else:
        parser.print_help()
        print("\nWorkflow:")
        print("  1. --example        See what a good scenario looks like")
        print("  2. --init <id>      Create your scenario template")
        print("  3. (edit the JSON)  Write your scenario — start from a real case")
        print("  4. --research       Tips for using AI tools to research regulations")
        print("  5. --predict <id>   Record YOUR prediction BEFORE running the model")
        print("  6. --run <id>       Run through LLM judge (3 personality variants)")
        print("  7. --compare <id>   See where you and the model agree/disagree")


if __name__ == "__main__":
    main()
