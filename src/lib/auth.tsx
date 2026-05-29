import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ViewMode = "admin" | "public";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  icNumber: string | null;
  fullName: string | null;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [icNumber, setIcNumber] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>("public");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pah_view_mode") as ViewMode | null;
      if (stored === "admin" || stored === "public") setViewModeState(stored);
    }
  }, []);

  function setViewMode(m: ViewMode) {
    setViewModeState(m);
    if (typeof window !== "undefined") localStorage.setItem("pah_view_mode", m);
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setIsAdmin(false);
      setIcNumber(null);
      setFullName(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));

    supabase
      .from("profiles")
      .select("ic_number, full_name")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIcNumber(data?.ic_number ?? null);
        setFullName(data?.full_name ?? null);
      });
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isAdmin,
        icNumber,
        fullName,
        viewMode,
        setViewMode,
        signOut: async () => { await supabase.auth.signOut(); setViewMode("public"); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
