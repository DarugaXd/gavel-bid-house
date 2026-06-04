import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, formatRM, formatDateTime } from "@/lib/format";
import { SETTINGS_KEYS, SETTINGS_LABELS, SETTINGS_MULTILINE } from "@/lib/site-settings";
import { uploadPropertyImage, uploadPropertyDoc, uploadSiteAsset } from "@/lib/storage";
import { normalizeIc, isValidIc } from "@/lib/ic";
import { toast } from "sonner";
import {
  Shield, Plus, Trash2, Pencil, Save, X, Play, Pause, StopCircle,
  Radio, ChevronRight, Users2, Building2, Settings as SettingsIcon,
  ImagePlus, Upload, FileText, ChevronLeft, Sliders, UserPlus, Bell,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const PROPERTY_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

type Property = {
  id: string; name: string; category: string; reserve_price: number;
  title_number: string; tenure: string; address: string; auction_location: string;
  conditions: string; auction_date: string; image_url: string; images: string[];
  status: string; bid_increment: number; current_bid: number | null;
  current_bidder: string | null; round_ends_at: string | null;
  is_paused: boolean; paused_remaining_ms: number | null; winner_id: string | null;
  round_seconds: number;
  proclamation_pdf_url: string | null;
  condition_pdf_url: string | null;
  whitelist_ics: string[];
};

type Contact = {
  id: string; position: number; name: string; title: string;
  phone: string; email: string; address: string;
};

type Tab = "properties" | "contacts" | "settings";

function AdminPage() {
  const { user, loading, isAdmin, viewMode } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("properties");
  const [biddingPropertyId, setBiddingPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && isAdmin && viewMode === "public") {
      navigate({ to: "/" });
    }
  }, [loading, user, isAdmin, viewMode, navigate]);

  if (loading) return <div className="mx-auto max-w-6xl px-6 py-20 text-muted-foreground">Loading…</div>;
  if (!user) return null;
  if (isAdmin && viewMode === "public") return null;
  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold text-primary">Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is not flagged as an administrator. Ask a current admin to grant you the <code>admin</code> role.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Back to home
        </Link>
      </main>
    );
  }

  // Dedicated bidding-configuration subpage
  if (biddingPropertyId) {
    return <BiddingConfigPage propertyId={biddingPropertyId} onBack={() => setBiddingPropertyId(null)} />;
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> Admin Console
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold text-primary">Auction control room</h1>
        </div>
      </header>

      <div className="mb-6 flex gap-2 border-b border-border overflow-x-auto">
        <TabBtn active={tab === "properties"} onClick={() => setTab("properties")} icon={<Building2 className="h-4 w-4" />}>
          Directory
        </TabBtn>
        <TabBtn active={tab === "contacts"} onClick={() => setTab("contacts")} icon={<Users2 className="h-4 w-4" />}>
          Section D Contacts
        </TabBtn>
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={<SettingsIcon className="h-4 w-4" />}>
          Site Identity & Text
        </TabBtn>
      </div>

      {tab === "properties" && <PropertiesPanel onOpenBidding={(id) => setBiddingPropertyId(id)} />}
      {tab === "contacts" && <ContactsPanel />}
      {tab === "settings" && <SettingsPanel />}
    </main>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm font-medium whitespace-nowrap " +
        (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")
      }
    >
      {icon}{children}
    </button>
  );
}

// ============ PROPERTIES ============

function PropertiesPanel({ onOpenBidding }: { onOpenBidding: (id: string) => void }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties").select("*").order("auction_date", { ascending: true });
      if (error) throw error;
      return data as Property[];
    },
    refetchInterval: 5000,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-properties"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
  }

  const q = searchQ.trim().toLowerCase();
  const filtered = properties.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (q && !(p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {properties.length} properties shown
        </p>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add property
        </button>
      </div>

      {/* Search & filter bar */}
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr,180px,180px]">
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search by name or address…"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>)}
        </select>
      </div>

      {adding && <PropertyForm onClose={() => { setAdding(false); refresh(); }} />}

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">Loading properties…</p>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No properties match your filters.</p>
          )}
          {filtered.map((p) => (
            <PropertyRow
              key={p.id} p={p}
              editing={editingId === p.id}
              onEdit={() => setEditingId(p.id)}
              onClose={() => { setEditingId(null); refresh(); }}
              onChange={refresh}
              onOpenBidding={() => onOpenBidding(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyRow({ p, editing, onEdit, onClose, onChange, onOpenBidding }: {
  p: Property; editing: boolean; onEdit: () => void; onClose: () => void; onChange: () => void; onOpenBidding: () => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: notifCount = 0 } = useQuery({
    queryKey: ["notif-count", p.id],
    queryFn: async () => {
      const { count } = await (supabase.from as any)("property_notifications")
        .select("id", { count: "exact", head: true })
        .eq("property_id", p.id);
      return count ?? 0;
    },
    refetchInterval: 15000,
  });

  if (editing) return <PropertyForm property={p} onClose={onClose} />;

  const cover = p.images && p.images.length > 0 ? p.images[0] : p.image_url;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex">
        <div className="relative h-32 w-40 shrink-0">
          <img src={cover} alt={p.name} className="h-full w-full object-cover" />
          {p.images && p.images.length > 1 && (
            <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-primary backdrop-blur">
              {p.images.length} photos
            </span>
          )}
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.category}</span>
                <StatusBadge status={p.status} paused={p.is_paused} />
                <button
                  onClick={() => setNotifOpen(true)}
                  title="View notification signups"
                  className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-secondary"
                >
                  <Bell className="h-3 w-3" /> {notifCount}
                </button>
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold text-primary line-clamp-1">{p.name}</h3>
              <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{p.address}</div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span><span className="text-muted-foreground">Reserve:</span> <strong className="text-primary">{formatRM(p.reserve_price)}</strong></span>
                <span><span className="text-muted-foreground">Increment:</span> <strong className="text-primary">{formatRM(p.bid_increment)}</strong></span>
                <span><span className="text-muted-foreground">Whitelisted ICs:</span> <strong className="text-primary">{(p.whitelist_ics ?? []).length}</strong></span>
                <span><span className="text-muted-foreground">Auction:</span> <strong className="text-primary">{formatDateTime(p.auction_date)}</strong></span>
                {p.current_bid != null && (
                  <span><span className="text-muted-foreground">Current bid:</span> <strong className="text-live">{formatRM(p.current_bid)}</strong></span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={onOpenBidding} className="inline-flex items-center gap-1.5 rounded-md bg-gold/20 border border-gold/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-gold/30">
                <Sliders className="h-3.5 w-3.5" /> Bidding Config
              </button>
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${p.name}"?`)) return;
                  const { error } = await supabase.from("properties").delete().eq("id", p.id);
                  if (error) return toast.error(error.message);
                  toast.success("Property deleted");
                  onChange();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {notifOpen && <NotificationsModal propertyId={p.id} propertyName={p.name} onClose={() => setNotifOpen(false)} />}
    </div>
  );
}

function NotificationsModal({ propertyId, propertyName, onClose }: { propertyId: string; propertyName: string; onClose: () => void }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notifs", propertyId],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("property_notifications")
        .select("email, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { email: string; created_at: string }[];
    },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Notify Me Signups</div>
            <h3 className="font-display text-base font-semibold text-primary">{propertyName}</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signups yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {rows.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate font-medium text-primary">{r.email}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, paused }: { status: string; paused: boolean }) {
  const cls = status === "live"
    ? (paused ? "bg-muted text-muted-foreground" : "bg-live text-live-foreground")
    : status === "closed" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground";
  const label = status === "live" ? (paused ? "LIVE · PAUSED" : "LIVE") : status.toUpperCase();
  return <span className={"rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider " + cls}>{label}</span>;
}

// ============ DEDICATED BIDDING CONFIG SUBPAGE ============

function BiddingConfigPage({ propertyId, onBack }: { propertyId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: p } = useQuery({
    queryKey: ["admin-property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", propertyId).single();
      if (error) throw error;
      return data as Property;
    },
    refetchInterval: 2500,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-property", propertyId] });
    qc.invalidateQueries({ queryKey: ["admin-properties"] });
  }

  if (!p) return <div className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading bidding configuration…</div>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
        <ChevronLeft className="h-4 w-4" /> Back to directory
      </button>

      <header className="mt-6 mb-8 border-b border-border pb-5">
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Live Bidding Configuration</div>
        <h1 className="mt-2 font-display text-3xl font-bold text-primary">{p.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{p.address}</p>
      </header>

      <LiveControls p={p} onChange={refresh} />
      <WhitelistEditor p={p} onChange={refresh} />
    </main>
  );
}

function LiveControls({ p, onChange }: { p: Property; onChange: () => void }) {
  const [incInput, setIncInput] = useState(String(p.bid_increment));
  const [startInput, setStartInput] = useState(() =>
    new Date(p.auction_date).toISOString().slice(0, 16)
  );
  useEffect(() => { setIncInput(String(p.bid_increment)); }, [p.bid_increment]);
  useEffect(() => { setStartInput(new Date(p.auction_date).toISOString().slice(0, 16)); }, [p.auction_date]);

  async function saveStart() {
    const iso = new Date(startInput).toISOString();
    const { error } = await supabase.from("properties").update({
      auction_date: iso, status: "upcoming",
      round_ends_at: null, is_paused: false, paused_remaining_ms: null,
      current_bid: null, current_bidder: null, winner_id: null,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pre-auction start time updated");
    onChange();
  }

  async function goLive() {
    const ends = new Date(Date.now() + 40 * 1000).toISOString();
    const { error } = await supabase.from("properties").update({
      status: "live", auction_date: new Date().toISOString(),
      round_ends_at: ends, is_paused: false, paused_remaining_ms: null, winner_id: null,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Auction is LIVE");
    onChange();
  }

  async function togglePause() {
    if (p.is_paused) {
      const ends = new Date(Date.now() + (p.paused_remaining_ms ?? 40 * 1000)).toISOString();
      const { error } = await supabase.from("properties").update({
        is_paused: false, round_ends_at: ends, paused_remaining_ms: null,
      }).eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success("Auction resumed");
    } else {
      const remaining = p.round_ends_at ? Math.max(0, new Date(p.round_ends_at).getTime() - Date.now()) : 40 * 1000;
      const { error } = await supabase.from("properties").update({
        is_paused: true, paused_remaining_ms: Math.round(remaining),
      }).eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success("Auction paused");
    }
    onChange();
  }

  async function forceClose() {
    if (!confirm("Force close this auction now?")) return;
    const { error } = await supabase.from("properties").update({
      status: "closed", winner_id: p.current_bidder, is_paused: false,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Auction closed");
    onChange();
  }

  async function saveIncrement() {
    const n = Number(incInput);
    if (!Number.isFinite(n) || n <= 0) return toast.error("Increment must be a positive number");
    const { error } = await supabase.from("properties").update({ bid_increment: n }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Increment set to ${formatRM(n)}`);
    onChange();
  }

  return (
    <section className="rounded-lg border-2 border-primary/20 bg-card p-6 mb-6">
      <h2 className="font-display text-xl font-semibold text-primary mb-1">Auction Timing & Controls</h2>
      <p className="text-xs text-muted-foreground mb-5">
        Live bidding is automated: every bid resets a 40-second silence window with phases Active → Calling Once → Calling Twice → Final Call → Sold (10s each).
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">Status:</span>
        <StatusBadge status={p.status} paused={p.is_paused} />
        {p.status !== "live" && (
          <Btn onClick={goLive} variant="primary" icon={<Radio className="h-3.5 w-3.5" />}>Activate Live Now</Btn>
        )}
        {p.status === "live" && (
          <>
            <Btn onClick={togglePause} icon={p.is_paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}>
              {p.is_paused ? "Resume" : "Pause Timer"}
            </Btn>
            <Btn onClick={forceClose} variant="danger" icon={<StopCircle className="h-3.5 w-3.5" />}>Force Close</Btn>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Pre-auction Start</span>
          <div className="mt-1 flex gap-2">
            <input
              type="datetime-local" value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button onClick={saveStart} className="rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent">
              <ChevronRight className="h-3 w-3 inline mr-1" /> Set
            </button>
          </div>
        </label>

        <label className="block">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Preset Bid Increment (RM)</span>
          <div className="mt-1 flex gap-2">
            <input
              type="number" min={1} step={1000} value={incInput}
              onChange={(e) => setIncInput(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button onClick={saveIncrement} className="rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Set
            </button>
          </div>
        </label>
      </div>
    </section>
  );
}

function WhitelistEditor({ p, onChange }: { p: Property; onChange: () => void }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-whitelist", p.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auction_whitelist")
        .select("id, ic_number, added_at")
        .eq("property_id", p.id)
        .order("added_at", { ascending: true });
      if (error) throw error;
      return data as { id: string; ic_number: string; added_at: string }[];
    },
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-whitelist", p.id] });
    onChange();
  }

  async function addIc() {
    const ic = normalizeIc(input);
    if (!isValidIc(ic)) return toast.error("Enter a valid 12-digit Malaysian IC");
    if (items.some((x) => x.ic_number === ic)) return toast.error("That IC is already on the whitelist");
    setBusy(true);
    const { error } = await supabase
      .from("auction_whitelist")
      .insert({ property_id: p.id, ic_number: ic });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("IC added to whitelist");
    setInput("");
    refresh();
  }

  async function removeIc(rowId: string) {
    setBusy(true);
    const { error } = await supabase.from("auction_whitelist").delete().eq("id", rowId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("IC removed");
    refresh();
  }

  return (
    <section className="rounded-lg border-2 border-primary/20 bg-card p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="font-display text-xl font-semibold text-primary">Approved Bidder NRIC Whitelist</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Only NRICs listed here may enter this property's live auction room. Leave empty to allow any signed-in bidder.
            Saved instantly — no separate save step.
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
          inputMode="numeric"
          placeholder="12-digit IC (no dashes)"
          maxLength={12}
          className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm tracking-wider"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIc(); } }}
          disabled={busy}
        />
        <button
          onClick={addIc}
          type="button"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> Add IC
        </button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading whitelist…</p>
        ) : items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
            No NRICs added yet — this auction is currently <strong>open to all signed-in bidders</strong>.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-secondary/30">
            {items.map((row, i) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="font-mono font-semibold text-primary tabular-nums">
                  <span className="text-muted-foreground mr-3 text-xs">#{i + 1}</span>{row.ic_number}
                </span>
                <button
                  onClick={() => removeIc(row.id)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  type="button" aria-label="Remove" disabled={busy}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Btn({ onClick, children, icon, variant }: { onClick: () => void; children: React.ReactNode; icon?: React.ReactNode; variant?: "primary" | "danger" }) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : variant === "danger"
    ? "border border-destructive/40 text-destructive hover:bg-destructive/10"
    : "border border-border bg-card hover:bg-accent";
  return (
    <button onClick={onClick} className={"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium " + cls}>
      {icon}{children}
    </button>
  );
}

// ============ PROPERTY FORM ============

type PropertyFormState = {
  name: string; category: string; reserve_price: number; title_number: string;
  tenure: string; address: string; auction_location: string; conditions: string;
  auction_date: string; status: string; bid_increment: number;
  images: string[];
  proclamation_pdf_url: string | null;
  condition_pdf_url: string | null;
};

const EMPTY: PropertyFormState = {
  name: "", category: "Terrace", reserve_price: 500000, title_number: "",
  tenure: "Freehold", address: "", auction_location: "",
  conditions: "", auction_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
  status: "upcoming", bid_increment: 10000,
  images: [],
  proclamation_pdf_url: null,
  condition_pdf_url: null,
};

function PropertyForm({ property, onClose }: { property?: Property; onClose: () => void }) {
  const isEdit = !!property;
  const [form, setForm] = useState<PropertyFormState>(() => {
    if (!property) return { ...EMPTY };
    return {
      name: property.name, category: property.category,
      reserve_price: property.reserve_price, title_number: property.title_number,
      tenure: property.tenure, address: property.address,
      auction_location: property.auction_location, conditions: property.conditions,
      auction_date: new Date(property.auction_date).toISOString().slice(0, 16),
      status: property.status, bid_increment: property.bid_increment,
      images: property.images && property.images.length > 0
        ? property.images
        : (property.image_url ? [property.image_url] : []),
      proclamation_pdf_url: property.proclamation_pdf_url,
      condition_pdf_url: property.condition_pdf_url,
    };
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  function removeImg(i: number) {
    setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) });
  }
  function moveImg(i: number, dir: -1 | 1) {
    const next = [...form.images];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    setForm({ ...form, images: next });
  }

  async function handleImgUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadPropertyImage(property?.id ?? "draft", file);
        urls.push(url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
      toast.success(`${urls.length} image${urls.length === 1 ? "" : "s"} uploaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingImg(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  }

  async function handlePdfUpload(kind: "proclamation" | "condition", file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return toast.error("Please upload a PDF file");
    }
    try {
      const url = await uploadPropertyDoc(property?.id ?? "draft", kind, file);
      setForm((f) => ({
        ...f,
        proclamation_pdf_url: kind === "proclamation" ? url : f.proclamation_pdf_url,
        condition_pdf_url: kind === "condition" ? url : f.condition_pdf_url,
      }));
      toast.success(`${kind === "proclamation" ? "Proclamation" : "Condition"} of Sale uploaded`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function save() {
    if (!form.name || !form.address) return toast.error("Name and address are required");
    if (form.images.length === 0) return toast.error("Upload at least one property photo");
    setSaving(true);
    const payload = {
      name: form.name, category: form.category as never, reserve_price: Number(form.reserve_price),
      title_number: form.title_number, tenure: form.tenure, address: form.address,
      auction_location: form.auction_location, conditions: form.conditions,
      auction_date: new Date(form.auction_date).toISOString(),
      image_url: form.images[0], images: form.images,
      status: form.status, bid_increment: Number(form.bid_increment),
      proclamation_pdf_url: form.proclamation_pdf_url,
      condition_pdf_url: form.condition_pdf_url,
    };
    const { error } = isEdit
      ? await supabase.from("properties").update(payload).eq("id", property!.id)
      : await supabase.from("properties").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Property updated" : "Property created");
    onClose();
  }

  return (
    <div className="rounded-lg border-2 border-primary/40 bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-primary">
          {isEdit ? "Edit property" : "Add new property"}
        </h3>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <In label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Sel label="Category" value={form.category} options={PROPERTY_CATEGORIES} onChange={(v) => setForm({ ...form, category: v })} />
        <In label="Reserve Price (RM)" type="number" value={String(form.reserve_price)} onChange={(v) => setForm({ ...form, reserve_price: Number(v) })} />
        <In label="Bid Increment (RM)" type="number" value={String(form.bid_increment)} onChange={(v) => setForm({ ...form, bid_increment: Number(v) })} />
        <In label="Title Number" value={form.title_number} onChange={(v) => setForm({ ...form, title_number: v })} />
        <Sel label="Tenure" value={form.tenure} options={["Freehold", "Leasehold"]} onChange={(v) => setForm({ ...form, tenure: v })} />
        <In label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="sm:col-span-2" />
        <In label="Auction Location" value={form.auction_location} onChange={(v) => setForm({ ...form, auction_location: v })} className="sm:col-span-2" />
        <In label="Pre-Auction Start (Date & Time)" type="datetime-local" value={form.auction_date} onChange={(v) => setForm({ ...form, auction_date: v })} />
        <Sel label="Status" value={form.status} options={["upcoming", "live", "closed"]} onChange={(v) => setForm({ ...form, status: v })} />
        <Ta label="Auction Conditions" value={form.conditions} onChange={(v) => setForm({ ...form, conditions: v })} className="sm:col-span-2" />
      </div>

      {/* Photo uploader */}
      <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-primary">Property Photos ({form.images.length})</h4>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">First image = cover</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {form.images.map((url, i) => (
            <div key={url + i} className="group relative overflow-hidden rounded-md border border-border bg-background">
              <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5">
                <span className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-bold text-primary backdrop-blur">
                  {i === 0 ? "COVER" : `#${i + 1}`}
                </span>
                <button onClick={() => removeImg(i)} type="button" aria-label="Remove" className="rounded bg-background/90 p-1 text-destructive opacity-0 group-hover:opacity-100 backdrop-blur">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-1.5 opacity-0 group-hover:opacity-100">
                <button onClick={() => moveImg(i, -1)} disabled={i === 0} type="button" className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur disabled:opacity-30">←</button>
                <button onClick={() => moveImg(i, 1)} disabled={i === form.images.length - 1} type="button" className="rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur disabled:opacity-30">→</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <label className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
            <ImagePlus className="h-4 w-4" /> {uploadingImg ? "Uploading…" : "Upload photos"}
            <input
              ref={imgInputRef}
              type="file" accept="image/*" multiple hidden
              onChange={(e) => handleImgUpload(e.target.files)}
              disabled={uploadingImg}
            />
          </label>
        </div>
      </div>

      {/* PDF documents */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PdfUpload
          label="Proclamation of Sale"
          url={form.proclamation_pdf_url}
          onUpload={(f) => handlePdfUpload("proclamation", f)}
          onClear={() => setForm({ ...form, proclamation_pdf_url: null })}
        />
        <PdfUpload
          label="Condition of Sale"
          url={form.condition_pdf_url}
          onUpload={(f) => handlePdfUpload("condition", f)}
          onClear={() => setForm({ ...form, condition_pdf_url: null })}
        />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </button>
      </div>
    </div>
  );
}

function PdfUpload({ label, url, onUpload, onClear }: {
  label: string; url: string | null; onUpload: (f: File | null) => void; onClear: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-4">
      <h4 className="text-sm font-semibold text-primary">{label}</h4>
      {url ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-background border border-border px-3 py-2">
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary truncate hover:underline">
            <FileText className="h-3.5 w-3.5 shrink-0" /> View uploaded PDF
          </a>
          <button onClick={onClear} type="button" className="rounded p-1 text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No file uploaded.</p>
      )}
      <label className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
        <Upload className="h-3.5 w-3.5" /> {url ? "Replace PDF" : "Upload PDF"}
        <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}

function In({ label, value, onChange, type = "text", className = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
function Ta({ label, value, onChange, className = "", rows = 3 }: { label: string; value: string; onChange: (v: string) => void; className?: string; rows?: number }) {
  return (
    <label className={"block " + className}>
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}
function Sel({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

// ============ CONTACTS ============

function ContactsPanel() {
  const qc = useQueryClient();
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["admin-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("position");
      if (error) throw error;
      return data as Contact[];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-contacts"] });
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  if (isLoading) return <p className="py-12 text-center text-muted-foreground">Loading contacts…</p>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        These two cards appear in <strong>Section D</strong> of the homepage footer.
      </p>
      {contacts.map((c) => <ContactEditor key={c.id} c={c} onSaved={refresh} />)}
    </div>
  );
}

function ContactEditor({ c, onSaved }: { c: Contact; onSaved: () => void }) {
  const [form, setForm] = useState(c);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(c); }, [c]);
  const dirty = JSON.stringify(form) !== JSON.stringify(c);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("contacts").update({
      name: form.name, title: form.title, phone: form.phone, email: form.email,
      address: form.address, updated_at: new Date().toISOString(),
    }).eq("id", c.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contact updated");
    onSaved();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-primary">Contact #{c.position}</h3>
        {dirty && (
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <In label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <In label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <In label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <In label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <In label="Office Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} className="sm:col-span-2" />
      </div>
    </div>
  );
}

// ============ SITE IDENTITY & TEXT ============

function SettingsPanel() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key,value");
      if (error) throw error;
      return data as { key: string; value: string }[];
    },
  });

  const initial: Record<string, string> = {};
  for (const k of SETTINGS_KEYS) initial[k] = "";
  for (const r of rows) initial[r.key] = r.value;

  const [form, setForm] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const m: Record<string, string> = {};
    for (const k of SETTINGS_KEYS) m[k] = "";
    for (const r of rows) m[r.key] = r.value;
    setForm(m);
  }, [rows]);

  const dirty = SETTINGS_KEYS.some((k) => (form[k] ?? "") !== (initial[k] ?? ""));

  async function saveAll() {
    setSaving(true);
    const payload = SETTINGS_KEYS.map((k) => ({
      key: k, value: form[k] ?? "", updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Site identity updated — public pages refreshed");
    qc.invalidateQueries({ queryKey: ["admin-settings"] });
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  }

  async function uploadLogo(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const url = await uploadSiteAsset(file);
      setForm((f) => ({ ...f, company_logo_url: url }));
      toast.success("Logo uploaded — remember to Save changes");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  }

  if (isLoading) return <p className="py-12 text-center text-muted-foreground">Loading settings…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-primary">Site Identity & Text Content</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Overwrite branding, headlines and promotional text. Saved changes appear instantly to public visitors.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save all changes"}
        </button>
      </div>

      {/* Identity panel */}
      <div className="rounded-lg border-2 border-primary/20 bg-card p-5">
        <h3 className="font-display text-base font-semibold text-primary mb-3">Site Identity Panel</h3>
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <div className="h-20 w-20 overflow-hidden rounded-md border border-border bg-secondary flex items-center justify-center">
              {form.company_logo_url ? (
                <img src={form.company_logo_url} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">No logo</span>
              )}
            </div>
            <label className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Upload className="h-3.5 w-3.5" /> {uploadingLogo ? "Uploading…" : "Upload logo"}
              <input type="file" accept="image/*" hidden onChange={(e) => uploadLogo(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <div className="flex-1 grid gap-3 sm:grid-cols-2">
            <In label={SETTINGS_LABELS.company_name} value={form.company_name ?? ""} onChange={(v) => setForm({ ...form, company_name: v })} />
            <In label={SETTINGS_LABELS.company_logo_url} value={form.company_logo_url ?? ""} onChange={(v) => setForm({ ...form, company_logo_url: v })} />
          </div>
        </div>
      </div>

      {/* All other text */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_KEYS.filter((k) => k !== "company_name" && k !== "company_logo_url").map((k) => {
          const multi = SETTINGS_MULTILINE[k];
          const label = SETTINGS_LABELS[k];
          const value = form[k] ?? "";
          const onChange = (v: string) => setForm({ ...form, [k]: v });
          return multi ? (
            <Ta key={k} label={label} value={value} onChange={onChange} className="sm:col-span-2" rows={4} />
          ) : (
            <In key={k} label={label} value={value} onChange={onChange} />
          );
        })}
      </div>
    </div>
  );
}
