import { supabase } from "../lib/supabaseClient";
import type { AttendanceStatus } from "../types/database";

export interface AttendanceRow {
  id: string;
  student_id: string;
  class_id: string;
  section_id: string;
  marked_by: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
}

export const attendanceApi = {
  async markBulk(rows: { student_id: string; class_id: string; section_id: string; marked_by: string; date: string; status: AttendanceStatus }[]) {
    // upsert so re-marking the same day overwrites rather than duplicating (unique(student_id, date))
    const { data, error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" }).select();
    if (error) throw error;
    return data as AttendanceRow[];
  },

  async forSectionOnDate(classId: string, sectionId: string, date: string): Promise<AttendanceRow[]> {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("class_id", classId)
      .eq("section_id", sectionId)
      .eq("date", date);
    if (error) throw error;
    return data as AttendanceRow[];
  },

  async forStudent(studentId: string, from: string, to: string): Promise<AttendanceRow[]> {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId)
      .gte("date", from)
      .lte("date", to)
      .order("date");
    if (error) throw error;
    return data as AttendanceRow[];
  },

  /** Simple present/total percentage report for a class/section over a date range. */
  async sectionReport(classId: string, sectionId: string, from: string, to: string) {
    const { data, error } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("class_id", classId)
      .eq("section_id", sectionId)
      .gte("date", from)
      .lte("date", to);
    if (error) throw error;
    const byStudent: Record<string, { present: number; total: number }> = {};
    for (const row of data ?? []) {
      const rec = (byStudent[row.student_id] ??= { present: 0, total: 0 });
      rec.total += 1;
      if (row.status === "present" || row.status === "late") rec.present += 1;
    }
    return byStudent;
  },
};

/**
 * Teacher attendance and leave management reuse the same `attendance`-style shape
 * but scoped to staff, not students — table not yet in the schema.
 * TODO(schema): add `teacher_attendance` and `leave_requests` tables in a future
 * migration once you confirm leave policy (leave types, approval flow, quotas).
 * Marking this explicitly rather than guessing a leave/approval workflow.
 */
