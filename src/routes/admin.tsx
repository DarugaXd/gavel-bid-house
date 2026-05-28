import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, formatRM, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Shield, Plus, Trash2, Pencil, Save, X, Play, Pause, StopCircle,
  Radio, ChevronRight, Users2, Building2,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const PROPERTY_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

type Property = {
  id: string; name: string; category: string; reserve_price: number;
  title_number: string; tenure: string; address: string; auction_location: string;
  conditions: string; auction_date: string; image_url: string;
  status: string; bid_increment: number; current_bid: number | null;
  current_bidder: string | null; round_ends_at: string | null;
  is_paused: boolean; paused_remaining_ms: number | null; winner_id: string | null;
};

type Contact = {
  id: string; position: number; name: string; title: string;
  phone: string; email: string; address: string;
};

function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"properties" | "contacts">("properties");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading) return <div className="mx-auto max-w-6xl px-6 py-20 text-muted-foreground">Loading…</div>;
  if (!user) return null;
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

      <div className="mb-6 flex gap-2 border-b border-border">
        <TabBtn active={tab === "properties"} onClick={() => setTab("properties")} icon={<Building2 className="h-4 w-4" />}>
          Directory & Live Controls
        </TabBtn>
        <TabBtn active={tab === "contacts"} onClick={() => setTab("contacts")} icon={<Users2 className="h-4 w-4" />}>
          Section D Contacts
        </TabBtn>
      </div>

      {tab === "properties" ? <PropertiesPanel /> : <ContactsPanel />}
    </main>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm font-medium " +
        (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")
      }
    >
      {icon}{children}
    </button>
  );
}

// ============ PROPERTIES ============

function PropertiesPanel() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties").select("*").order("auction_date", { ascending: true });
      if (error) throw error;
      return data as Property[];
    },
    refetchInterval: 3000,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-properties"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{properties.length} properties in directory</p>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add property
        </button>
      </div>

      {adding && <PropertyForm onClose={() => { setAdding(false); refresh(); }} />}

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">Loading properties…</p>
      ) : (
        <div className="space-y-4">
          {properties.map((p) => (
            <PropertyRow
              key={p.id} p={p}
              editing={editingId === p.id}
              onEdit={() => setEditingId(p.id)}
              onClose={() => { setEditingId(null); refresh(); }}
              onChange={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyRow({ p, editing, onEdit, onClose, onChange }: {
  p: Property; editing: boolean; onEdit: () => void; onClose: () => void; onChange: () => void;
}) {
  if (editing) return <PropertyForm property={p} onClose={onClose} />;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex">
        <img src={p.image_url} alt={p.name} className="h-32 w-40 shrink-0 object-cover" />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.category}</span>
                <StatusBadge status={p.status} paused={p.is_paused} />
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold text-primary line-clamp-1">{p.name}</h3>
              <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{p.address}</div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span><span className="text-muted-foreground">Reserve:</span> <strong className="text-primary">{formatRM(p.reserve_price)}</strong></span>
                <span><span className="text-muted-foreground">Increment:</span> <strong className="text-primary">{formatRM(p.bid_increment)}</strong></span>
                <span><span className="text-muted-foreground">Auction:</span> <strong className="text-primary">{formatDateTime(p.auction_date)}</strong></span>
                {p.current_bid != null && (
                  <span><span className="text-muted-foreground">Current bid:</span> <strong className="text-live">{formatRM(p.current_bid)}</strong></span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete "${p.name}"? This removes all its bids context.`)) return;
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

      <LiveControls p={p} onChange={onChange} />
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

function LiveControls({ p, onChange }: { p: Property; onChange: () => void }) {
  const [incInput, setIncInput] = useState(String(p.bid_increment));
  useEffect(() => { setIncInput(String(p.bid_increment)); }, [p.bid_increment]);

  async function startingSoon() {
    const { error } = await supabase.from("properties").update({
      status: "upcoming",
      auction_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      round_ends_at: null, is_paused: false, paused_remaining_ms: null,
      current_bid: null, current_bidder: null, winner_id: null,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Moved to Starting Soon (5 min countdown)");
    onChange();
  }

  async function goLive() {
    const ends = new Date(Date.now() + 30 * 1000).toISOString();
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
      const ends = new Date(Date.now() + (p.paused_remaining_ms ?? 30000)).toISOString();
      const { error } = await supabase.from("properties").update({
        is_paused: false, round_ends_at: ends, paused_remaining_ms: null,
      }).eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success("Auction resumed");
    } else {
      const remaining = p.round_ends_at ? Math.max(0, new Date(p.round_ends_at).getTime() - Date.now()) : 30000;
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
    <div className="border-t border-border bg-secondary/40 px-4 py-3 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold uppercase tracking-wider text-muted-foreground mr-2">Live controls:</span>

      {p.status !== "live" && p.status !== "closed" && (
        <Btn onClick={startingSoon} icon={<ChevronRight className="h-3.5 w-3.5" />}>Section C (Starting Soon)</Btn>
      )}
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

      <div className="ml-auto flex items-center gap-2">
        <span className="text-muted-foreground">Increment RM</span>
        <input
          type="number" min={1} step={1000} value={incInput}
          onChange={(e) => setIncInput(e.target.value)}
          className="h-7 w-28 rounded-md border border-input bg-background px-2 text-xs"
        />
        <button onClick={saveIncrement} className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground hover:bg-primary/90">
          Set
        </button>
      </div>
    </div>
  );
}

function Btn({ onClick, children, icon, variant }: { onClick: () => void; children: React.ReactNode; icon?: React.ReactNode; variant?: "primary" | "danger" }) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground hover:bg-primary/90"
    : variant === "danger"
    ? "border border-destructive/40 text-destructive hover:bg-destructive/10"
    : "border border-border bg-card hover:bg-accent";
  return (
    <button onClick={onClick} className={"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium " + cls}>
      {icon}{children}
    </button>
  );
}

// ============ PROPERTY FORM ============

const EMPTY: Omit<Property, "id" | "current_bid" | "current_bidder" | "round_ends_at" | "is_paused" | "paused_remaining_ms" | "winner_id"> = {
  name: "", category: "Terrace", reserve_price: 500000, title_number: "",
  tenure: "Freehold", address: "", auction_location: "",
  conditions: "", auction_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
  image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200",
  status: "upcoming", bid_increment: 10000,
};

function PropertyForm({ property, onClose }: { property?: Property; onClose: () => void }) {
  const isEdit = !!property;
  const [form, setForm] = useState(() => {
    if (!property) return { ...EMPTY };
    return {
      ...EMPTY,
      ...property,
      auction_date: new Date(property.auction_date).toISOString().slice(0, 16),
    };
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name || !form.address) return toast.error("Name and address are required");
    setSaving(true);
    const payload = {
      name: form.name, category: form.category as never, reserve_price: Number(form.reserve_price),
      title_number: form.title_number, tenure: form.tenure, address: form.address,
      auction_location: form.auction_location, conditions: form.conditions,
      auction_date: new Date(form.auction_date).toISOString(),
      image_url: form.image_url, status: form.status, bid_increment: Number(form.bid_increment),
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
        <In label="Auction Date & Time" type="datetime-local" value={form.auction_date} onChange={(v) => setForm({ ...form, auction_date: v })} />
        <Sel label="Status" value={form.status} options={["upcoming", "live", "closed"]} onChange={(v) => setForm({ ...form, status: v })} />
        <In label="Image URL" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} className="sm:col-span-2" />
        <Ta label="Auction Conditions" value={form.conditions} onChange={(v) => setForm({ ...form, conditions: v })} className="sm:col-span-2" />
      </div>
      {form.image_url && (
        <div className="mt-3"><img src={form.image_url} alt="" className="h-28 w-44 rounded-md object-cover border border-border" /></div>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </button>
      </div>
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
function Ta({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={"block " + className}>
      <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea
        value={value} onChange={(e) => onChange(e.target.value)} rows={3}
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
