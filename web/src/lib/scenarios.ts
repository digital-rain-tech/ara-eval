/**
 * Scenario loading — reads from the bundled shared-data module (generated at
 * build time from the repo-root scenarios/ directory) so it works on Vercel
 * serverless as well as locally. See scripts/generate-shared-data.mjs.
 */

import fs from "fs";
import path from "path";
import type { Scenario } from "./constants";
import { SCENARIO_SETS } from "../generated/shared-data";

export const DEFAULT_SCENARIOS_FILE = "starter-scenarios.json";

/** Filenames of the available scenario sets (e.g. starter / singapore / rwa). */
export function listScenarioSets(): string[] {
  return Object.keys(SCENARIO_SETS);
}

export function loadScenarios(
  useAll: boolean = true,
  scenariosFile: string = DEFAULT_SCENARIOS_FILE,
): Scenario[] {
  const all = (SCENARIO_SETS[scenariosFile] ?? []) as Scenario[];
  if (useAll) return all;
  const core = all.filter((s) => s.core);
  return core.length > 0 ? core : all;
}

/**
 * Load pre-computed reference results for instant demo mode.
 *
 * Still reads from the local results/reference/ tree (large, not bundled). On
 * Vercel that directory is absent, so this returns null and demo mode is simply
 * unavailable — the live red-team flow does not need it.
 */
export function loadReferenceResults(): Record<string, unknown> | null {
  const refDir = path.resolve(process.cwd(), "..", "results", "reference");
  if (!fs.existsSync(refDir)) return null;

  const results: Record<string, unknown> = {};
  const subdirs = fs.readdirSync(refDir);

  for (const subdir of subdirs) {
    const fullPath = path.join(refDir, subdir);
    if (!fs.statSync(fullPath).isDirectory()) continue;

    const files = fs.readdirSync(fullPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const content = JSON.parse(
        fs.readFileSync(path.join(fullPath, file), "utf-8"),
      );
      const key = `${subdir}/${file}`;
      results[key] = content;
    }
  }

  return Object.keys(results).length > 0 ? results : null;
}
