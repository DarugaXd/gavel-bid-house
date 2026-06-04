import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Property Auction House" },
      { name: "description", content: "PDPA 2010 Privacy Policy for Property Auction House Sdn Bhd." },
    ],
  }),
  component: PrivacyPage,
});

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-display font-bold">
          {n}
        </span>
        <h2 className="font-display text-xl font-semibold text-primary">{title}</h2>
      </div>
      <div className="mt-4 text-sm leading-relaxed text-foreground/90 space-y-2">
        {children}
      </div>
    </section>
  );
}

function PrivacyPage() {
  const updated = new Date().toLocaleDateString("en-MY");
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
        <ArrowLeft className="h-4 w-4" /> Back to Main Page
      </Link>

      <header className="mt-6 mb-8 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> PDPA 2010
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold text-primary">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Property Auction House Sdn Bhd</p>
      </header>

      <div className="space-y-5">
        <Section n={1} title="Introduction">
          <p>
            Property Auction House Sdn Bhd collects personal data including full name, IC number,
            email, and bidding activity in accordance with the Personal Data Protection Act 2010
            (PDPA) of Malaysia.
          </p>
        </Section>

        <Section n={2} title="What We Collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>Full name</li>
            <li>New IC number (12 digits)</li>
            <li>Contact email address</li>
            <li>Bidding participation history</li>
            <li>Auction attendance records</li>
          </ul>
        </Section>

        <Section n={3} title="Why We Collect It">
          <p>
            To verify bidder identity, to administer auction participation, to maintain records of
            auction outcomes as required by law, and to contact winners and participants.
          </p>
        </Section>

        <Section n={4} title="How We Protect It">
          <p>
            Data is stored on secured servers, IC numbers are only visible to the account holder
            and authorised administrators, no data is sold or shared with third parties except as
            required by Malaysian law.
          </p>
        </Section>

        <Section n={5} title="Your Rights">
          <p>
            Under PDPA 2010, you may request access to your data, request correction of inaccurate
            data, or withdraw consent by contacting us at the details listed on this website.
          </p>
        </Section>

        <Section n={6} title="Data Retention">
          <p>
            Bidding records are retained for a minimum of 7 years as required under Malaysian
            auction and financial record-keeping regulations.
          </p>
        </Section>

        <Section n={7} title="Contact">
          <p>
            For data-related enquiries, contact us at the details listed in the Contact section of
            this website.
          </p>
        </Section>

        <Section n={8} title="Last Updated">
          <p className="font-medium text-primary">{updated}</p>
        </Section>
      </div>
    </main>
  );
}
