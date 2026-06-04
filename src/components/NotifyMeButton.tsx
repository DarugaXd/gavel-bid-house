import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Bell, Check } from "lucide-react";

export function NotifyMeButton({ propertyId, size = "sm" }: { propertyId: string; size?: "sm" | "md" }) {
  const { user } = useAuth();
  const t = useT();
  const [email, setEmail] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "dup">("idle");

  async function submit(addr: string) {
    if (!addr || !/^\S+@\S+\.\S+$/.test(addr)) return;
    setStatus("loading");
    const { error } = await (supabase.from as any)("property_notifications").insert({
      property_id: propertyId,
      user_id: user?.id ?? null,
      email: addr,
    });
    if (error) {
      if (/duplicate|unique/i.test(error.message)) setStatus("dup");
      else setStatus("idle");
      return;
    }
    setStatus("done");
  }

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      const { data } = await supabase.from("profiles").select("email").eq("id", user.id).maybeSingle();
      const addr = (data?.email as string) || user.email || "";
      if (addr) return submit(addr);
      setShowInput(true);
    } else {
      setShowInput(true);
    }
  }

  const base = size === "md"
    ? "px-4 py-2.5 text-sm"
    : "px-3 py-1.5 text-xs";

  if (status === "done") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md bg-emerald-600/15 border border-emerald-600/40 ${base} font-medium text-emerald-700 dark:text-emerald-400`}>
        <Check className="h-3.5 w-3.5" /> ✓ {t("You'll be notified")}
      </span>
    );
  }
  if (status === "dup") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-md bg-muted ${base} font-medium text-muted-foreground`}>
        {t("Already registered")}
      </span>
    );
  }
  if (showInput) {
    return (
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); submit(email); }}
        className="flex items-center gap-2"
      >
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={`flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={`rounded-md bg-primary ${base} font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50`}
        >
          {status === "loading" ? "…" : "OK"}
        </button>
      </form>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-secondary/50 ${base} font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors`}
    >
      <Bell className="h-3.5 w-3.5" /> {t("Notify Me when Live")}
    </button>
  );
}
