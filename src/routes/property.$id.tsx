import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRM, formatDateTime } from "@/lib/format";
import { ArrowLeft, MapPin, Calendar, FileText, Building, Scale, ScrollText, Gavel } from "lucide-react";

export const Route = createFileRoute("/property/$id")({
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: p, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading…</div>;
  if (!p) return <div className="mx-auto max-w-5xl px-6 py-20">Property not found.</div>;

  const startsIn = new Date(p.auction_date).getTime() - Date.now();
  const liveSoon = startsIn < 2 * 60 * 60 * 1000;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Back to directory
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <img src={p.image_url} alt={p.name} className="aspect-[4/3] w-full rounded-lg border border-border object-cover" />
        </div>
        <div className="lg:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{p.category}</div>
          <h1 className="mt-2 font-display text-4xl font-bold text-primary text-balance">{p.name}</h1>
          <div className="mt-4 rounded-lg border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reserve Price</div>
            <div className="mt-1 font-display text-4xl font-bold text-primary">{formatRM(p.reserve_price)}</div>
            <div className="mt-3 text-xs text-muted-foreground">Bid Increment</div>
            <div className="text-lg font-semibold">{formatRM(p.bid_increment)}</div>
          </div>

          {liveSoon && (
            <button
              onClick={() => navigate({ to: "/auction/$id", params: { id: p.id } })}
              className="mt-4 w-full rounded-md bg-live px-6 py-3.5 font-semibold uppercase tracking-wider text-live-foreground shadow-md hover:opacity-95"
            >
              <Gavel className="inline mr-2 h-4 w-4" /> Enter Live Auction Room
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <DetailRow icon={<Building className="h-4 w-4" />} label="Property Type" value={p.category} />
        <DetailRow icon={<FileText className="h-4 w-4" />} label="Title Number" value={p.title_number} />
        <DetailRow icon={<Scale className="h-4 w-4" />} label="Tenure" value={p.tenure} />
        <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location / Address" value={p.address} />
        <DetailRow icon={<Calendar className="h-4 w-4" />} label="Auction Date & Time" value={formatDateTime(p.auction_date)} />
        <DetailRow icon={<MapPin className="h-4 w-4" />} label="Auction Location" value={p.auction_location} />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <ScrollText className="h-4 w-4" /> Auction Conditions
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{p.conditions}</p>
      </div>
    </main>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 font-medium text-foreground">{value}</div>
    </div>
  );
}
