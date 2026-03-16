/**
 * Cross-runtime contract test: TypeScript gating matches shared fixtures.
 *
 * Uses the same test cases as the Python tests in tests/test_core.py.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { applyGatingRules } from "../lib/gating";
import type { Dimension, DimensionResult } from "../lib/constants";

interface TestCase {
  name: string;
  dimensions: Record<Dimension, DimensionResult>;
  expected_classification: string;
  expected_fingerprint: string;
  expected_hard_gates: number;
  expected_soft_gates: number;
}

const fixturesPath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "tests",
  "fixtures",
  "gating-test-cases.json",
);
const cases: TestCase[] = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

describe("applyGatingRules (shared fixtures)", () => {
  for (const tc of cases) {
    it(tc.name, () => {
      const result = applyGatingRules(tc.dimensions);

      expect(result.classification).toBe(tc.expected_classification);
      expect(result.fingerprint_string).toBe(tc.expected_fingerprint);

      const hardGates = result.triggered_rules.filter((r) =>
        r.includes("HARD GATE"),
      ).length;
      const softGates = result.triggered_rules.filter((r) =>
        r.includes("SOFT GATE"),
      ).length;

      expect(hardGates).toBe(tc.expected_hard_gates);
      expect(softGates).toBe(tc.expected_soft_gates);
    });
  }
});
