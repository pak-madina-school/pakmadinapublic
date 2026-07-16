import { supabase } from "../lib/supabaseClient";
import type { SectionRow } from "../types/database";

export const sectionsApi = {
  async listByClass(classId: string): Promise<SectionRow[]> {
    const { data, error } = await supabase.from("sections").select("*").eq("class_id", classId).order("name");
    if (error) throw error;
    return data as SectionRow[];
  },
  async listAll(): Promise<SectionRow[]> {
    const { data, error } = await supabase.from("sections").select("*").order("name");
    if (error) throw error;
    return data as SectionRow[];
  },
  async create(class_id: string, name: string): Promise<SectionRow> {
    const { data, error } = await supabase.from("sections").insert({ class_id, name }).select().single();
    if (error) throw error;
    return data as SectionRow;
  },
  async update(id: string, name: string): Promise<SectionRow> {
    const { data, error } = await supabase.from("sections").update({ name }).eq("id", id).select().single();
    if (error) throw error;
    return data as SectionRow;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) throw error;
  },
};
