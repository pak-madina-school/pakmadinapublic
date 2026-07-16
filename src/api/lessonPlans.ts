import { supabase } from "../lib/supabaseClient";

export interface LessonPlanRow {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  topic_id: string | null;
  title: string;
  content: string;
  plan_date: string;
  ai_generated: boolean;
  created_at: string;
}

export const lessonPlansApi = {
  async create(input: Omit<LessonPlanRow, "id" | "created_at">): Promise<LessonPlanRow> {
    const { data, error } = await supabase.from("lesson_plans").insert(input).select().single();
    if (error) throw error;
    return data as LessonPlanRow;
  },

  /** Daily/weekly/monthly views are the same table, filtered by a date range. */
  async forRange(teacherId: string, from: string, to: string): Promise<LessonPlanRow[]> {
    const { data, error } = await supabase
      .from("lesson_plans")
      .select("*")
      .eq("teacher_id", teacherId)
      .gte("plan_date", from)
      .lte("plan_date", to)
      .order("plan_date");
    if (error) throw error;
    return data as LessonPlanRow[];
  },

  async update(id: string, updates: Partial<Pick<LessonPlanRow, "title" | "content" | "plan_date">>): Promise<LessonPlanRow> {
    const { data, error } = await supabase.from("lesson_plans").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as LessonPlanRow;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
    if (error) throw error;
  },

  /**
   * Calls the `ai-generate` edge function (holds the Anthropic key server-side).
   * Returns generated lesson content; caller decides whether to save it via create().
   */
  async generateWithAI(params: { subject: string; className: string; topic: string; durationMinutes?: number }): Promise<string> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke("ai-generate", {
      body: { kind: "lesson_plan", ...params },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) throw error;
    return data.content as string;
  },
};
