/**
 * Scenario loading — reads from the shared scenarios/ directory.
 */

import fs from "fs";
import path from "path";
import type { Scenario } from "./constants";

const SCENARIOS_DIR = path.resolve(process.cwd(), "..", "scenarios");

export function loadScenarios(useAll: boolean = true): Scenario[] {
  const scenariosPath = path.join(SCENARIOS_DIR, "starter-scenarios.json");
  const raw = fs.readFileSync(scenariosPath, "utf-8");
  const all: Scenario[] = JSON.parse(raw);
  if (useAll) return all;
  const core = all.filter((s) => s.core);
  return core.length > 0 ? core : all;
}

/**
 * Load pre-computed reference results for instant demo mode.
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
