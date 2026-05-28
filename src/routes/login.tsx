import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Gavel } from "lucide-react";
import { icToAuthEmail, normalizeIc, isValidIc } from "@/lib/ic";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ic, setIc] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidIc(ic)) return toast.error("IC must be exactly 12 digits.");
    if (!password) return toast.error("Password is required.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: icToAuthEmail(ic),
      password,
    });
    setLoading(false);
    if (error) return toast.error("Invalid IC number or password.");
    toast.success("Welcome back!");
    navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Gavel className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-center font-display text-3xl font-bold text-primary">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Sign in with your IC to place bids.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              New Malaysia IC Number
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={ic}
              placeholder="12 digits, no dashes"
              onChange={(e) => setIc(normalizeIc(e.target.value))}
              required
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <button
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account? <Link to="/signup" className="font-medium text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </main>
  );
}
