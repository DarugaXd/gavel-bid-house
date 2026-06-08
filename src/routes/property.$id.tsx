import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatRM, formatDateTime } from "@/lib/format";
import { ImageCarousel } from "@/components/ImageCarousel";
import { EntryDisclaimerModal } from "@/components/EntryDisclaimerModal";
import { NotifyMeButton } from "@/components/NotifyMeButton";
import { useSiteSettings, s } from "@/lib/site-settings";
import { useT } from "@/lib/i18n";
import {
  ArrowLeft, MapPin, Calendar, FileText, Building, Scale, ScrollText, Gavel, Download, Printer,
} from "lucide-react";

export const Route = createFileRoute("/property/$id")({
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const t = useT();
  const { data: settings } = useSiteSettings();
  const companyName = s(settings, "company_name", "Property Auction House");
  const logoUrl = s(settings, "company_logo_url", "");

  const { data: p, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-print"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("name,title,phone,email,address")
        .order("position", { ascending: true })
        .limit(2);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (p?.name) {
      document.title = `${p.name} — Property Auction House`;
    }
    return () => { document.title = "Property Auction House"; };
  }, [p?.name]);

  if (isLoading) return <div className="mx-auto max-w-5xl px-6 py-20 text-muted-foreground">Loading…</div>;
  if (!p) return <div className="mx-auto max-w-5xl px-6 py-20">Property not found.</div>;

  const startsIn = new Date(p.auction_date).getTime() - Date.now();
  const liveSoon = p.status === "live" || startsIn < 2 * 60 * 60 * 1000;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to="/"
        className="no-print inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Back to directory")}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-5 print-hide">
        <div className="lg:col-span-3">
          <ImageCarousel
            images={(p.images && p.images.length > 0 ? p.images : [p.image_url]).filter(Boolean)}
            alt={p.name}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{p.category}</div>
          <h1 className="mt-2 font-display text-4xl font-bold text-primary text-balance">{p.name}</h1>
          <div className="mt-4 rounded-lg border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Reserve Price")}</div>
            <div className="mt-1 font-display text-4xl font-bold text-primary">{formatRM(p.reserve_price)}</div>
            <div className="mt-3 text-xs text-muted-foreground">{t("Bid Increment")}</div>
            <div className="text-lg font-semibold">{formatRM(p.bid_increment)}</div>
          </div>

          {p.status === "upcoming" && !liveSoon && (
            <div className="mt-3">
              <NotifyMeButton propertyId={p.id} size="md" />
            </div>
          )}

          {liveSoon && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 w-full rounded-md bg-live px-6 py-3.5 font-semibold uppercase tracking-wider text-live-foreground shadow-md hover:opacity-95"
            >
              <Gavel className="inline mr-2 h-4 w-4" /> {t("Enter Live Auction Room")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 print-hide">
        <DetailRow icon={<Building className="h-4 w-4" />} label="Property Type" value={p.category} />
        <DetailRow icon={<FileText className="h-4 w-4" />} label="Title Number" value={p.title_number} />
        <DetailRow icon={<Scale className="h-4 w-4" />} label="Tenure" value={p.tenure} />
        <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location / Address" value={p.address} />
        <DetailRow icon={<Calendar className="h-4 w-4" />} label="Auction Date & Time" value={formatDateTime(p.auction_date)} />
        <DetailRow icon={<MapPin className="h-4 w-4" />} label="Auction Location" value={p.auction_location} />
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6 print-hide">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <ScrollText className="h-4 w-4" /> Auction Conditions
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{p.conditions}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 print-hide">
        <DocBtn label="Download Proclamation of Sale" url={p.proclamation_pdf_url} />
        <DocBtn label="Download Condition of Sale" url={p.condition_pdf_url} />
      </div>

      <div className="mt-3 print-hide">
        <button
          onClick={() => window.print()}
          className="group flex w-full items-center justify-between gap-3 rounded-lg border border-primary/30 bg-card px-5 py-4 text-sm font-semibold text-primary transition-colors hover:bg-accent"
        >
          <span className="inline-flex items-center gap-2">
            <Printer className="h-4 w-4" /> {t("Download Property Summary")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm group-hover:bg-emerald-700">
            <Download className="h-3 w-3" /> Print / PDF
          </span>
        </button>
      </div>

      {/* Print-only summary */}
      <div className="print-only print-summary">
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 18 }}>
          {logoUrl ? <img src={logoUrl} alt="" style={{ height: 48, width: 48 }} /> : null}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{companyName}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>Property Summary</div>
          </div>
        </div>
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>{p.name}</h1>
        <div style={{ fontSize: 12, marginBottom: 12 }}>{p.category}</div>
        <table>
          <tbody>
            <tr><th>Reserve Price</th><td>{formatRM(p.reserve_price)}</td></tr>
            <tr><th>Bid Increment</th><td>{formatRM(p.bid_increment)}</td></tr>
            <tr><th>Title Number</th><td>{p.title_number}</td></tr>
            <tr><th>Tenure</th><td>{p.tenure}</td></tr>
            <tr><th>Address</th><td>{p.address}</td></tr>
            <tr><th>Auction Date</th><td>{formatDateTime(p.auction_date)}</td></tr>
            <tr><th>Auction Location</th><td>{p.auction_location}</td></tr>
          </tbody>
        </table>
        <h3 style={{ marginTop: 18 }}>Conditions of Sale</h3>
        <p style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.conditions}</p>
        <div style={{ borderTop: "1px solid #999", marginTop: 20, paddingTop: 10, fontSize: 11 }}>
          {contacts.map((c, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <strong>{c.name}</strong> ({c.title}) — {c.phone} · {c.email} · {c.address}
            </div>
          ))}
        </div>
      </div>

      <EntryDisclaimerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => navigate({ to: "/auction/$id", params: { id: p.id }, search: { from: "card" } })}
      />
    </main>
  );
}

function DocBtn({ label, url }: { label: string; url: string | null | undefined }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-secondary/30 px-5 py-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4" /> {label}
        </span>
        <span className="rounded-md bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Not yet published
        </span>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-card px-5 py-4 text-sm font-semibold text-primary transition-colors hover:bg-accent"
    >
      <span className="inline-flex items-center gap-2">
        <FileText className="h-4 w-4" /> {label}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm group-hover:bg-emerald-700">
        <Download className="h-3 w-3" /> Download
      </span>
    </a>
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
