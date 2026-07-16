import { supabase } from "../lib/supabaseClient";
import type { HomeworkStatus } from "../types/database";

export interface HomeworkRow {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  title: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  created_at: string;
}

export const homeworkApi = {
  async assign(input: Omit<HomeworkRow, "id" | "created_at">): Promise<HomeworkRow> {
    const { data, error } = await supabase.from("homework").insert(input).select().single();
    if (error) throw error;
    const hw = data as HomeworkRow;

    // Auto-create a pending submission row per student in that class/section
    // so "not submitted" is queryable rather than inferred from absence.
    const { data: students, error: studErr } = await supabase
      .from("students")
      .select("id")
      .eq("class_id", hw.class_id)
      .eq("section_id", hw.section_id);
    if (studErr) throw studErr;

    if (students?.length) {
      await supabase.from("homework_submissions").insert(
        students.map((s) => ({ homework_id: hw.id, student_id: s.id, status: "assigned" as const }))
      );
    }
    return hw;
  },

  async forSection(classId: string, sectionId: string): Promise<HomeworkRow[]> {
    const { data, error } = await supabase
      .from("homework")
      .select("*")
      .eq("class_id", classId)
      .eq("section_id", sectionId)
      .order("due_date", { ascending: false });
    if (error) throw error;
    return data as HomeworkRow[];
  },

  async submissionsFor(homeworkId: string) {
    const { data, error } = await supabase
      .from("homework_submissions")
      .select("*, students(name, roll_no)")
      .eq("homework_id", homeworkId);
    if (error) throw error;
    return data;
  },

  async markSubmission(homeworkId: string, studentId: string, status: HomeworkStatus, grade?: string, feedback?: string) {
    const { error } = await supabase
      .from("homework_submissions")
      .update({
        status,
        submitted_at: status === "submitted" || status === "graded" ? new Date().toISOString() : null,
        grade,
        feedback,
      })
      .eq("homework_id", homeworkId)
      .eq("student_id", studentId);
    if (error) throw error;
  },

  /** Flags submissions past due_date that are still 'assigned' as overdue. Call from a scheduled job or on dashboard load. */
  async flagOverdue(): Promise<number> {
    const { data: overdueHomework, error: hwErr } = await supabase
      .from("homework")
      .select("id")
      .lt("due_date", new Date().toISOString().slice(0, 10));
    if (hwErr) throw hwErr;
    if (!overdueHomework?.length) return 0;

    const { data, error } = await supabase
      .from("homework_submissions")
      .update({ status: "overdue" })
      .in("homework_id", overdueHomework.map((h) => h.id))
      .eq("status", "assigned")
      .select("id");
    if (error) throw error;
    return data?.length ?? 0;
  },

  async parentView(studentId: string) {
    const { data, error } = await supabase
      .from("homework_submissions")
      .select("*, homework(title, description, due_date, subjects:subject_id(name))")
      .eq("student_id", studentId)
      .order("id", { ascending: false });
    if (error) throw error;
    return data;
  },
};
