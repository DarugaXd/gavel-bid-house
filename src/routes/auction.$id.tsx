import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatRM, formatDateTime } from "@/lib/format";
import { ImageCarousel } from "@/components/ImageCarousel";
import { EntryDisclaimerModal } from "@/components/EntryDisclaimerModal";
import { toast } from "sonner";
import { ArrowLeft, Users, Gavel, Trophy, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/auction/$id")({
  component: AuctionRoom,
  validateSearch: (s: Record<string, unknown>) => ({ from: (s.from as string) || "card" }),
});

interface Property {
  id: string; name: string; image_url: string; images: string[] | null;
  reserve_price: number; bid_increment: number;
  current_bid: number | null; current_bidder: string | null; auction_date: string;
  round_ends_at: string | null; status: string; winner_id: string | null;
  is_paused: boolean; paused_remaining_ms: number | null;
  round_seconds: number;
  whitelist_ics: string[] | null;
}

// 10s per phase × 4 phases (Active → Once → Twice → Final → Sold)
const PHASE_MS = 10_000;
const TOTAL_WINDOW_MS = PHASE_MS * 4;

function AuctionRoom() {
  const { id } = Route.useParams();
  const { user, loading: authLoading, icNumber, fullName } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Property | null>(null);
  const [attendees, setAttendees] = useState(0);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [placing, setPlacing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const closeTriggered = useRef(false);

  // Tick every 200ms for crisp phase transitions
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
      if (error) return toast.error(error.message);
      setProperty(data as Property);
    })();
    refreshAttendees();
  }, [id]);

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

  // Whitelist check
  const isWhitelisted = useMemo(() => {
    if (!property) return false;
    const list = property.whitelist_ics ?? [];
    if (list.length === 0) return true; // open auction when no whitelist set
    return !!icNumber && list.includes(icNumber);
  }, [property, icNumber]);

  // Attendance — only join after disclaimer acceptance + whitelist pass
  useEffect(() => {
    if (!user || !accepted || !isWhitelisted) return;
    (async () => {
      await supabase.from("auction_attendees").upsert({ property_id: id, user_id: user.id });
      refreshAttendees();
    })();
    const leave = async () => { await supabase.from("auction_attendees").delete().eq("property_id", id).eq("user_id", user.id); };
    window.addEventListener("beforeunload", leave);
    return () => { leave(); window.removeEventListener("beforeunload", leave); };
  }, [id, user, accepted, isWhitelisted]);

  async function refreshAttendees() {
    const { count } = await supabase
      .from("auction_attendees")
      .select("*", { count: "exact", head: true })
      .eq("property_id", id);
    setAttendees(count ?? 0);
  }

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

  const roundEndsMs = property?.round_ends_at ? new Date(property.round_ends_at).getTime() : 0;
  const roundLeftMs = Math.max(0, roundEndsMs - now);

  // Determine call phase based on remaining time within the 40s window
  const callPhase: "active" | "once" | "twice" | "final" | "sold" = useMemo(() => {
    if (phase !== "live" || !property?.round_ends_at) return "active";
    if (roundLeftMs > 3 * PHASE_MS) return "active";   // > 30s left
    if (roundLeftMs > 2 * PHASE_MS) return "once";     // 20-30s left
    if (roundLeftMs > 1 * PHASE_MS) return "twice";    // 10-20s left
    if (roundLeftMs > 0) return "final";               // 0-10s left
    return "sold";
  }, [phase, property?.round_ends_at, roundLeftMs]);

  // Auto-start when pre-auction countdown hits 0
  useEffect(() => {
    if (phase !== "pre" || !property) return;
    if (now < startMs) return;
    if (property.status === "live") return;
    (async () => {
      const ends = new Date(Date.now() + TOTAL_WINDOW_MS).toISOString();
      await supabase
        .from("properties")
        .update({ status: "live", round_ends_at: ends })
        .eq("id", id)
        .eq("status", "upcoming");
    })();
  }, [phase, now, startMs, property, id]);

  // Auto-close when the 40-second silence window expires
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
    const newEnds = new Date(Date.now() + TOTAL_WINDOW_MS).toISOString();

    const { error: updErr } = await supabase
      .from("properties")
      .update({
        current_bid: newAmount,
        current_bidder: user.id,
        round_ends_at: newEnds,
        status: "live",
        is_paused: false,
        paused_remaining_ms: null,
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

  // BLOCK: whitelist rejection
  if (!isWhitelisted) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-lg border-2 border-destructive/40 bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-bold text-primary">Access Denied</h1>
          <p className="mt-3 text-sm text-foreground/90">
            Your NRIC is not registered or authorized for this specific property auction.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Contact the auctioneer if you believe this is an error.
            {icNumber ? <> Your registered IC: <strong className="text-primary">{icNumber}</strong></> : null}
          </p>
          <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Back to directory
          </Link>
        </div>
      </main>
    );
  }

  const currentBid = Number(property.current_bid ?? property.reserve_price);
  const nextBid = currentBid + Number(property.bid_increment);
  const isHighBidder = property.current_bidder === user?.id;
  const inputsLocked = phase === "closed" || callPhase === "sold";

  const banner = bannerForPhase(phase, callPhase);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
        <ArrowLeft className="h-4 w-4" /> Exit auction room
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <ImageCarousel
              images={(property.images && property.images.length > 0 ? property.images : [property.image_url]).filter(Boolean)}
              alt={property.name}
            />
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
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

          {/* 3-Call status banner */}
          {phase === "live" && (
            <div className={"rounded-lg border-2 p-6 text-center transition-colors " + banner.boxClass}>
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Auctioneer's Call</div>
              <div className={"mt-2 font-display text-5xl font-bold " + banner.textClass}>
                {banner.label}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {callPhase === "active"
                  ? "Place a bid to keep the auction open"
                  : callPhase === "sold"
                  ? "Hammer down"
                  : "Bid now to reset the auctioneer's call"}
              </div>
            </div>
          )}
        </div>

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
                disabled={placing || isHighBidder || inputsLocked || property.is_paused}
                className="w-full rounded-md bg-primary px-6 py-5 font-display text-xl font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50"
              >
                <Gavel className="inline mr-2 h-5 w-5" />
                {inputsLocked ? "Closed" : property.is_paused ? "Paused" : placing ? "Placing…" : `Place Bid · ${formatRM(nextBid)}`}
              </button>
            </>
          )}

          {phase === "closed" && (
            <ClosedPanel
              currentBid={currentBid}
              isWinner={property.winner_id === user?.id}
              winnerLabel={property.winner_id
                ? (property.winner_id === user?.id ? (fullName ?? "You") : (winnerName ?? "Bidder"))
                : null}
            />
          )}
        </div>
      </div>

      <EntryDisclaimerModal
        open={!accepted}
        onClose={() => navigate({ to: "/" })}
        onConfirm={() => setAccepted(true)}
      />
    </main>
  );
}

function bannerForPhase(phase: string, c: "active" | "once" | "twice" | "final" | "sold") {
  if (phase !== "live") return { label: "—", boxClass: "border-border bg-card", textClass: "text-primary" };
  switch (c) {
    case "active":
      return { label: "Active Bidding — Accepting Bids", boxClass: "border-primary/30 bg-card", textClass: "text-primary" };
    case "once":
      return { label: "Calling Once…", boxClass: "border-gold/60 bg-gold/10", textClass: "text-primary" };
    case "twice":
      return { label: "Calling Twice…", boxClass: "border-gold/80 bg-gold/15", textClass: "text-primary" };
    case "final":
      return { label: "Final Call…", boxClass: "border-live bg-live/10 animate-pulse", textClass: "text-live" };
    case "sold":
      return { label: "SOLD!", boxClass: "border-live bg-live/20", textClass: "text-live" };
  }
}

function ClosedPanel({ currentBid, isWinner, winnerLabel }: { currentBid: number; isWinner: boolean; winnerLabel: string | null }) {
  return (
    <div className={"rounded-lg border-2 p-6 text-center " + (isWinner ? "border-gold bg-gold/15" : "border-primary bg-card")}>
      <Trophy className={"mx-auto h-10 w-10 " + (isWinner ? "text-gold" : "text-primary")} />
      <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
        {isWinner ? "Congratulations — You Won" : "Auction Sold"}
      </div>
      <div className="mt-1 font-display text-4xl font-bold text-primary">{formatRM(currentBid)}</div>
      <div className="mt-3 text-sm text-muted-foreground">Awarded to</div>
      <div className="font-semibold text-primary">
        {winnerLabel ?? "No bids placed"}
      </div>
    </div>
  );
}

function PreAuction({ startMs, now }: { startMs: number; now: number }) {
  const ms = Math.max(0, startMs - now);
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;

  return (
    <div className="rounded-lg border-2 border-primary/20 bg-card p-6">
      <div className="text-center text-xs uppercase tracking-[0.22em] text-muted-foreground">Auction Begins In</div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[["Days", d], ["Hrs", h], ["Min", m], ["Sec", sec]].map(([label, val]) => (
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
