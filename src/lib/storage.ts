import { supabase } from "@/integrations/supabase/client";

const BUCKET = "property-assets";

function safe(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-60);
}

export async function uploadFile(folder: string, file: File): Promise<string> {
  const path = `${folder}/${Date.now()}-${safe(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPropertyImage(propertyId: string | "draft", file: File) {
  return uploadFile(`properties/${propertyId}/images`, file);
}

export async function uploadPropertyDoc(propertyId: string | "draft", kind: "proclamation" | "condition", file: File) {
  return uploadFile(`properties/${propertyId}/docs/${kind}`, file);
}

export async function uploadSiteAsset(file: File) {
  return uploadFile(`site`, file);
}
