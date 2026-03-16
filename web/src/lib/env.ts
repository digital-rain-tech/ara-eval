/**
 * Environment loading — reads .env.local from the project root (parent of web/).
 *
 * Import this module before accessing process.env in any server-side code.
 * This is a no-op if the env vars are already set (e.g., via shell export).
 */

import { config } from "dotenv";
import path from "path";

const projectRoot = path.resolve(process.cwd(), "..");

// Load in order: .env.local takes precedence over .env
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });
