import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatRM, formatDateTime } from "@/lib/format";
import { ImageCarousel } from "@/components/ImageCarousel";
import { toast } from "sonner";
import { ArrowLeft, Users, Gavel, Trophy, Clock } from "lucide-react";

export const Route = createFileRoute("/auction/$id")({
  component: AuctionRoom,
  validateSearch: (s: Record<string, unknown>) => ({ from: (s.from as string) || "card" }),
  beforeLoad: ({ search }) => {
    if (search.from !== "card" && typeof window !== "undefined" && !window.history.state?.__auctionEntry) {
      // soft enforcement
    }
  },
});

interface Property {
  id: string; name: string; image_url: string; images: string[] | null;
  reserve_price: number; bid_increment: number;
  current_bid: number | null; current_bidder: string | null; auction_date: string;
  round_ends_at: string | null; status: string; winner_id: string | null;
  is_paused: boolean; paused_remaining_ms: number | null;
  round_seconds: number;
}

function AuctionRoom() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [attendees, setAttendees] = useState(0);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [placing, setPlacing] = useState(false);
  const closeTriggered = useRef(false);

  // Tick every 250ms
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  // Redirect unauth users
  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Initial load
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
      if (error) return toast.error(error.message);
      setProperty(data as Property);
    })();
    refreshAttendees();
  }, [id]);

  // Realtime: properties + attendees + bids
  useEffect(() => {
    const ch = supabase
      .channel(`auction-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties", filter: `id=eq.${id}` },
        (payload) => setProperty(payload.new as Property))
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_attendees", filter: `property_id=eq.${id}` },
        () => refreshAttendees())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Join/leave attendance
  useEffect(() => {
    if (!user) return;
    (async () => {
      await supabase.from("auction_attendees").upsert({ property_id: id, user_id: user.id });
      refreshAttendees();
    })();
    const leave = async () => { await supabase.from("auction_attendees").delete().eq("property_id", id).eq("user_id", user.id); };
    window.addEventListener("beforeunload", leave);
    return () => { leave(); window.removeEventListener("beforeunload", leave); };
  }, [id, user]);

  async function refreshAttendees() {
    const { count } = await supabase
      .from("auction_attendees")
      .select("*", { count: "exact", head: true })
      .eq("property_id", id);
    setAttendees(count ?? 0);
  }

  // Resolve winner name when closed
  useEffect(() => {
    if (property?.status === "closed" && property.winner_id) {
      supabase.from("profiles").select("full_name").eq("id", property.winner_id).maybeSingle()
        .then(({ data }) => setWinnerName(data?.full_name ?? null));
    }
  }, [property?.status, property?.winner_id]);

  const phase = useMemo(() => {
    if (!property) return "loading";
    if (property.status === "closed") return "closed";
    const startMs = new Date(property.auction_date).getTime();
    if (now < startMs && property.status !== "live") return "pre";
    return "live";
  }, [property, now]);

  const startMs = property ? new Date(property.auction_date).getTime() : 0;
  const countdownMs = phase === "pre" ? Math.max(0, startMs - now) : 0;

  const roundEndsMs = property?.round_ends_at ? new Date(property.round_ends_at).getTime() : 0;
  const roundLeftMs = Math.max(0, roundEndsMs - now);
  const roundLeftSec = Math.ceil(roundLeftMs / 1000);

  // Auto-start when countdown hits 0
  useEffect(() => {
    if (phase !== "pre" || !property) return;
    if (countdownMs > 0) return;
    if (property.status === "live") return;
    // First client to notice flips it live
    (async () => {
      const secs = property.round_seconds || 30;
      const ends = new Date(Date.now() + secs * 1000).toISOString();
      await supabase
        .from("properties")
        .update({ status: "live", round_ends_at: ends })
        .eq("id", id)
        .eq("status", "upcoming");
    })();
  }, [phase, countdownMs, property, id]);

  // Auto-close when round timer reaches 0 (skip if paused)
  useEffect(() => {
    if (phase !== "live" || !property) return;
    if (property.is_paused) return;
    if (!property.round_ends_at) return;
    if (roundLeftMs > 0) return;
    if (closeTriggered.current) return;
    closeTriggered.current = true;
    (async () => {
      await supabase
        .from("properties")
        .update({ status: "closed", winner_id: property.current_bidder })
        .eq("id", id)
        .eq("status", "live");
    })();
  }, [phase, roundLeftMs, property, id]);

  async function placeBid() {
    if (!user || !property) return;
    setPlacing(true);
    const newAmount = Number(property.current_bid ?? property.reserve_price) + Number(property.bid_increment);
    const secs = property.round_seconds || 30;
    const newEnds = new Date(Date.now() + secs * 1000).toISOString();

    const { error: updErr } = await supabase
      .from("properties")
      .update({
        current_bid: newAmount,
        current_bidder: user.id,
        round_ends_at: newEnds,
        status: "live",
      })
      .eq("id", id)
      .neq("status", "closed");

    if (updErr) { setPlacing(false); return toast.error(updErr.message); }

    const { error: bidErr } = await supabase
      .from("bids")
      .insert({ property_id: id, bidder_id: user.id, amount: newAmount });
    setPlacing(false);
    if (bidErr) return toast.error(bidErr.message);
    toast.success(`Bid placed: ${formatRM(newAmount)}`);
  }

  if (!property || authLoading) {
    return <div className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading auction room…</div>;
  }

  const currentBid = Number(property.current_bid ?? property.reserve_price);
  const nextBid = currentBid + Number(property.bid_increment);
  const isHighBidder = property.current_bidder === user?.id;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
        <ArrowLeft className="h-4 w-4" /> Exit auction room
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        {/* Property image + status */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative overflow-hidden rounded-lg border border-border">
            <img src={property.image_url} alt={property.name} className="aspect-[4/3] w-full object-cover" />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              {phase === "live" && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-live px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-live-foreground">
                  <span className="h-2 w-2 rounded-full bg-live-foreground animate-pulse" /> LIVE
                </span>
              )}
              {phase === "pre" && (
                <span className="rounded-md bg-card/90 backdrop-blur px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  Waiting Room
                </span>
              )}
              {phase === "closed" && (
                <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                  Auction Closed
                </span>
              )}
            </div>
          </div>

          {/* Round timer */}
          {phase === "live" && (
            <div className="rounded-lg border-2 border-primary/20 bg-card p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {property.is_paused ? "Paused by Auctioneer" : "Round Closes In"}
              </div>
              <div className={"mt-2 font-display text-7xl font-bold tabular-nums " + (property.is_paused ? "text-muted-foreground" : roundLeftSec <= 5 ? "text-live" : "text-primary")}>
                {property.is_paused
                  ? String(Math.max(0, Math.ceil((property.paused_remaining_ms ?? 0) / 1000))).padStart(2, "0")
                  : String(Math.max(0, roundLeftSec)).padStart(2, "0")}
              </div>
              <div className="text-xs text-muted-foreground">
                {property.is_paused ? "timer is on hold" : "seconds — bid to reset to 30s"}
              </div>
            </div>
          )}
        </div>

        {/* Right column: title + state */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Now Auctioning</div>
            <h1 className="mt-2 font-display text-3xl font-bold text-primary leading-tight">{property.name}</h1>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-medium">{attendees}</span>
            <span className="text-muted-foreground">{attendees === 1 ? "bidder" : "bidders"} in the room</span>
          </div>

          {/* Phase-specific content */}
          {phase === "pre" && <PreAuction startMs={startMs} now={now} />}

          {phase === "live" && (
            <>
              <div className="rounded-lg border border-border bg-card p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Current Highest Bid</div>
                <div className="mt-1 font-display text-4xl font-bold text-primary">{formatRM(currentBid)}</div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Preset Increment</span>
                  <span className="font-semibold text-primary">+{formatRM(property.bid_increment)}</span>
                </div>
                {isHighBidder && (
                  <div className="mt-3 rounded-md bg-gold/20 px-3 py-2 text-xs font-medium text-primary text-center">
                    ★ You are the highest bidder
                  </div>
                )}
              </div>

              <button
                onClick={placeBid}
                disabled={placing || isHighBidder || property.is_paused}
                className="w-full rounded-md bg-primary px-6 py-5 font-display text-xl font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50"
              >
                <Gavel className="inline mr-2 h-5 w-5" />
                {property.is_paused ? "Paused" : placing ? "Placing…" : `Place Bid · ${formatRM(nextBid)}`}
              </button>
            </>
          )}

          {phase === "closed" && (
            <div className="rounded-lg border-2 border-primary bg-card p-6 text-center">
              <Trophy className="mx-auto h-10 w-10 text-gold" />
              <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Winning Bid</div>
              <div className="font-display text-4xl font-bold text-primary">{formatRM(currentBid)}</div>
              <div className="mt-3 text-sm text-muted-foreground">Awarded to</div>
              <div className="font-semibold text-primary">
                {property.winner_id
                  ? (property.winner_id === user?.id ? "You — congratulations!" : (winnerName ?? "Bidder"))
                  : "No bids placed"}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PreAuction({ startMs, now }: { startMs: number; now: number }) {
  const ms = Math.max(0, startMs - now);
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-card p-6">
      <div className="text-center text-xs uppercase tracking-[0.22em] text-muted-foreground">Auction Begins In</div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[["Days", d], ["Hrs", h], ["Min", m], ["Sec", s]].map(([label, val]) => (
          <div key={label as string} className="rounded-md bg-secondary px-2 py-3">
            <div className="font-display text-3xl font-bold text-primary tabular-nums">{String(val).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Starts {formatDateTime(new Date(startMs).toISOString())}
      </p>
    </div>
  );
}
