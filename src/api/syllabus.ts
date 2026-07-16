import { supabase } from "../lib/supabaseClient";
import type {
  SyllabusRow,
  ChapterRow,
  TopicRow,
  TopicStatus,
  SyllabusPredictionRow,
  SyllabusProgressView,
  ClassProgressView,
  SectionProgressView,
  SubjectProgressView,
  TeacherProgressView,
  TopicCompletionLogRow,
} from "../types/database";

// ---------------------------------------------------------------------------
// Syllabus Management
// ---------------------------------------------------------------------------
export const syllabusApi = {
  async list(): Promise<SyllabusRow[]> {
    const { data, error } = await supabase.from("syllabus").select("*").order("academic_session", { ascending: false });
    if (error) throw error;
    return data as SyllabusRow[];
  },

  async listForTeacher(teacherId: string): Promise<SyllabusRow[]> {
    const { data, error } = await supabase.from("syllabus").select("*").eq("teacher_id", teacherId);
    if (error) throw error;
    return data as SyllabusRow[];
  },

  async create(input: {
    class_id: string;
    section_id: string;
    subject_id: string;
    teacher_id?: string | null;
    academic_session?: string;
  }): Promise<SyllabusRow> {
    const { data, error } = await supabase.from("syllabus").insert(input).select().single();
    if (error) throw error;
    return data as SyllabusRow;
  },

  async assignTeacher(syllabusId: string, teacher_id: string | null): Promise<SyllabusRow> {
    const { data, error } = await supabase.from("syllabus").update({ teacher_id }).eq("id", syllabusId).select().single();
    if (error) throw error;
    return data as SyllabusRow;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("syllabus").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// Chapter Management
// ---------------------------------------------------------------------------
export const chaptersApi = {
  async listBySyllabus(syllabusId: string): Promise<ChapterRow[]> {
    const { data, error } = await supabase.from("chapters").select("*").eq("syllabus_id", syllabusId).order("sort_order");
    if (error) throw error;
    return data as ChapterRow[];
  },

  async create(input: {
    syllabus_id: string;
    name: string;
    sort_order?: number;
    planned_start_date?: string | null;
    planned_end_date?: string | null;
  }): Promise<ChapterRow> {
    const { data, error } = await supabase.from("chapters").insert(input).select().single();
    if (error) throw error;
    return data as ChapterRow;
  },

  async update(
    id: string,
    updates: Partial<Pick<ChapterRow, "name" | "sort_order" | "planned_start_date" | "planned_end_date">>
  ): Promise<ChapterRow> {
    const { data, error } = await supabase.from("chapters").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as ChapterRow;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// Topic Management + Topic Completion Tracking
// ---------------------------------------------------------------------------
export const topicsApi = {
  async listByChapter(chapterId: string): Promise<TopicRow[]> {
    const { data, error } = await supabase.from("topics").select("*").eq("chapter_id", chapterId).order("sort_order");
    if (error) throw error;
    return data as TopicRow[];
  },

  async create(input: { chapter_id: string; name: string; sort_order?: number; target_date?: string | null }): Promise<TopicRow> {
    const { data, error } = await supabase.from("topics").insert(input).select().single();
    if (error) throw error;
    return data as TopicRow;
  },

  async update(id: string, updates: Partial<Pick<TopicRow, "name" | "sort_order" | "target_date">>): Promise<TopicRow> {
    const { data, error } = await supabase.from("topics").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as TopicRow;
  },

  /** Marks a topic's completion status; stamps/clears completed_at automatically. */
  async setStatus(id: string, status: TopicStatus): Promise<TopicRow> {
    const { data, error } = await supabase
      .from("topics")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TopicRow;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("topics").delete().eq("id", id);
    if (error) throw error;
  },
};

// ---------------------------------------------------------------------------
// Progress Percentage / Teacher-wise / Class-wise / Section-wise / Subject-wise
// (all backed by read-only views from migration 0005; RLS on the underlying
// tables still applies, so a teacher only ever sees their own scope here)
// ---------------------------------------------------------------------------
export const progressApi = {
  async bySyllabus(): Promise<SyllabusProgressView[]> {
    const { data, error } = await supabase.from("v_syllabus_progress").select("*");
    if (error) throw error;
    return data as SyllabusProgressView[];
  },

  async overall(): Promise<{ total_topics: number; completed_topics: number; completion_pct: number }> {
    const rows = await progressApi.bySyllabus();
    const total_topics = rows.reduce((sum, r) => sum + r.total_topics, 0);
    const completed_topics = rows.reduce((sum, r) => sum + r.completed_topics, 0);
    return {
      total_topics,
      completed_topics,
      completion_pct: total_topics === 0 ? 0 : Math.round((100 * completed_topics) / total_topics),
    };
  },

  async byClass(): Promise<ClassProgressView[]> {
    const { data, error } = await supabase.from("v_class_progress").select("*").order("class_name");
    if (error) throw error;
    return data as ClassProgressView[];
  },

  async bySection(): Promise<SectionProgressView[]> {
    const { data, error } = await supabase.from("v_section_progress").select("*").order("section_name");
    if (error) throw error;
    return data as SectionProgressView[];
  },

  async bySubject(): Promise<SubjectProgressView[]> {
    const { data, error } = await supabase.from("v_subject_progress").select("*").order("subject_name");
    if (error) throw error;
    return data as SubjectProgressView[];
  },

  async byTeacher(): Promise<TeacherProgressView[]> {
    const { data, error } = await supabase.from("v_teacher_progress").select("*").order("teacher_name");
    if (error) throw error;
    return data as TeacherProgressView[];
  },
};

// ---------------------------------------------------------------------------
// Monthly & Weekly Progress (client-side bucketing over the completion log,
// so the same query works for both granularities and any dimension filter)
// ---------------------------------------------------------------------------
export interface ProgressBucket {
  bucketStart: string; // ISO date, Monday for weekly / 1st for monthly
  label: string;
  completedCount: number;
}

export interface CompletionLogFilters {
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  from?: string; // ISO date, inclusive
  to?: string; // ISO date, inclusive
}

export const monthlyWeeklyProgressApi = {
  async fetchLog(filters: CompletionLogFilters = {}): Promise<TopicCompletionLogRow[]> {
    let query = supabase.from("v_topic_completion_log").select("*");
    if (filters.classId) query = query.eq("class_id", filters.classId);
    if (filters.sectionId) query = query.eq("section_id", filters.sectionId);
    if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
    if (filters.teacherId) query = query.eq("teacher_id", filters.teacherId);
    if (filters.from) query = query.gte("completed_at", filters.from);
    if (filters.to) query = query.lte("completed_at", filters.to);
    const { data, error } = await query.order("completed_at");
    if (error) throw error;
    return data as TopicCompletionLogRow[];
  },

  /** Buckets a completion log into weekly (Mon-start) counts. */
  weekly(rows: TopicCompletionLogRow[]): ProgressBucket[] {
    const buckets = new Map<string, number>();
    for (const row of rows) {
      const d = new Date(row.completed_at);
      const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - day);
      monday.setUTCHours(0, 0, 0, 0);
      const key = monday.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        bucketStart: key,
        label: `Week of ${new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        completedCount: count,
      }));
  },

  /** Buckets a completion log into calendar-month counts. */
  monthly(rows: TopicCompletionLogRow[]): ProgressBucket[] {
    const buckets = new Map<string, number>();
    for (const row of rows) {
      const d = new Date(row.completed_at);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        bucketStart: key,
        label: new Date(key).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        completedCount: count,
      }));
  },
};

// ---------------------------------------------------------------------------
// AI Syllabus Prediction (calls the shared `ai-generate` edge function, kinds
// "syllabus_prediction" and "catchup_suggestions" — both already deployed as
// part of the existing ai-generate function; this module only adds the
// client wrapper and a history table so runs can be reviewed over time)
// ---------------------------------------------------------------------------
export interface SyllabusPredictionResult {
  onTrack: boolean;
  projectedCompletionDate: string;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
}

export interface CatchupPlanResult {
  weeklyPlan: { week: number; topics: string[] }[];
  note: string;
}

export const aiSyllabusApi = {
  async predict(syllabusId: string): Promise<SyllabusPredictionResult> {
    const [{ data: sessionData }, progressRows, settings] = await Promise.all([
      supabase.auth.getSession(),
      progressApi.bySyllabus(),
      supabase.from("school_settings").select("academic_session_end").eq("id", 1).single(),
    ]);
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const progress = progressRows.find((r) => r.syllabus_id === syllabusId);
    if (!progress) throw new Error("No progress data for this syllabus yet");

    const sessionEndDate = settings.data?.academic_session_end ?? null;

    const { data, error } = await supabase.functions.invoke("ai-generate", {
      body: { kind: "syllabus_prediction", progress, sessionEndDate },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) throw error;
    const result = data as SyllabusPredictionResult;

    // Persist to history so Progress screens can chart the trend.
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from("syllabus_predictions").insert({
        syllabus_id: syllabusId,
        requested_by: userData.user.id,
        on_track: result.onTrack,
        projected_completion_date: result.projectedCompletionDate,
        risk_level: result.riskLevel,
        recommendation: result.recommendation,
      });
    }
    return result;
  },

  async catchupPlan(remainingTopics: string[], remainingDays: number): Promise<CatchupPlanResult> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke("ai-generate", {
      body: { kind: "catchup_suggestions", remainingTopics, remainingDays },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) throw error;
    return data as CatchupPlanResult;
  },

  async history(syllabusId: string): Promise<SyllabusPredictionRow[]> {
    const { data, error } = await supabase
      .from("syllabus_predictions")
      .select("*")
      .eq("syllabus_id", syllabusId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as SyllabusPredictionRow[];
  },
};
