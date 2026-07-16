import { supabase } from "../lib/supabaseClient";
import type { ParentRow, ParentStudentRow, StudentRow } from "../types/database";

export const parentsApi = {
  async list(): Promise<ParentRow[]> {
    const { data, error } = await supabase.from("parents").select("*, profiles!inner(full_name, email, status)");
    if (error) throw error;
    return data as unknown as ParentRow[];
  },

  async linkChild(parent_id: string, student_id: string, relationship = "guardian"): Promise<ParentStudentRow> {
    const { data, error } = await supabase
      .from("parent_students")
      .insert({ parent_id, student_id, relationship })
      .select()
      .single();
    if (error) throw error;
    return data as ParentStudentRow;
  },

  async unlinkChild(parent_id: string, student_id: string): Promise<void> {
    const { error } = await supabase
      .from("parent_students")
      .delete()
      .eq("parent_id", parent_id)
      .eq("student_id", student_id);
    if (error) throw error;
  },

  async childrenOf(parent_id: string): Promise<StudentRow[]> {
    const { data, error } = await supabase
      .from("parent_students")
      .select("students(*)")
      .eq("parent_id", parent_id);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.students) as StudentRow[];
  },

  async updatePhone(parentId: string, phone: string) {
    const { error } = await supabase.from("parents").update({ phone }).eq("id", parentId);
    if (error) throw error;
  },
};
