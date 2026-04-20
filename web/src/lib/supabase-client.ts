import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _instance: SupabaseClient | null = null;

/**
 * Browser-side Supabase client. Lazy singleton. Must only be imported from
 * client components ("use client").
 */
export function getBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "supabase-client.ts must only be imported in client components",
    );
  }
  if (!_instance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase browser client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to be set.",
      );
    }
    _instance = createSSRBrowserClient(url, key);
  }
  return _instance;
}
