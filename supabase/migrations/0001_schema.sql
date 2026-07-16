-- ============================================================================
-- Pak Madina School — Core Schema (Migration 0001)
-- Run in Supabase SQL editor or via `supabase db push`
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type user_role as enum ('superadmin', 'admin', 'teacher', 'parent');
create type account_status as enum ('active', 'disabled');
create type teacher_status as enum ('ahead', 'on-track', 'at-risk');
create type topic_status as enum ('pending', 'in-progress', 'completed');
create type attendance_status as enum ('present', 'absent', 'late', 'leave');
create type homework_status as enum ('assigned', 'submitted', 'graded', 'overdue');
create type exam_type as enum ('quiz', 'monthly', 'mid-term', 'final', 'other');
create type notification_channel as enum ('in-app', 'sms', 'email');

-- ---------------------------------------------------------------------------
-- PROFILES  (mirrors auth.users; source of truth for role)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null unique,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CLASSES / SECTIONS / SUBJECTS
-- ---------------------------------------------------------------------------
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- TEACHERS  (1:1 with profiles where role = 'teacher')
-- ---------------------------------------------------------------------------
create table teachers (
  id uuid primary key references profiles(id) on delete cascade,
  initials text,
  phone text,
  completion_pct int not null default 0,
  status teacher_status not null default 'on-track',
  last_login timestamptz,
  created_at timestamptz not null default now()
);

create table teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  section_id uuid not null references sections(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, section_id, subject_id) -- one teacher per class-section-subject
);
create index idx_teacher_assignments_teacher on teacher_assignments(teacher_id);

-- ---------------------------------------------------------------------------
-- STUDENTS / PARENTS
-- ---------------------------------------------------------------------------
create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  roll_no text,
  class_id uuid not null references classes(id),
  section_id uuid not null references sections(id),
  date_of_birth date,
  remarks text,
  created_at timestamptz not null default now()
);
create index idx_students_class_section on students(class_id, section_id);

create table parents (
  id uuid primary key references profiles(id) on delete cascade,
  phone text,
  created_at timestamptz not null default now()
);

create table parent_students (
  parent_id uuid not null references parents(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  relationship text default 'guardian',
  primary key (parent_id, student_id)
);

-- ---------------------------------------------------------------------------
-- SYLLABUS / CHAPTERS / TOPICS
-- ---------------------------------------------------------------------------
create table syllabus (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  section_id uuid not null references sections(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete set null,
  academic_session text not null default to_char(now(), 'YYYY'),
  created_at timestamptz not null default now(),
  unique (class_id, section_id, subject_id, academic_session)
);

create table chapters (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references syllabus(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  name text not null,
  status topic_status not null default 'pending',
  sort_order int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index idx_topics_chapter on topics(chapter_id);

-- ---------------------------------------------------------------------------
-- LESSON PLANS / HOMEWORK
-- ---------------------------------------------------------------------------
create table lesson_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid not null references classes(id),
  section_id uuid not null references sections(id),
  subject_id uuid not null references subjects(id),
  topic_id uuid references topics(id) on delete set null,
  title text not null,
  content text not null,
  plan_date date not null default current_date,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_lesson_plans_teacher on lesson_plans(teacher_id);

create table homework (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid not null references classes(id),
  section_id uuid not null references sections(id),
  subject_id uuid not null references subjects(id),
  title text not null,
  description text,
  assigned_date date not null default current_date,
  due_date date not null,
  created_at timestamptz not null default now()
);

create table homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references homework(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status homework_status not null default 'assigned',
  submitted_at timestamptz,
  grade text,
  feedback text,
  unique (homework_id, student_id)
);

-- ---------------------------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------------------------
create table attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid not null references classes(id),
  section_id uuid not null references sections(id),
  marked_by uuid not null references teachers(id),
  date date not null default current_date,
  status attendance_status not null,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);
create index idx_attendance_date on attendance(date);
create index idx_attendance_class_section on attendance(class_id, section_id, date);

-- ---------------------------------------------------------------------------
-- EXAMS / RESULTS / QUESTION PAPERS
-- ---------------------------------------------------------------------------
create table exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  exam_type exam_type not null default 'other',
  class_id uuid not null references classes(id),
  section_id uuid not null references sections(id),
  subject_id uuid not null references subjects(id),
  total_marks int not null default 100,
  exam_date date not null,
  created_by uuid not null references teachers(id),
  created_at timestamptz not null default now()
);

create table results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  marks_obtained numeric(6,2) not null,
  remark text,
  created_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create table question_papers (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete set null,
  teacher_id uuid not null references teachers(id),
  subject_id uuid not null references subjects(id),
  class_id uuid not null references classes(id),
  title text not null,
  content jsonb not null, -- { mcqs, fillBlanks, trueFalse, shortQuestions, longQuestions }
  ai_generated boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS / ACTIVITY LOGS
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  channel notification_channel not null default 'in-app',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notifications_recipient on notifications(recipient_id, read_at);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_activity_logs_actor on activity_logs(actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- SCHOOL SETTINGS / ACADEMIC SESSIONS / HOLIDAYS
-- ---------------------------------------------------------------------------
create table school_settings (
  id int primary key default 1,
  school_name text not null default 'Pak Madina Public School',
  address text,
  logo_url text,
  academic_session_start date,
  academic_session_end date,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into school_settings (id) values (1);

create table academic_sessions (
  id uuid primary key default gen_random_uuid(),
  label text not null unique, -- e.g. '2026-2027'
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_topics_updated before update on topics
  for each row execute function set_updated_at();
