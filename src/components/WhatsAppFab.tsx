import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function formatWa(phone: string | null): string {
  if (!phone) return "60";
  let p = phone.replace(/[\s\-\(\)\+]/g, "");
  if (p.startsWith("0")) p = "60" + p.slice(1);
  return p;
}

export function WhatsAppFab() {
  const [phone, setPhone] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("contacts").select("phone").order("position", { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => setPhone(data?.phone ?? null));
  }, []);
  const href = `https://wa.me/${formatWa(phone)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg hover:scale-105 transition-transform"
      style={{ backgroundColor: "#25D366" }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 text-white" fill="currentColor" aria-hidden="true">
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.385.694 4.605 1.89 6.477L4 29l7.708-1.86A11.94 11.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.6a9.55 9.55 0 0 1-4.866-1.33l-.348-.207-4.575 1.103 1.122-4.458-.227-.36A9.555 9.555 0 0 1 6.4 15c0-5.293 4.308-9.6 9.6-9.6 5.293 0 9.6 4.307 9.6 9.6.002 5.293-4.306 9.6-9.599 9.6zm5.49-7.181c-.301-.151-1.78-.879-2.056-.98-.276-.1-.477-.151-.678.151-.2.301-.778.98-.953 1.18-.175.202-.351.227-.652.076-.301-.15-1.272-.469-2.422-1.493-.896-.798-1.5-1.785-1.676-2.087-.176-.301-.019-.464.132-.614.135-.135.301-.351.452-.527.151-.176.2-.301.301-.502.1-.201.05-.376-.025-.527-.076-.151-.677-1.633-.928-2.236-.244-.587-.49-.508-.677-.516l-.577-.01a1.11 1.11 0 0 0-.803.376c-.276.301-1.053 1.028-1.053 2.51 0 1.481 1.078 2.91 1.228 3.111.151.201 2.124 3.243 5.144 4.55.72.31 1.281.494 1.719.633.722.23 1.379.198 1.898.12.579-.087 1.78-.726 2.032-1.428.25-.703.25-1.305.175-1.428-.075-.124-.276-.2-.577-.351z" />
      </svg>
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-md group-hover:block">
        Chat with us on WhatsApp
      </span>
    </a>
  );
}
