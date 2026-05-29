"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase-client";
import { signInWithGoogle, signOut } from "@/lib/auth";

type UserState =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "authed"; email: string }
  | { kind: "none" };

export function AuthButton() {
  const [state, setState] = useState<UserState>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();

    async function refresh() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setState({ kind: "none" });
      if (user.is_anonymous) return setState({ kind: "anonymous" });
      return setState({
        kind: "authed",
        email: user.email ?? "signed in",
      });
    }

    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSignIn() {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  }

  if (state.kind === "loading") return null;

  if (state.kind === "authed") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span>{state.email}</span>
        <button
          onClick={signOut}
          className="rounded px-2 py-1 hover:bg-gray-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  // anonymous or none
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={handleSignIn}
        className="rounded bg-white px-3 py-1 font-medium text-gray-900 hover:bg-gray-200"
        title="Save your sessions across devices"
      >
        Sign in with Google
      </button>
      {error && <span className="text-red-400">{error}</span>}
    </div>
  );
}
