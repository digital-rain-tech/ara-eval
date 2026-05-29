import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (or Vercel project settings) before starting the app.`,
    );
  }
  return v;
}

/**
 * Cookie-aware Supabase client for API routes and server components.
 * Reads/writes the auth session cookie so RLS policies (auth.uid()) work.
 */
export async function createServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createSSRClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore if middleware
            // refreshes sessions.
          }
        },
      },
    },
  );
}
