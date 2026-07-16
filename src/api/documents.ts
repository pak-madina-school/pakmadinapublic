import { supabase } from "../lib/supabaseClient";

const BUCKET = "documents";

export const documentsApi = {
  /**
   * Uploads a file to the `documents` storage bucket and records metadata.
   * Create the bucket once in Supabase Dashboard > Storage (private, not public),
   * and add storage policies mirroring the `documents` table RLS.
   */
  async upload(file: File, ownerType: "student" | "teacher" | "school", ownerId: string | null, uploadedBy: string) {
    const path = `${ownerType}/${ownerId ?? "school"}/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (uploadErr) throw uploadErr;

    const { data, error } = await supabase
      .from("documents")
      .insert({
        owner_type: ownerType,
        owner_id: ownerId,
        file_name: file.name,
        file_path: path,
        file_type: file.type,
        uploaded_by: uploadedBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listFor(ownerType: "student" | "teacher" | "school", ownerId: string | null) {
    let query = supabase.from("documents").select("*").eq("owner_type", ownerType);
    query = ownerId ? query.eq("owner_id", ownerId) : query.is("owner_id", null);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async signedUrl(path: string, expiresInSeconds = 3600) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async remove(id: string, path: string) {
    await supabase.storage.from(BUCKET).remove([path]);
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
  },
};
