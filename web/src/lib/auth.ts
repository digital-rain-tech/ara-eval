"use client";

import { getBrowserClient } from "./supabase-client";

/**
 * Sign in with Google. If the current user is anonymous, link the Google
 * identity to the existing anon user (preserves history). If linking fails
 * because the Google account is already linked to a different Supabase user,
 * fall back to signInWithOAuth and accept orphaning the anon session.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = `${window.location.origin}/auth/callback`;

  if (user?.is_anonymous) {
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo },
    });
    if (!error) return {};

    // Collision: Google identity already linked to another user. Fall back
    // to OAuth sign-in; the existing account takes over.
    const fallback = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (fallback.error) return { error: fallback.error.message };
    return {};
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return { error: error.message };
  return {};
}

export async function signOut(): Promise<void> {
  const supabase = getBrowserClient();
  await supabase.auth.signOut();
  // Reload so middleware creates a fresh anon session on next request.
  window.location.href = "/";
}
