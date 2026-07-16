import { supabase } from "../lib/supabaseClient";
import type { ExamType } from "../types/database";

export interface ExamRow {
  id: string;
  name: string;
  exam_type: ExamType;
  class_id: string;
  section_id: string;
  subject_id: string;
  total_marks: number;
  exam_date: string;
  created_by: string;
  created_at: string;
}

export const examsApi = {
  async create(input: Omit<ExamRow, "id" | "created_at">): Promise<ExamRow> {
    const { data, error } = await supabase.from("exams").insert(input).select().single();
    if (error) throw error;
    return data as ExamRow;
  },
  async forSection(classId: string, sectionId: string): Promise<ExamRow[]> {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("class_id", classId)
      .eq("section_id", sectionId)
      .order("exam_date");
    if (error) throw error;
    return data as ExamRow[];
  },
  /** Exam timetable = same table, viewed by date range across all classes. */
  async timetable(from: string, to: string): Promise<ExamRow[]> {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .gte("exam_date", from)
      .lte("exam_date", to)
      .order("exam_date");
    if (error) throw error;
    return data as ExamRow[];
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) throw error;
  },
};

export const resultsApi = {
  async enterMarks(rows: { exam_id: string; student_id: string; marks_obtained: number; remark?: string }[]) {
    const { data, error } = await supabase
      .from("results")
      .upsert(rows, { onConflict: "exam_id,student_id" })
      .select();
    if (error) throw error;
    return data;
  },

  async forExam(examId: string) {
    const { data, error } = await supabase
      .from("results")
      .select("*, students(name, roll_no)")
      .eq("exam_id", examId)
      .order("marks_obtained", { ascending: false });
    if (error) throw error;
    return data;
  },

  /** Ranks students within an exam by marks_obtained (simple dense ranking, ties share a position). */
  async withPositions(examId: string) {
    const rows = await this.forExam(examId);
    let lastMarks: number | null = null;
    let position = 0;
    return rows.map((r: any, i: number) => {
      if (r.marks_obtained !== lastMarks) {
        position = i + 1;
        lastMarks = r.marks_obtained;
      }
      return { ...r, position };
    });
  },

  async forStudent(studentId: string) {
    const { data, error } = await supabase
      .from("results")
      .select("*, exams(name, exam_type, subject_id, total_marks, exam_date)")
      .eq("student_id", studentId);
    if (error) throw error;
    return data;
  },

  /** Grade from percentage — adjust bands to your school's policy. */
  gradeFor(marks: number, totalMarks: number): string {
    const pct = (marks / totalMarks) * 100;
    if (pct >= 90) return "A+";
    if (pct >= 80) return "A";
    if (pct >= 70) return "B";
    if (pct >= 60) return "C";
    if (pct >= 50) return "D";
    return "F";
  },
};

export const questionPapersApi = {
  async save(input: {
    exam_id?: string | null;
    teacher_id: string;
    subject_id: string;
    class_id: string;
    title: string;
    content: Record<string, unknown>;
    ai_generated?: boolean;
  }) {
    const { data, error } = await supabase.from("question_papers").insert(input).select().single();
    if (error) throw error;
    return data;
  },

  async forTeacher(teacherId: string) {
    const { data, error } = await supabase
      .from("question_papers")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  /** Calls the `ai-generate` edge function with kind: 'question_paper'. */
  async generateWithAI(params: {
    subject: string;
    className: string;
    chapters: string[];
    difficulty?: "easy" | "medium" | "hard" | "mixed";
    sections?: ("mcq" | "short" | "long" | "fill_blank" | "true_false" | "matching" | "practical")[];
  }) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke("ai-generate", {
      body: { kind: "question_paper", ...params },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) throw error;
    return data.paper as Record<string, unknown>;
  },
};
