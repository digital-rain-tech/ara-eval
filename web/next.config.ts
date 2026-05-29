import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Standalone output is only for self-hosted Docker builds (set BUILD_STANDALONE=1).
  // On Vercel we leave it unset so Vercel uses its own serverless packaging.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
