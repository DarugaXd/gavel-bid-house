import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldAlert, Wifi, MousePointerClick, Scale, Monitor } from "lucide-react";
import { useSiteSettings, s } from "@/lib/site-settings";

export const Route = createFileRoute("/notice")({
  head: () => ({
    meta: [
      { title: "Important Notice & System Requirements — Property Auction House" },
      { name: "description", content: "Mandatory legal notice, technical requirements, and disclaimers governing participation in live property auctions." },
    ],
  }),
  component: NoticePage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-primary/15 bg-card shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 border-b border-primary/15 bg-secondary/60 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-bold text-primary leading-tight">{title}</h2>
      </header>
      <div className="px-6 py-5 text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function NoticePage() {
  const { data: settings } = useSiteSettings();
  const company = s(settings, "company_name", "Property Auction House");

  return (
    <main className="min-h-screen bg-background bg-grain">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Main Page
          </Link>
        </div>

        <header className="mb-8 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-secondary/80 to-card px-7 py-8 shadow-md">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
            <ShieldAlert className="h-3.5 w-3.5" /> Mandatory Reading
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold text-primary leading-tight">
            Important Notice & System Requirements
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Please read the following clauses carefully. By accessing or participating in any auction
            hosted by <span className="font-semibold text-primary">{company}</span>, you acknowledge
            and accept every provision set out below.
          </p>
        </header>

        <div className="space-y-5">
          <Section icon={Monitor} title="1. Supported Browsers & Technical Requirements">
            <p>
              To ensure real-time data synchronization during active live auctions, users must
              exclusively access this platform using official, updated versions of Google Chrome,
              Mozilla Firefox, or Microsoft Edge. Using unauthorized browsers, older software
              versions, or built-in mobile in-app browsers (such as Facebook or WhatsApp webviews)
              is strictly prohibited. Users must ensure they have a stable, secure, and strong
              internet connection prior to entering the bidding room.
            </p>
          </Section>

          <Section icon={Wifi} title="2. Network Disclaimers & Transmission Limitations">
            <p>
              <span className="font-semibold text-primary">{company}</span> accepts no liability or
              responsibility whatsoever for any network interruptions, packet loss, server latency,
              or unexpected internet disconnections experienced by the user. Bids are processed
              strictly based on receipt timing at our server database. The server clock and the
              final &ldquo;Hammer Down&rdquo; state rendered on the platform are conclusive, final,
              and legally binding. <span className="font-semibold text-primary">{company}</span>{" "}
              shall not be held liable for any damages, losses, or missed opportunities resulting
              from a user&rsquo;s local network failure or delayed electronic transmission.
            </p>
          </Section>

          <Section icon={MousePointerClick} title="3. Bid Finality & User Interface Interactions">
            <p>
              Every interaction with the &ldquo;PLACE BID&rdquo; button constitutes an
              unconditional, irrevocable financial offer under the Contracts Act 1950. The user is
              entirely responsible for their own device interface. Any bids resulting from user
              misclicks, accidental touch inputs, or device mishandling will remain valid, will be
              recorded by the system, and cannot be retracted under any circumstances. If the user
              is declared the highest bidder upon hammer down, they are legally bound to fulfill
              the purchase obligations.
            </p>
          </Section>

          <Section icon={Scale} title="4. Statutory Compliance & Agreement Acknowledgement">
            <p>
              Participation in any live bidding session or the general usage of this website
              explicitly constitutes your unconditional acceptance of, and compliance with, all
              regulations set forth in the individual property&rsquo;s Conditions of Sale (COS),
              Proclamation of Sale (POS), our Master Terms and Conditions, and the Personal Data
              Protection Act (PDPA) 2010.{" "}
              <span className="font-semibold text-primary">{company}</span>, its directors,
              officers, and employees, shall be held completely harmless and free from any
              liability, suits, damages, or financial accidents arising from your participation in
              our electronic auctions. These terms are governed strictly by the laws of Malaysia.
            </p>
          </Section>
        </div>

        <footer className="mt-10 rounded-lg border border-border bg-secondary/40 px-6 py-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {company}. All clauses above form an integral part of
          your bidder agreement.
        </footer>
      </div>
    </main>
  );
}
