// Placeholder hand-written types matching migrations 0001/0002.
// Once your project is live, regenerate the authoritative version with:
//   npx supabase gen types typescript --project-id <your-project-ref> --schema public > src/types/database.ts
// That command needs the Supabase CLI + your project ref (Settings > General > Reference ID).

export type UserRole = "superadmin" | "admin" | "teacher" | "parent";
export type AccountStatus = "active" | "disabled";
export type TeacherStatus = "ahead" | "on-track" | "at-risk";
export type TopicStatus = "pending" | "in-progress" | "completed";
export type AttendanceStatus = "present" | "absent" | "late" | "leave";
export type HomeworkStatus = "assigned" | "submitted" | "graded" | "overdue";
export type ExamType = "quiz" | "monthly" | "mid-term" | "final" | "other";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface ClassRow { id: string; name: string; sort_order: number; created_at: string; }
export interface SectionRow { id: string; class_id: string; name: string; created_at: string; }
export interface SubjectRow { id: string; name: string; created_at: string; }

export interface TeacherRow {
  id: string;
  initials: string | null;
  phone: string | null;
  completion_pct: number;
  status: TeacherStatus;
  last_login: string | null;
  created_at: string;
}

export interface TeacherAssignmentRow {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  created_at: string;
}

export interface StudentRow {
  id: string;
  name: string;
  roll_no: string | null;
  class_id: string;
  section_id: string;
  date_of_birth: string | null;
  remarks: string | null;
  created_at: string;
}

export interface ParentRow { id: string; phone: string | null; created_at: string; }
export interface ParentStudentRow { parent_id: string; student_id: string; relationship: string; }

export interface SyllabusRow {
  id: string; class_id: string; section_id: string; subject_id: string;
  teacher_id: string | null; academic_session: string; created_at: string;
}
export interface ChapterRow {
  id: string; syllabus_id: string; name: string; sort_order: number; created_at: string;
  // Added in migration 0005 (Syllabus Tracking module) — nullable, backward compatible.
  planned_start_date: string | null;
  planned_end_date: string | null;
}
export interface TopicRow {
  id: string; chapter_id: string; name: string; status: TopicStatus;
  sort_order: number; completed_at: string | null; updated_at: string;
  // Added in migration 0005 (Syllabus Tracking module) — nullable, backward compatible.
  target_date: string | null;
}

// ---------------------------------------------------------------------------
// Syllabus Tracking module (migration 0005)
// ---------------------------------------------------------------------------
export type PredictionRisk = "low" | "medium" | "high";

export interface SyllabusPredictionRow {
  id: string;
  syllabus_id: string;
  requested_by: string;
  on_track: boolean;
  projected_completion_date: string | null;
  risk_level: PredictionRisk;
  recommendation: string | null;
  created_at: string;
}

export interface SyllabusProgressView {
  syllabus_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string | null;
  academic_session: string;
  total_topics: number;
  completed_topics: number;
  in_progress_topics: number;
  pending_topics: number;
  completion_pct: number;
}

export interface ClassProgressView {
  class_id: string;
  class_name: string;
  total_topics: number;
  completed_topics: number;
  completion_pct: number;
}

export interface SectionProgressView {
  section_id: string;
  class_id: string;
  section_name: string;
  total_topics: number;
  completed_topics: number;
  completion_pct: number;
}

export interface SubjectProgressView {
  subject_id: string;
  subject_name: string;
  total_topics: number;
  completed_topics: number;
  completion_pct: number;
}

export interface TeacherProgressView {
  teacher_id: string;
  teacher_name: string;
  total_topics: number;
  completed_topics: number;
  completion_pct: number;
}

export interface TopicCompletionLogRow {
  topic_id: string;
  topic_name: string;
  completed_at: string;
  chapter_id: string;
  syllabus_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string | null;
}

// Minimal Database shape so supabase-js generics compile; expand as needed.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      classes: { Row: ClassRow; Insert: Partial<ClassRow>; Update: Partial<ClassRow> };
      sections: { Row: SectionRow; Insert: Partial<SectionRow>; Update: Partial<SectionRow> };
      subjects: { Row: SubjectRow; Insert: Partial<SubjectRow>; Update: Partial<SubjectRow> };
      teachers: { Row: TeacherRow; Insert: Partial<TeacherRow>; Update: Partial<TeacherRow> };
      teacher_assignments: { Row: TeacherAssignmentRow; Insert: Partial<TeacherAssignmentRow>; Update: Partial<TeacherAssignmentRow> };
      students: { Row: StudentRow; Insert: Partial<StudentRow>; Update: Partial<StudentRow> };
      parents: { Row: ParentRow; Insert: Partial<ParentRow>; Update: Partial<ParentRow> };
      parent_students: { Row: ParentStudentRow; Insert: Partial<ParentStudentRow>; Update: Partial<ParentStudentRow> };
      syllabus: { Row: SyllabusRow; Insert: Partial<SyllabusRow>; Update: Partial<SyllabusRow> };
      chapters: { Row: ChapterRow; Insert: Partial<ChapterRow>; Update: Partial<ChapterRow> };
      topics: { Row: TopicRow; Insert: Partial<TopicRow>; Update: Partial<TopicRow> };
      syllabus_predictions: { Row: SyllabusPredictionRow; Insert: Partial<SyllabusPredictionRow>; Update: Partial<SyllabusPredictionRow> };
      [key: string]: { Row: any; Insert: any; Update: any };
    };
  };
}
