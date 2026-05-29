import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const SETTINGS_KEYS = [
  "hero_eyebrow",
  "hero_title",
  "hero_description",
  "hero_cta_primary",
  "hero_cta_secondary",
  "directory_eyebrow",
  "directory_title",
  "live_eyebrow",
  "live_title",
  "live_subtitle",
  "contact_eyebrow",
  "contact_title",
  "footer_tagline",
  "footer_copyright",
] as const;

export type SettingKey = (typeof SETTINGS_KEYS)[number];

export const SETTINGS_LABELS: Record<SettingKey, string> = {
  hero_eyebrow: "Hero Eyebrow",
  hero_title: "Main Landing Page Title",
  hero_description: "Company Welcoming Description",
  hero_cta_primary: "Hero Primary Button",
  hero_cta_secondary: "Hero Secondary Button",
  directory_eyebrow: "Directory — Eyebrow",
  directory_title: "Directory — Heading",
  live_eyebrow: "Live Section — Eyebrow",
  live_title: "Live Section — Heading",
  live_subtitle: "Live Section — Subtitle",
  contact_eyebrow: "Contact Section — Eyebrow",
  contact_title: "Contact Section — Heading",
  footer_tagline: "Footer Tagline",
  footer_copyright: "Footer Copyright Line",
};

export const SETTINGS_MULTILINE: Partial<Record<SettingKey, boolean>> = {
  hero_description: true,
  live_subtitle: true,
};

export type SettingsMap = Record<string, string>;

export function useSiteSettings() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SettingsMap> => {
      const { data, error } = await supabase.from("site_settings").select("key,value");
      if (error) throw error;
      const map: SettingsMap = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
  });

  // Realtime: live update on save
  useEffect(() => {
    const ch = supabase
      .channel("site-settings-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => qc.invalidateQueries({ queryKey: ["site-settings"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  // Realtime: live update on save
  useEffect(() => {
    const ch = supabase
      .channel(`site-settings-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => qc.invalidateQueries({ queryKey: ["site-settings"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
