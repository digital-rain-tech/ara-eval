import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPersonalities } from "@/lib/prompts";
import { evaluateScenario, getCurrentModel } from "@/lib/openrouter";
import { createRun, updateRun, logRequest } from "@/lib/db";
import { validateModel, validateJurisdiction, validateRubric } from "@/lib/validate";
import type { Scenario, EvaluationResult } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    scenario,
    jurisdiction = "hk",
    rubric = "rubric.md",
    structured = false,
    model: modelOverride,
  } = body as {
    scenario: Scenario;
    jurisdiction?: string;
    rubric?: string;
    structured?: boolean;
    model?: string;
  };

  if (!scenario || !scenario.scenario) {
    return NextResponse.json(
      { error: "Missing scenario data" },
      { status: 400 },
    );
  }

  // Validate parameters
  const model = modelOverride || getCurrentModel();
  for (const [err] of [
    [validateModel(model)],
    [validateJurisdiction(jurisdiction)],
    [validateRubric(rubric)],
  ]) {
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  // Ensure scenario has an id
  if (!scenario.id) {
    scenario.id = `custom-${Date.now()}`;
  }
  const personalities = getPersonalities();
  const personalityIds = Object.keys(personalities);
  const totalCalls = personalityIds.length;

  // Create run
  const runId = await createRun(model, 1, personalityIds.length, totalCalls, {
    lab: "web-evaluate",
    scenario_id: scenario.id,
    jurisdiction,
    rubric,
    structured,
  });

  const results: Record<
    string,
    {
      personality: string;
      result: EvaluationResult | null;
      error: string | null;
    }
  > = {};

  let successCount = 0;
  let failCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let totalDurationMs = 0;

  // Evaluate each personality sequentially (to respect rate limits)
  for (const pid of personalityIds) {
    const requestId = randomUUID();
    try {
      const result = await evaluateScenario(
        scenario,
        pid,
        jurisdiction,
        rubric,
        structured,
        model,
      );

      await logRequest({
        runId,
        requestId,
        scenarioId: scenario.id,
        personality: pid,
        model,
        responseStatus: 200,
        errorMessage: null,
        result,
        rawRequest: { scenario: scenario.id, personality: pid, jurisdiction },
        rawResponse: null,
        jurisdiction,
        rubric,
      });

      results[pid] = {
        personality: personalities[pid].label,
        result,
        error: null,
      };

      successCount++;
      totalInputTokens += result.usage.input_tokens ?? 0;
      totalOutputTokens += result.usage.output_tokens ?? 0;
      totalCost += result.cost ?? 0;
      totalDurationMs += result.response_time_ms;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);

      await logRequest({
        runId,
        requestId,
        scenarioId: scenario.id,
        personality: pid,
        model,
        responseStatus: null,
        errorMessage: errorMsg,
        result: null,
        rawRequest: { scenario: scenario.id, personality: pid, jurisdiction },
        rawResponse: null,
        jurisdiction,
        rubric,
      });

      results[pid] = {
        personality: personalities[pid].label,
        result: null,
        error: errorMsg,
      };
      failCount++;
    }
  }

  // Update run
  await updateRun(runId, {
    finished_at: new Date().toISOString(),
    successful_calls: successCount,
    failed_calls: failCount,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    total_cost_usd: totalCost,
    total_duration_ms: totalDurationMs,
  });

  return NextResponse.json({
    run_id: runId,
    model,
    scenario_id: scenario.id,
    jurisdiction,
    structured,
    results,
  });
}
