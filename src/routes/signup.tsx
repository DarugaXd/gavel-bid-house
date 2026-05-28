import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { z } from "zod";
import { Gavel } from "lucide-react";
import { icToAuthEmail, normalizeIc, isValidIc } from "@/lib/ic";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  ic_number: z.string().regex(/^[0-9]{12}$/, "IC must be exactly 12 digits"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match", path: ["confirm"],
});

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", ic_number: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setLoading(true);

    const { data: existing } = await supabase
      .from("profiles").select("id").eq("ic_number", parsed.data.ic_number).maybeSingle();
    if (existing) {
      setLoading(false);
      return toast.error("An account with this IC Number already exists.");
    }

    const { error } = await supabase.auth.signUp({
      email: icToAuthEmail(parsed.data.ic_number),
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: parsed.data.full_name,
          ic_number: parsed.data.ic_number,
          contact_email: parsed.data.email,
        },
      },
    });

    setLoading(false);
    if (error) {
      if (/duplicate|unique|already/i.test(error.message))
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
        <p className="mt-2 text-center text-sm text-muted-foreground">One account per Malaysian IC.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Full Name as in NRIC" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field
            label="New Malaysia IC Number"
            value={form.ic_number}
            placeholder="12 digits, no dashes"
            inputMode="numeric"
            maxLength={12}
            onChange={(v) => setForm({ ...form, ic_number: normalizeIc(v) })}
            hint={form.ic_number.length > 0 && !isValidIc(form.ic_number) ? `${form.ic_number.length}/12 digits` : undefined}
          />
          <Field label="Email Address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
          <Field label="Confirm Password" type="password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })}
            hint={form.confirm.length > 0 && form.password !== form.confirm ? "Passwords do not match" : undefined} />
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

function Field({ label, type = "text", value, onChange, placeholder, hint, inputMode, maxLength }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; inputMode?: "numeric" | "text"; maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {hint && <span className="mt-1 block text-xs text-destructive">{hint}</span>}
    </label>
  );
}
