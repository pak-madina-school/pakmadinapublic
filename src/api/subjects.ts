import { supabase } from "../lib/supabaseClient";
import type { SubjectRow } from "../types/database";

export const subjectsApi = {
  async list(): Promise<SubjectRow[]> {
    const { data, error } = await supabase.from("subjects").select("*").order("name");
    if (error) throw error;
    return data as SubjectRow[];
  },
  async create(name: string): Promise<SubjectRow> {
    const { data, error } = await supabase.from("subjects").insert({ name }).select().single();
    if (error) throw error;
    return data as SubjectRow;
  },
  async update(id: string, name: string): Promise<SubjectRow> {
    const { data, error } = await supabase.from("subjects").update({ name }).eq("id", id).select().single();
    if (error) throw error;
    return data as SubjectRow;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;
  },
};
