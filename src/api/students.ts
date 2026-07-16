import { supabase } from "../lib/supabaseClient";
import type { StudentRow } from "../types/database";

export const studentsApi = {
  async listByClassSection(classId: string, sectionId: string): Promise<StudentRow[]> {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("class_id", classId)
      .eq("section_id", sectionId)
      .order("name");
    if (error) throw error;
    return data as StudentRow[];
  },

  async listAll(): Promise<StudentRow[]> {
    const { data, error } = await supabase.from("students").select("*").order("name");
    if (error) throw error;
    return data as StudentRow[];
  },

  async get(id: string): Promise<StudentRow> {
    const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
    if (error) throw error;
    return data as StudentRow;
  },

  /** Admission = create. */
  async admit(input: Omit<StudentRow, "id" | "created_at">): Promise<StudentRow> {
    const { data, error } = await supabase.from("students").insert(input).select().single();
    if (error) throw error;
    return data as StudentRow;
  },

  async update(id: string, updates: Partial<StudentRow>): Promise<StudentRow> {
    const { data, error } = await supabase.from("students").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as StudentRow;
  },

  /** Transfer = move to a different class/section (same school). */
  async transfer(id: string, class_id: string, section_id: string): Promise<StudentRow> {
    const { data, error } = await supabase
      .from("students")
      .update({ class_id, section_id })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as StudentRow;
  },

  /** Promotion = bulk transfer of an entire class/section roster to the next class, e.g. end-of-year. */
  async promoteSection(fromClassId: string, fromSectionId: string, toClassId: string, toSectionId: string): Promise<number> {
    const { data, error } = await supabase
      .from("students")
      .update({ class_id: toClassId, section_id: toSectionId })
      .eq("class_id", fromClassId)
      .eq("section_id", fromSectionId)
      .select("id");
    if (error) throw error;
    return (data ?? []).length;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) throw error;
  },

  /** Bulk import from parsed CSV rows: [{ name, roll_no, class_id, section_id, date_of_birth }] */
  async bulkImport(rows: Omit<StudentRow, "id" | "created_at">[]): Promise<{ inserted: number; errors: string[] }> {
    const errors: string[] = [];
    const CHUNK = 200; // stay under request size limits
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error, data } = await supabase.from("students").insert(chunk).select("id");
      if (error) errors.push(`Rows ${i}-${i + chunk.length}: ${error.message}`);
      else inserted += data?.length ?? 0;
    }
    return { inserted, errors };
  },

  /** Bulk export: returns plain rows for the caller to hand to a CSV/XLSX writer (see src/lib/exporters.ts). */
  async exportAll(): Promise<StudentRow[]> {
    return this.listAll();
  },
};
