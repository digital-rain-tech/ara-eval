/**
 * DB driver shim. Picks SQLite or Supabase based on whether
 * NEXT_PUBLIC_SUPABASE_URL is set. Uses dynamic imports so that
 * better-sqlite3 (native binding) is never loaded on Vercel.
 *
 * Local dev (no Supabase env) -> db-sqlite (shared with Python labs).
 * Vercel deploy (Supabase env set) -> db-supabase.
 */

const useSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

type Driver = typeof import("./db-supabase");

let _driver: Driver | null = null;

async function getDriver(): Promise<Driver> {
  if (_driver) return _driver;
  if (useSupabase) {
    _driver = await import("./db-supabase");
  } else {
    const sqlite = await import("./db-sqlite");
    _driver = sqlite as unknown as Driver;
  }
  return _driver;
}

export async function createRun(
  ...args: Parameters<Driver["createRun"]>
): ReturnType<Driver["createRun"]> {
  const d = await getDriver();
  return d.createRun(...args);
}

export async function updateRun(
  ...args: Parameters<Driver["updateRun"]>
): ReturnType<Driver["updateRun"]> {
  const d = await getDriver();
  return d.updateRun(...args);
}

export async function logRequest(
  ...args: Parameters<Driver["logRequest"]>
): ReturnType<Driver["logRequest"]> {
  const d = await getDriver();
  return d.logRequest(...args);
}

export async function listRuns(
  ...args: Parameters<Driver["listRuns"]>
): ReturnType<Driver["listRuns"]> {
  const d = await getDriver();
  return d.listRuns(...args);
}

export async function getRun(
  ...args: Parameters<Driver["getRun"]>
): ReturnType<Driver["getRun"]> {
  const d = await getDriver();
  return d.getRun(...args);
}

export async function listRequests(
  ...args: Parameters<Driver["listRequests"]>
): ReturnType<Driver["listRequests"]> {
  const d = await getDriver();
  return d.listRequests(...args);
}

export async function getRequest(
  ...args: Parameters<Driver["getRequest"]>
): ReturnType<Driver["getRequest"]> {
  const d = await getDriver();
  return d.getRequest(...args);
}

export async function getRunRequests(
  ...args: Parameters<Driver["getRunRequests"]>
): ReturnType<Driver["getRunRequests"]> {
  const d = await getDriver();
  return d.getRunRequests(...args);
}

export async function createChatSession(
  ...args: Parameters<Driver["createChatSession"]>
): ReturnType<Driver["createChatSession"]> {
  const d = await getDriver();
  return d.createChatSession(...args);
}

export async function addChatMessage(
  ...args: Parameters<Driver["addChatMessage"]>
): ReturnType<Driver["addChatMessage"]> {
  const d = await getDriver();
  return d.addChatMessage(...args);
}

export async function updateSessionContextChanges(
  ...args: Parameters<Driver["updateSessionContextChanges"]>
): ReturnType<Driver["updateSessionContextChanges"]> {
  const d = await getDriver();
  return d.updateSessionContextChanges(...args);
}

export async function listChatSessions(
  ...args: Parameters<Driver["listChatSessions"]>
): ReturnType<Driver["listChatSessions"]> {
  const d = await getDriver();
  return d.listChatSessions(...args);
}

export async function getChatSession(
  ...args: Parameters<Driver["getChatSession"]>
): ReturnType<Driver["getChatSession"]> {
  const d = await getDriver();
  return d.getChatSession(...args);
}

export async function getChatMessages(
  ...args: Parameters<Driver["getChatMessages"]>
): ReturnType<Driver["getChatMessages"]> {
  const d = await getDriver();
  return d.getChatMessages(...args);
}

export type {
  RunSummary,
  RequestRow,
  ChatSession,
  ChatMessage,
} from "./db-sqlite";
