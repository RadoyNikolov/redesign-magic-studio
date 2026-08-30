import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useAdmin";
import { SlateStripes } from "@/components/checklist/SlateStripes";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Camera Gear Checklist" },
      {
        name: "description",
        content:
          "Sign in to manage the shared gear catalogue names used by the camera department checklist.",
      },
      { property: "og:title", content: "Sign in — Camera Gear Checklist" },
      {
        property: "og:description",
        content: "Owner access to the camera gear catalogue name editor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/gear-editor", replace: true });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/gear-editor", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/gear-editor", replace: true });
        else setMsg("Check your inbox to confirm the account, then sign in.");
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setErr("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/gear-editor", replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[420px] px-4 pb-24">
      <header className="pt-10">
        <SlateStripes />
        <p className="slate-label mt-5">Owner access</p>
        <h1 className="mt-1 text-[clamp(1.6rem,5vw,2.25rem)] leading-[0.95] text-foreground">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only the account owner can rename gear in the catalogue. The checklist itself works
          without signing in.
        </p>
      </header>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={google}
        className="mt-3 w-full rounded-md border border-border bg-elevated px-4 py-2 text-sm text-foreground transition-colors hover:bg-card"
      >
        Continue with Google
      </button>

      {err && <p className="mt-3 text-sm text-look">{err}</p>}
      {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}

      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="underline-offset-4 hover:underline"
        >
          {mode === "signin" ? "Create an account" : "I already have an account"}
        </button>
        <Link to="/" className="underline-offset-4 hover:underline">
          ← Back to checklist
        </Link>
      </div>
    </div>
  );
}
