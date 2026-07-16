-- ============================================================================
-- RLS policies (Migration 0002)
-- Roles come from profiles.role (never trust client-sent role claims)
-- ============================================================================

create or replace function current_role_is(r user_role) returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = r and status = 'active');
$$ language sql security definer stable;

create or replace function is_staff() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('superadmin','admin') and status = 'active');
$$ language sql security definer stable;

create or replace function is_teacher_self(t_id uuid) returns boolean as $$
  select auth.uid() = t_id;
$$ language sql security definer stable;

alter table profiles enable row level security;
alter table classes enable row level security;
alter table sections enable row level security;
alter table subjects enable row level security;
alter table teachers enable row level security;
alter table teacher_assignments enable row level security;
alter table students enable row level security;
alter table parents enable row level security;
alter table parent_students enable row level security;
alter table syllabus enable row level security;
alter table chapters enable row level security;
alter table topics enable row level security;
alter table lesson_plans enable row level security;
alter table homework enable row level security;
alter table homework_submissions enable row level security;
alter table attendance enable row level security;
alter table exams enable row level security;
alter table results enable row level security;
alter table question_papers enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;
alter table school_settings enable row level security;
alter table academic_sessions enable row level security;
alter table holidays enable row level security;

-- profiles: everyone reads their own; staff read all
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_staff());
create policy profiles_staff_write on profiles for update using (is_staff());

-- reference data: readable by any authenticated user, writable by staff
create policy classes_read on classes for select using (auth.uid() is not null);
create policy classes_write on classes for all using (is_staff()) with check (is_staff());
create policy sections_read on sections for select using (auth.uid() is not null);
create policy sections_write on sections for all using (is_staff()) with check (is_staff());
create policy subjects_read on subjects for select using (auth.uid() is not null);
create policy subjects_write on subjects for all using (is_staff()) with check (is_staff());

-- teachers: staff full access; teacher reads/updates own row
create policy teachers_staff_all on teachers for all using (is_staff()) with check (is_staff());
create policy teachers_self_read on teachers for select using (id = auth.uid());

-- teacher_assignments: staff manage; teacher reads own
create policy assignments_staff_all on teacher_assignments for all using (is_staff()) with check (is_staff());
create policy assignments_teacher_read on teacher_assignments for select using (teacher_id = auth.uid());

-- students: staff full; teacher reads students in their assigned class/section; parent reads own children
create policy students_staff_all on students for all using (is_staff()) with check (is_staff());
create policy students_teacher_read on students for select using (
  exists (
    select 1 from teacher_assignments ta
    where ta.teacher_id = auth.uid() and ta.class_id = students.class_id and ta.section_id = students.section_id
  )
);
create policy students_parent_read on students for select using (
  exists (select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = students.id)
);

-- parents
create policy parents_staff_all on parents for all using (is_staff()) with check (is_staff());
create policy parents_self_read on parents for select using (id = auth.uid());
create policy parent_students_staff_all on parent_students for all using (is_staff()) with check (is_staff());
create policy parent_students_self_read on parent_students for select using (parent_id = auth.uid());

-- syllabus/chapters/topics: staff full; owning teacher can edit; parents/teachers of the class can read
create policy syllabus_staff_all on syllabus for all using (is_staff()) with check (is_staff());
create policy syllabus_teacher_all on syllabus for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy chapters_rw on chapters for all using (
  is_staff() or exists (select 1 from syllabus s where s.id = chapters.syllabus_id and s.teacher_id = auth.uid())
) with check (
  is_staff() or exists (select 1 from syllabus s where s.id = chapters.syllabus_id and s.teacher_id = auth.uid())
);

create policy topics_rw on topics for all using (
  is_staff() or exists (
    select 1 from chapters c join syllabus s on s.id = c.syllabus_id
    where c.id = topics.chapter_id and s.teacher_id = auth.uid()
  )
) with check (
  is_staff() or exists (
    select 1 from chapters c join syllabus s on s.id = c.syllabus_id
    where c.id = topics.chapter_id and s.teacher_id = auth.uid()
  )
);

-- lesson_plans / homework: teacher owns; staff read all
create policy lesson_plans_teacher_all on lesson_plans for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy lesson_plans_staff_read on lesson_plans for select using (is_staff());

create policy homework_teacher_all on homework for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy homework_staff_read on homework for select using (is_staff());
create policy homework_parent_read on homework for select using (
  exists (
    select 1 from parent_students ps join students st on st.id = ps.student_id
    where ps.parent_id = auth.uid() and st.class_id = homework.class_id and st.section_id = homework.section_id
  )
);

create policy hw_submissions_teacher on homework_submissions for all using (
  exists (select 1 from homework h where h.id = homework_submissions.homework_id and h.teacher_id = auth.uid())
) with check (
  exists (select 1 from homework h where h.id = homework_submissions.homework_id and h.teacher_id = auth.uid())
);
create policy hw_submissions_staff on homework_submissions for select using (is_staff());
create policy hw_submissions_parent on homework_submissions for select using (
  exists (select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = homework_submissions.student_id)
);

-- attendance: teacher marks for own class/section; staff full; parent reads own child
create policy attendance_teacher_all on attendance for all using (marked_by = auth.uid()) with check (marked_by = auth.uid());
create policy attendance_staff_all on attendance for all using (is_staff()) with check (is_staff());
create policy attendance_parent_read on attendance for select using (
  exists (select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = attendance.student_id)
);

-- exams/results/question_papers
create policy exams_teacher_all on exams for all using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy exams_staff_all on exams for all using (is_staff()) with check (is_staff());
create policy exams_parent_read on exams for select using (
  exists (
    select 1 from parent_students ps join students st on st.id = ps.student_id
    where ps.parent_id = auth.uid() and st.class_id = exams.class_id and st.section_id = exams.section_id
  )
);

create policy results_staff_all on results for all using (is_staff()) with check (is_staff());
create policy results_teacher_all on results for all using (
  exists (select 1 from exams e where e.id = results.exam_id and e.created_by = auth.uid())
) with check (
  exists (select 1 from exams e where e.id = results.exam_id and e.created_by = auth.uid())
);
create policy results_parent_read on results for select using (
  exists (select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = results.student_id)
);

create policy qp_teacher_all on question_papers for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy qp_staff_read on question_papers for select using (is_staff());

-- notifications: recipient only, staff can insert/read all
create policy notif_self on notifications for select using (recipient_id = auth.uid());
create policy notif_self_update on notifications for update using (recipient_id = auth.uid());
create policy notif_staff_all on notifications for all using (is_staff()) with check (is_staff());

-- activity_logs: staff/superadmin only (write happens via edge functions with service role)
create policy logs_staff_read on activity_logs for select using (is_staff());

-- settings / sessions / holidays: readable by all authenticated, writable by staff
create policy settings_read on school_settings for select using (auth.uid() is not null);
create policy settings_write on school_settings for update using (is_staff());
create policy sessions_read on academic_sessions for select using (auth.uid() is not null);
create policy sessions_write on academic_sessions for all using (is_staff()) with check (is_staff());
create policy holidays_read on holidays for select using (auth.uid() is not null);
create policy holidays_write on holidays for all using (is_staff()) with check (is_staff());
