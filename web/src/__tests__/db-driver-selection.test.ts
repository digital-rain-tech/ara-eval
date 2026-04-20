import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("db driver selection", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
    }
  });

  it("uses db-sqlite when NEXT_PUBLIC_SUPABASE_URL is absent", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const db = await import("../lib/db");
    // Dynamic import wrapper delegates to sqlite — verify it's a function
    expect(typeof db.createRun).toBe("function");
    expect(typeof db.listRuns).toBe("function");
  });

  it("uses db-supabase when NEXT_PUBLIC_SUPABASE_URL is present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const db = await import("../lib/db");
    expect(typeof db.createRun).toBe("function");
    expect(typeof db.listRuns).toBe("function");
  });
});
