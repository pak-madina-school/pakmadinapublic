import { supabase } from "../lib/supabaseClient";
import type { ClassRow } from "../types/database";

export const classesApi = {
  async list(): Promise<ClassRow[]> {
    const { data, error } = await supabase.from("classes").select("*").order("sort_order");
    if (error) throw error;
    return data as ClassRow[];
  },
  async create(name: string, sort_order = 0): Promise<ClassRow> {
    const { data, error } = await supabase.from("classes").insert({ name, sort_order }).select().single();
    if (error) throw error;
    return data as ClassRow;
  },
  async update(id: string, updates: Partial<Pick<ClassRow, "name" | "sort_order">>): Promise<ClassRow> {
    const { data, error } = await supabase.from("classes").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as ClassRow;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) throw error;
  },
};
