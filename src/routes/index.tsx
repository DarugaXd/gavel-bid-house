import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type Category, formatRM, formatDateTime } from "@/lib/format";
import { useSiteSettings, s } from "@/lib/site-settings";
import { Gavel, MapPin, Calendar, Mail, Phone, Building2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Property Auction House — Premier Real Estate Auctions in Malaysia" },
      { name: "description", content: "Browse upcoming and live property auctions across Malaysia. Terrace, condos, bungalows, shop-lots, land and more." },
    ],
  }),
  component: HomePage,
});

interface Property {
  id: string;
  name: string;
  category: string;
  reserve_price: number;
  image_url: string;
  images: string[] | null;
  auction_date: string;
  address: string;
  status: string;
}

function HomePage() {
  const [category, setCategory] = useState<Category>("All");
  const { data: settings } = useSiteSettings();

  const { data: properties = [] } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,category,reserve_price,image_url,images,auction_date,address,status")
        .order("auction_date", { ascending: true });
      if (error) throw error;
      return data as Property[];
    },
  });

  const filtered = category === "All"
    ? properties
    : properties.filter((p) => p.category === category);

  const now = Date.now();
  const liveSoon = properties.filter((p) => {
    const t = new Date(p.auction_date).getTime();
    return t - now < 2 * 60 * 60 * 1000;
  });

  return (
    <main className="min-h-screen">
      {/* Section A: Hero */}
      <section className="relative overflow-hidden border-b border-border bg-grain">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/40 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Gavel className="h-3.5 w-3.5" /> {s(settings, "hero_eyebrow", "Live Property Auctions")}
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] text-primary sm:text-6xl md:text-7xl text-balance">
              {s(settings, "hero_title", "Where prestigious properties meet decisive bidders.")}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground whitespace-pre-line">
              {s(settings, "hero_description", "")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#directory" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                {s(settings, "hero_cta_primary", "Browse Properties")}
              </a>
              <a href="#live" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 font-medium hover:bg-accent">
                {s(settings, "hero_cta_secondary", "View Live Auctions")}
              </a>
            </div>
            <dl className="mt-12 grid grid-cols-3 gap-8 border-t border-border pt-8 max-w-xl">
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Active Lots</dt><dd className="mt-1 font-display text-3xl font-bold text-primary">{properties.length}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Categories</dt><dd className="mt-1 font-display text-3xl font-bold text-primary">7</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">Live Now</dt><dd className="mt-1 font-display text-3xl font-bold text-primary">{liveSoon.length}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* Section B: Directory */}
      <section id="directory" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{s(settings, "directory_eyebrow", "Property Directory")}</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-primary">{s(settings, "directory_title", "Find your next lot.")}</h2>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={
                "rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors " +
                (category === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground")
              }
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {filtered.map((p) => <PropertyCard key={p.id} p={p} />)}
          {filtered.length === 0 && (
            <p className="col-span-full py-16 text-center text-muted-foreground">No properties in this category yet.</p>
          )}
        </div>
      </section>

      {/* Section C: Upcoming Live */}
      <section id="live" className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{s(settings, "live_eyebrow", "Starting Soon")}</p>
            <h2 className="mt-2 font-display text-4xl font-bold text-primary">{s(settings, "live_title", "Upcoming live auctions.")}</h2>
            <p className="mt-2 text-muted-foreground whitespace-pre-line">{s(settings, "live_subtitle", "")}</p>
          </div>

          {liveSoon.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">No live or imminent auctions right now — check back soon.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {liveSoon.map((p) => <PropertyCard key={p.id} p={p} live />)}
            </div>
          )}
        </div>
      </section>

      {/* Section D: Contact */}
      <ContactSection />
    </main>
  );
}

function ContactSection() {
  const { data: settings } = useSiteSettings();
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id,position,name,title,phone,email,address")
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">{s(settings, "contact_eyebrow", "Contact Us")}</p>
        <h2 className="mt-2 font-display text-4xl font-bold">{s(settings, "contact_title", "Speak with our auction specialists.")}</h2>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {contacts.map((c) => (
            <ContactCard key={c.id} name={c.name} title={c.title} phone={c.phone} email={c.email} address={c.address} />
          ))}
        </div>

        <div className="mt-16 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/60 flex flex-wrap justify-between gap-4">
          <span>© {new Date().getFullYear()} {s(settings, "footer_copyright", "Property Auction House Sdn Bhd. All rights reserved.")}</span>
          <span>{s(settings, "footer_tagline", "Licensed Auctioneers · Kuala Lumpur")}</span>
        </div>
      </div>
    </footer>
  );
}

function PropertyCard({ p, live = false }: { p: Property; live?: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!live) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [live]);
  const startsIn = new Date(p.auction_date).getTime() - now;
  const started = startsIn <= 0;
  const cover = (p.images && p.images.length > 0 ? p.images[0] : p.image_url);

  return (
    <div className="relative">
      <Link
        to={live ? "/auction/$id" : "/property/$id"}
        params={{ id: p.id }}
        className="group flex overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg"
      >
        <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{p.category}</div>
            <h3 className="mt-2 font-display text-xl font-semibold text-primary line-clamp-2 group-hover:underline decoration-primary/30">{p.name}</h3>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
              <MapPin className="h-3 w-3 shrink-0" /> {p.address}
            </p>
          </div>
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reserve Price</div>
            <div className="font-display text-2xl font-bold text-primary">{formatRM(p.reserve_price)}</div>
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {formatDateTime(p.auction_date)}
            </div>
          </div>
        </div>
        <div className="relative w-2/5 max-w-[240px] shrink-0 overflow-hidden bg-muted">
          <img
            src={cover}
            alt={p.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <CardStatusPill status={p.status} />
          {p.images && p.images.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-primary backdrop-blur">
              +{p.images.length - 1}
            </span>
          )}
        </div>
      </Link>
      {live && (
        <div className="absolute -bottom-3 left-6 z-10 flex items-center gap-1.5 rounded-md bg-live px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-live-foreground shadow-lg">
          <span className="inline-block h-2 w-2 rounded-full bg-live-foreground animate-pulse" />
          {started ? "LIVE NOW" : "STARTING SOON"}
        </div>
      )}
    </div>
  );
}

function CardStatusPill({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-md bg-live px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-live-foreground shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-live-foreground animate-pulse" /> Live
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="absolute top-2 left-2 rounded-md bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
        Closed
      </span>
    );
  }
  return (
    <span className="absolute top-2 left-2 rounded-md bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm backdrop-blur">
      Upcoming
    </span>
  );
}

function ContactCard({ name, title, phone, email, address }: {
  name: string; title: string; phone: string; email: string; address: string;
}) {
  return (
    <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-8 backdrop-blur">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary-foreground/10">
          <Building2 className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h3 className="font-display text-2xl font-semibold">{name}</h3>
          <p className="text-sm text-primary-foreground/70">{title}</p>
        </div>
      </div>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <Phone className="mt-0.5 h-4 w-4 text-gold shrink-0" />
          <span>{phone}</span>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-4 w-4 text-gold shrink-0" />
          <a href={`mailto:${email}`} className="hover:underline">{email}</a>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 text-gold shrink-0" />
          <span className="text-primary-foreground/80">{address}</span>
        </div>
      </dl>
    </div>
  );
}
