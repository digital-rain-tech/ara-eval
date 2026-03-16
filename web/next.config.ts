import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow importing files outside web/ (shared prompts, scenarios)
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
