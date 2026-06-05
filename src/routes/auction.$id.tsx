import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatRM, formatDateTime, timeAgo } from "@/lib/format";
import { ImageCarousel } from "@/components/ImageCarousel";
import { EntryDisclaimerModal } from "@/components/EntryDisclaimerModal";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { ArrowLeft, Users, Gavel, Trophy, ShieldAlert, History, CheckCircle2 } from "lucide-react";

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
  auction_ends_at: string | null;
}

const AUCTION_DURATION_MS = 30 * 60 * 1000;

interface BidRow {
  id: string;
  amount: number;
  created_at: string;
  bidder_id: string;
  bidder_name: string | null;
}

const PHASE_MS = 10_000;
const TOTAL_WINDOW_MS = PHASE_MS * 4;

function AuctionRoom() {
  const { id } = Route.useParams();
  const { user, loading: authLoading, icNumber } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [property, setProperty] = useState<Property | null>(null);
  const [attendees, setAttendees] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [placing, setPlacing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [whitelisted, setWhitelisted] = useState<boolean | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const closeTriggered = useRef(false);

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
    loadBids();
  }, [id]);

  // Whitelist check: server-side openness probe + per-user IC lookup
  useEffect(() => {
    if (!user || !icNumber) { setWhitelisted(null); return; }
    (async () => {
      const { data: openData, error: openErr } = await supabase
        .rpc("is_auction_open", { p_property_id: id });
      if (openErr) {
        console.error(openErr);
        setWhitelisted(false);
        return;
      }
      if (openData === true) {
        setWhitelisted(true);
        return;
      }
      const { data: ownRow } = await supabase
        .from("auction_whitelist")
        .select("id")
        .eq("property_id", id)
        .eq("ic_number", icNumber)
        .maybeSingle();
      setWhitelisted(!!ownRow);
    })();
  }, [id, user, icNumber]);

  useEffect(() => {
    const ch = supabase
      .channel(`auction-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties", filter: `id=eq.${id}` },
        (payload) => setProperty(payload.new as Property))
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_attendees", filter: `property_id=eq.${id}` },
        () => refreshAttendees())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `property_id=eq.${id}` },
        () => loadBids())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    if (!user || !accepted || whitelisted !== true) return;
    (async () => {
      await supabase.from("auction_attendees").upsert({ property_id: id, user_id: user.id });
      refreshAttendees();
    })();
    const leave = async () => { await supabase.from("auction_attendees").delete().eq("property_id", id).eq("user_id", user.id); };
    window.addEventListener("beforeunload", leave);
    return () => { leave(); window.removeEventListener("beforeunload", leave); };
  }, [id, user, accepted, whitelisted]);

  async function refreshAttendees() {
    const { count } = await supabase
      .from("auction_attendees")
      .select("*", { count: "exact", head: true })
      .eq("property_id", id);
    setAttendees(count ?? 0);
  }

  async function loadBids() {
    // Pull last 10 bids; join names via masked profiles_public view
    const { data, error } = await supabase
      .from("bids")
      .select("id, amount, created_at, bidder_id")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) { console.error(error); return; }
    const ids = Array.from(new Set((data ?? []).map((b) => b.bidder_id)));
    let nameMap = new Map<string, string | null>();
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles_public")
        .select("id, full_name")
        .in("id", ids);
      nameMap = new Map(
        (profs ?? [])
          .filter((p): p is { id: string; full_name: string | null } => !!p.id)
          .map((p) => [p.id, p.full_name]),
      );
    }
    setBids((data ?? []).map((b) => ({
      id: b.id, amount: Number(b.amount), created_at: b.created_at, bidder_id: b.bidder_id,
      bidder_name: nameMap.get(b.bidder_id) ?? null,
    })));
  }

  // Section 1c: winner name fetch removed — winners see only their own result.

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

  const callPhase: "active" | "once" | "twice" | "final" | "sold" = useMemo(() => {
    if (phase !== "live" || !property?.round_ends_at) return "active";
    if (roundLeftMs > 3 * PHASE_MS) return "active";
    if (roundLeftMs > 2 * PHASE_MS) return "once";
    if (roundLeftMs > 1 * PHASE_MS) return "twice";
    if (roundLeftMs > 0) return "final";
    return "sold";
  }, [phase, property?.round_ends_at, roundLeftMs]);

  // Seconds left in current 10s phase (for the ring)
  const phaseSecondsLeft = useMemo(() => {
    if (callPhase === "active" || callPhase === "sold") return 0;
    const ms = roundLeftMs % PHASE_MS;
    return Math.ceil(ms / 1000);
  }, [callPhase, roundLeftMs]);

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
    const { data, error } = await supabase.rpc("place_bid", { p_property_id: id });
    setPlacing(false);
    if (error) return toast.error(error.message);
    const res = data as { success: boolean; amount?: number; error?: string };
    if (!res?.success) return toast.error(res?.error ?? "Bid was not accepted");
    toast.success(`Bid placed: ${formatRM(res.amount ?? 0)}`);
    loadBids();
  }

  if (!property || authLoading || whitelisted === null) {
    return <div className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading auction room…</div>;
  }

  if (whitelisted === false) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="rounded-lg border-2 border-destructive/40 bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-bold text-primary">Access Denied</h1>
          <p className="mt-3 text-sm text-foreground/90">
            Your NRIC is not registered for this auction. Please contact the auctioneer
            if you believe this is an error.
          </p>
          <Link to="/" className="mt-6 inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {t("Back to Directory")}
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

          {phase === "live" && (
            <div className={"rounded-lg border-2 p-6 transition-colors " + banner.boxClass}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
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
                {(callPhase === "once" || callPhase === "twice" || callPhase === "final") && (
                  <CountdownRing seconds={phaseSecondsLeft} total={10} accent={callPhase === "final" ? "text-live" : "text-primary"} />
                )}
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
              isWinner={!!property.winner_id && property.winner_id === user?.id}
              hasWinner={!!property.winner_id}
            />
          )}

          <BidHistoryPanel bids={bids} now={now} currentUserId={user?.id ?? null} />
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

function BidHistoryPanel({ bids, now, currentUserId }: { bids: BidRow[]; now: number; currentUserId: string | null }) {
  // Assign anonymous labels by order of first appearance (chronological).
  // bids list is ordered newest-first → iterate reversed to number them in order.
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    let n = 0;
    const chrono = [...bids].reverse();
    for (const b of chrono) {
      if (map.has(b.bidder_id)) continue;
      if (currentUserId && b.bidder_id === currentUserId) {
        map.set(b.bidder_id, "You");
      } else {
        n += 1;
        map.set(b.bidder_id, `Bidder #${n}`);
      }
    }
    return map;
  }, [bids, currentUserId]);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-primary">Recent bids</h3>
        <span className="ml-auto text-xs text-muted-foreground">Last {bids.length}</span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
        {bids.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">No bids yet — be the first.</p>
        ) : (
          <ul className="divide-y divide-border">
            {bids.map((b) => {
              const label = labels.get(b.bidder_id) ?? "Bidder";
              const isYou = label === "You";
              return (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className={"truncate font-medium " + (isYou ? "text-gold" : "text-primary")}>{label}</span>
                  <span className="font-display font-semibold text-primary tabular-nums">{formatRM(b.amount)}</span>
                  <span className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">{timeAgo(b.created_at, now)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function CountdownRing({ seconds, total, accent }: { seconds: number; total: number; accent: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / total));
  const offset = c * (1 - frac);
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={r} stroke="currentColor" strokeWidth="4" fill="none" className="text-border" />
        <circle
          cx="28" cy="28" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          stroke="currentColor" className={accent}
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.2s linear" }}
        />
      </svg>
      <div className={"absolute inset-0 flex items-center justify-center font-display text-lg font-bold tabular-nums " + accent}>
        {seconds}
      </div>
    </div>
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

function ClosedPanel({ currentBid, isWinner, hasWinner }: { currentBid: number; isWinner: boolean; hasWinner: boolean }) {
  // STATE C — no bids placed
  if (!hasWinner) {
    return (
      <div className="rounded-lg border-2 border-primary/30 bg-card p-6 text-center">
        <Gavel className="mx-auto h-10 w-10 text-primary" />
        <div className="mt-3 font-display text-xl font-bold text-primary">
          Auction Concluded — No Bids Placed
        </div>
      </div>
    );
  }
  // STATE A — current user is the winner
  if (isWinner) {
    return (
      <div className="rounded-lg border-2 border-gold bg-gold/15 p-6 text-center">
        <Trophy className="mx-auto h-12 w-12 text-gold" />
        <h2 className="mt-3 font-display text-xl font-bold text-primary">
          Congratulations — You are the Successful Bidder
        </h2>
        <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Your winning bid</div>
        <div className="mt-1 font-display text-4xl font-bold text-primary">{formatRM(currentBid)}</div>
        <p className="mt-4 text-sm text-foreground/90">
          You have been identified as the successful bidder for this property. Please contact our
          auctioneer or appointed lawyer immediately to proceed with the next steps.
        </p>
        <a
          href="/#contact"
          className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          View Contact Details
        </a>
      </div>
    );
  }
  // STATE B — auction had a winner, but it's not the current user
  return (
    <div className="rounded-lg border-2 border-primary/30 bg-card p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-3 font-display text-xl font-bold text-primary">
        Thank You for Participating
      </h2>
      <p className="mt-3 text-sm text-foreground/90">
        The auction for this property has concluded. We appreciate your participation. For
        enquiries regarding this or future auctions, please contact our auctioneer or appointed
        lawyer.
      </p>
      <a
        href="/#contact"
        className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        View Contact Details
      </a>
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
