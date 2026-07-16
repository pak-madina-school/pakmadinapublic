import { supabase } from "../lib/supabaseClient";
import type { TeacherAssignmentRow, TeacherRow } from "../types/database";

export const teacherAssignmentsApi = {
  async listByTeacher(teacherId: string): Promise<TeacherAssignmentRow[]> {
    const { data, error } = await supabase
      .from("teacher_assignments")
      .select("*")
      .eq("teacher_id", teacherId);
    if (error) throw error;
    return data as TeacherAssignmentRow[];
  },

  async listAll(): Promise<TeacherAssignmentRow[]> {
    const { data, error } = await supabase.from("teacher_assignments").select("*");
    if (error) throw error;
    return data as TeacherAssignmentRow[];
  },

  async assign(teacher_id: string, class_id: string, section_id: string, subject_id: string): Promise<TeacherAssignmentRow> {
    // unique(class_id, section_id, subject_id) in the schema enforces one teacher per slot;
    // a duplicate insert will throw a 23505 which the caller should surface as "already assigned".
    const { data, error } = await supabase
      .from("teacher_assignments")
      .insert({ teacher_id, class_id, section_id, subject_id })
      .select()
      .single();
    if (error) throw error;
    return data as TeacherAssignmentRow;
  },

  async reassign(assignmentId: string, teacher_id: string): Promise<TeacherAssignmentRow> {
    const { data, error } = await supabase
      .from("teacher_assignments")
      .update({ teacher_id })
      .eq("id", assignmentId)
      .select()
      .single();
    if (error) throw error;
    return data as TeacherAssignmentRow;
  },

  async remove(assignmentId: string): Promise<void> {
    const { error } = await supabase.from("teacher_assignments").delete().eq("id", assignmentId);
    if (error) throw error;
  },
};

export const teachersApi = {
  async list(): Promise<TeacherRow[]> {
    // profiles holds name/email/status; teachers holds the role-specific fields.
    const { data, error } = await supabase
      .from("teachers")
      .select("*, profiles!inner(full_name, email, status)")
      .order("created_at");
    if (error) throw error;
    return data as unknown as TeacherRow[];
  },

  async completion() {
    const { data, error } = await supabase.from("v_teacher_completion").select("*");
    if (error) throw error;
    return data as { teacher_id: string; completed_topics: number; total_topics: number; computed_completion_pct: number }[];
  },

  async updatePhone(teacherId: string, phone: string) {
    const { error } = await supabase.from("teachers").update({ phone }).eq("id", teacherId);
    if (error) throw error;
  },
};
