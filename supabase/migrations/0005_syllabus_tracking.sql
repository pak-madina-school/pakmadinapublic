-- ============================================================================
-- Syllabus Tracking module completion (Migration 0005)
-- Purely additive: does not alter any column/policy from 0001-0004.
-- Adds: planning columns for chapters/topics, an AI-prediction history table,
-- and read-only aggregate views for class/section/subject/teacher progress
-- plus a completion log used for monthly & weekly progress charts.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Planning columns (nullable, backward compatible — existing rows unaffected)
-- ---------------------------------------------------------------------------
alter table chapters add column if not exists planned_start_date date;
alter table chapters add column if not exists planned_end_date date;
alter table topics add column if not exists target_date date; -- when this topic should be done, for schedule-vs-actual comparisons

-- ---------------------------------------------------------------------------
-- AI syllabus prediction history (one row per prediction run, so Progress
-- screens can show the trend, not just the latest call)
-- ---------------------------------------------------------------------------
create table if not exists syllabus_predictions (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references syllabus(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  on_track boolean not null,
  projected_completion_date date,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  recommendation text,
  created_at timestamptz not null default now()
);
create index if not exists idx_syllabus_predictions_syllabus on syllabus_predictions(syllabus_id, created_at desc);

alter table syllabus_predictions enable row level security;

create policy syllabus_predictions_staff_all on syllabus_predictions
  for all using (is_staff()) with check (is_staff());

create policy syllabus_predictions_teacher_rw on syllabus_predictions
  for all using (
    exists (select 1 from syllabus s where s.id = syllabus_predictions.syllabus_id and s.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from syllabus s where s.id = syllabus_predictions.syllabus_id and s.teacher_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Base progress view: one row per syllabus (class+section+subject+teacher)
-- security_invoker means RLS on the underlying tables still applies to
-- whoever queries the view — a teacher only ever sees their own rows here,
-- staff/admin see every row, exactly like the existing v_teacher_completion.
-- ---------------------------------------------------------------------------
create or replace view v_syllabus_progress
  with (security_invoker = true) as
select
  s.id as syllabus_id,
  s.class_id,
  s.section_id,
  s.subject_id,
  s.teacher_id,
  s.academic_session,
  count(top.id) as total_topics,
  count(top.id) filter (where top.status = 'completed') as completed_topics,
  count(top.id) filter (where top.status = 'in-progress') as in_progress_topics,
  count(top.id) filter (where top.status = 'pending') as pending_topics,
  case when count(top.id) = 0 then 0
       else round(100.0 * count(top.id) filter (where top.status = 'completed') / count(top.id))
  end as completion_pct
from syllabus s
left join chapters c on c.syllabus_id = s.id
left join topics top on top.chapter_id = c.id
group by s.id;

-- Class-wise progress
create or replace view v_class_progress
  with (security_invoker = true) as
select
  cl.id as class_id,
  cl.name as class_name,
  coalesce(sum(v.total_topics), 0) as total_topics,
  coalesce(sum(v.completed_topics), 0) as completed_topics,
  case when coalesce(sum(v.total_topics), 0) = 0 then 0
       else round(100.0 * sum(v.completed_topics) / sum(v.total_topics))
  end as completion_pct
from classes cl
left join v_syllabus_progress v on v.class_id = cl.id
group by cl.id, cl.name;

-- Section-wise progress
create or replace view v_section_progress
  with (security_invoker = true) as
select
  se.id as section_id,
  se.class_id,
  se.name as section_name,
  coalesce(sum(v.total_topics), 0) as total_topics,
  coalesce(sum(v.completed_topics), 0) as completed_topics,
  case when coalesce(sum(v.total_topics), 0) = 0 then 0
       else round(100.0 * sum(v.completed_topics) / sum(v.total_topics))
  end as completion_pct
from sections se
left join v_syllabus_progress v on v.section_id = se.id
group by se.id, se.class_id, se.name;

-- Subject-wise progress
create or replace view v_subject_progress
  with (security_invoker = true) as
select
  sub.id as subject_id,
  sub.name as subject_name,
  coalesce(sum(v.total_topics), 0) as total_topics,
  coalesce(sum(v.completed_topics), 0) as completed_topics,
  case when coalesce(sum(v.total_topics), 0) = 0 then 0
       else round(100.0 * sum(v.completed_topics) / sum(v.total_topics))
  end as completion_pct
from subjects sub
left join v_syllabus_progress v on v.subject_id = sub.id
group by sub.id, sub.name;

-- Teacher-wise progress with a display name joined in (extends, does not
-- replace, the existing v_teacher_completion view from migration 0003)
create or replace view v_teacher_progress
  with (security_invoker = true) as
select
  t.id as teacher_id,
  p.full_name as teacher_name,
  coalesce(vt.total_topics, 0) as total_topics,
  coalesce(vt.completed_topics, 0) as completed_topics,
  coalesce(vt.computed_completion_pct, 0) as completion_pct
from teachers t
join profiles p on p.id = t.id
left join v_teacher_completion vt on vt.teacher_id = t.id;

-- Row-level completion log (one row per completed topic) used to build
-- weekly/monthly progress charts client-side without a fixed grouping baked
-- into SQL, so the UI can bucket by week or month, and filter by class/
-- section/subject/teacher freely.
create or replace view v_topic_completion_log
  with (security_invoker = true) as
select
  top.id as topic_id,
  top.name as topic_name,
  top.completed_at,
  c.id as chapter_id,
  c.syllabus_id,
  s.class_id,
  s.section_id,
  s.subject_id,
  s.teacher_id
from topics top
join chapters c on c.id = top.chapter_id
join syllabus s on s.id = c.syllabus_id
where top.status = 'completed' and top.completed_at is not null;
