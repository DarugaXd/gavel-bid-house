import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bm";

const STRINGS: Record<string, { en: string; bm: string }> = {
  "Browse Properties": { en: "Browse Properties", bm: "Semak Hartanah" },
  "View Live Auctions": { en: "View Live Auctions", bm: "Lihat Lelongan Langsung" },
  "Property Directory": { en: "Property Directory", bm: "Direktori Hartanah" },
  "Find your next lot.": { en: "Find your next lot.", bm: "Cari lot anda." },
  "Starting Soon": { en: "Starting Soon", bm: "Akan Bermula" },
  "Upcoming live auctions.": { en: "Upcoming live auctions.", bm: "Lelongan langsung akan datang." },
  "Contact Us": { en: "Contact Us", bm: "Hubungi Kami" },
  "Speak with our auction specialists.": { en: "Speak with our auction specialists.", bm: "Bercakap dengan pakar lelongan kami." },
  "Sign up": { en: "Sign up", bm: "Daftar" },
  "Log in": { en: "Log in", bm: "Log Masuk" },
  "Sign out": { en: "Sign out", bm: "Log Keluar" },
  "Reserve Price": { en: "Reserve Price", bm: "Harga Rizab" },
  "Bid Increment": { en: "Bid Increment", bm: "Kenaikan Bida" },
  "Back to directory": { en: "Back to directory", bm: "Kembali ke Direktori" },
  "Enter Live Auction Room": { en: "Enter Live Auction Room", bm: "Masuk Bilik Lelongan Langsung" },
  "Place Bid": { en: "Place Bid", bm: "Bida Sekarang" },
  "You are the highest bidder": { en: "You are the highest bidder", bm: "Anda penawar tertinggi" },
  "Auction Begins In": { en: "Auction Begins In", bm: "Lelongan Bermula Dalam" },
  "Days": { en: "Days", bm: "Hari" },
  "Hrs": { en: "Hrs", bm: "Jam" },
  "Min": { en: "Min", bm: "Min" },
  "Sec": { en: "Sec", bm: "Saat" },
  "Thank You for Participating": { en: "Thank You for Participating", bm: "Terima Kasih Kerana Menyertai" },
  "Congratulations — You are the Successful Bidder": { en: "Congratulations — You are the Successful Bidder", bm: "Tahniah — Anda Penawar Berjaya" },
  "View Contact Details": { en: "View Contact Details", bm: "Lihat Butiran Hubungan" },
  "Bidder Eligibility Confirmation": { en: "Bidder Eligibility Confirmation", bm: "Pengesahan Kelayakan Penawar" },
  "Enter Live Auction": { en: "Enter Live Auction", bm: "Masuk Lelongan" },
  "Important Notice": { en: "Important Notice", bm: "Notis Penting" },
  "Active Lots": { en: "Active Lots", bm: "Lot Aktif" },
  "Categories": { en: "Categories", bm: "Kategori" },
  "Live Now": { en: "Live Now", bm: "Langsung Sekarang" },
  "No properties in this category yet.": { en: "No properties in this category yet.", bm: "Tiada hartanah dalam kategori ini lagi." },
  "Back to Directory": { en: "Back to Directory", bm: "Kembali ke Direktori" },
  "Download Property Summary": { en: "Download Property Summary", bm: "Muat Turun Ringkasan Hartanah" },
  "Notify Me when Live": { en: "Notify Me when Live", bm: "Maklumkan Saya" },
  "You'll be notified": { en: "You'll be notified", bm: "Anda akan diberitahu" },
  "Already registered": { en: "Already registered", bm: "Sudah didaftarkan" },
  "Privacy Policy": { en: "Privacy Policy", bm: "Dasar Privasi" },
  "Past Auctions": { en: "Past Auctions", bm: "Lelongan Lalu" },
  "No auctions scheduled in the next 7 days — check back soon.": {
    en: "No auctions scheduled in the next 7 days — check back soon.",
    bm: "Tiada lelongan dijadualkan dalam 7 hari akan datang — semak semula tidak lama lagi.",
  },
  "Live & upcoming auctions (next 7 days).": {
    en: "Live & upcoming auctions (next 7 days).",
    bm: "Lelongan langsung & akan datang (7 hari akan datang).",
  },
  "No live or imminent auctions right now — check back soon.": {
    en: "No live or imminent auctions right now — check back soon.",
    bm: "Tiada lelongan langsung atau hampir bermula sekarang — semak semula tidak lama lagi.",
  },
  "Auction is not live": { en: "Auction is not live", bm: "Lelongan tidak aktif" },
  "Auction is paused": { en: "Auction is paused", bm: "Lelongan dijeda" },
  "You are already the highest bidder": { en: "You are already the highest bidder", bm: "Anda sudah penawar tertinggi" },
  "You are not registered for this auction": { en: "You are not registered for this auction", bm: "Anda tidak berdaftar untuk lelongan ini" },
  "Please wait before placing another bid": { en: "Please wait before placing another bid", bm: "Sila tunggu sebelum membida semula" },
  "Auction time has expired": { en: "Auction time has expired", bm: "Masa lelongan telah tamat" },
  "SOLD": { en: "SOLD", bm: "DIJUAL" },
  "Calling Once": { en: "Calling Once", bm: "Sekali" },
  "Calling Twice": { en: "Calling Twice", bm: "Dua Kali" },
  "Final Call": { en: "Final Call", bm: "Panggilan Terakhir" },
  "Active Bidding — Accepting Bids": { en: "Active Bidding — Accepting Bids", bm: "Bidaan Aktif — Menerima Bida" },
  "Auction Concluded — No Bids Placed": { en: "Auction Concluded — No Bids Placed", bm: "Lelongan Tamat — Tiada Bida Diterima" },
  "Your winning bid": { en: "Your winning bid", bm: "Bida menang anda" },
  "You have been identified as the successful bidder for this property. Please contact our auctioneer or appointed lawyer immediately to proceed with the next steps.": {
    en: "You have been identified as the successful bidder for this property. Please contact our auctioneer or appointed lawyer immediately to proceed with the next steps.",
    bm: "Anda telah dikenal pasti sebagai penawar berjaya untuk hartanah ini. Sila hubungi jurulelong atau peguam kami dengan segera untuk meneruskan langkah seterusnya.",
  },
  "The auction for this property has concluded. We appreciate your participation. For enquiries regarding this or future auctions, please contact our auctioneer or appointed lawyer.": {
    en: "The auction for this property has concluded. We appreciate your participation. For enquiries regarding this or future auctions, please contact our auctioneer or appointed lawyer.",
    bm: "Lelongan untuk hartanah ini telah tamat. Kami menghargai penyertaan anda. Untuk pertanyaan mengenai lelongan ini atau akan datang, sila hubungi jurulelong atau peguam kami.",
  },
  "bidder in the room": { en: "bidder in the room", bm: "penawar dalam bilik" },
  "bidders in the room": { en: "bidders in the room", bm: "penawar dalam bilik" },
};

interface Ctx { lang: Lang; toggle: () => void; t: (k: string) => string; }
const LangContext = createContext<Ctx | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = localStorage.getItem("pah_lang");
    if (s === "en" || s === "bm") setLang(s);
  }, []);
  function toggle() {
    setLang((prev) => {
      const next: Lang = prev === "en" ? "bm" : "en";
      if (typeof window !== "undefined") localStorage.setItem("pah_lang", next);
      return next;
    });
  }
  function t(k: string) {
    const row = STRINGS[k];
    if (!row) return k;
    return row[lang];
  }
  return <LangContext.Provider value={{ lang, toggle, t }}>{children}</LangContext.Provider>;
}

export function useLanguage() {
  const c = useContext(LangContext);
  if (!c) throw new Error("useLanguage must be inside LanguageProvider");
  return c;
}
export function useT() { return useLanguage().t; }
