import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { z } from "zod";
import { Gavel } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  ic_number: z.string().trim().min(6).max(20).regex(/^[A-Za-z0-9-]+$/, "IC may only contain letters, numbers, and dashes"),
});

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", ic_number: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);

    // Pre-check IC uniqueness for a clean UX (database UNIQUE is the source of truth)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("ic_number", parsed.data.ic_number)
      .maybeSingle();
    if (existing) {
      setLoading(false);
      return toast.error("An account with this IC Number already exists. Only one account per IC is permitted.");
    }

    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.full_name, ic_number: parsed.data.ic_number },
      },
    });

    setLoading(false);
    if (error) {
      // Trigger surfaces unique-violation as a generic Database error
      if (/duplicate|unique|ic_number/i.test(error.message))
        return toast.error("This IC Number is already registered.");
      return toast.error(error.message);
    }

    toast.success("Account created. You're signed in.");
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
        <h1 className="text-center font-display text-3xl font-bold text-primary">Register as a bidder</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">One account per IC Number.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Identity Card (IC) Number" value={form.ic_number} onChange={(v) => setForm({ ...form, ic_number: v })} placeholder="e.g. 901231-14-5678" />
          <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <button
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
