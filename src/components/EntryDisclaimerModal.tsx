import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function EntryDisclaimerModal({ open, onClose, onConfirm }: Props) {
  const [checked, setChecked] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg border-2 border-primary/40 bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-xl font-bold text-primary">Bidder Eligibility Confirmation</h2>
          <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">Mandatory before entering the live auction room</p>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm text-foreground/90">
          <p>
            Property Auction House operates under strict regulatory and ethical guidelines.
            Please confirm the following statement is true before continuing.
          </p>
          <label className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-4 cursor-pointer hover:border-primary/40">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--color-primary)] cursor-pointer"
            />
            <span className="text-sm leading-relaxed">
              I am 18 years or older, of sound mind, not a bankrupt, and I agree to the
              Property Auction House Terms and Conditions and PDPA Privacy Policy.
            </span>
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-4">
          <button
            onClick={() => { setChecked(false); onClose(); }}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (checked) { onConfirm(); } }}
            disabled={!checked}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enter Live Auction
          </button>
        </div>
      </div>
    </div>
  );
}
