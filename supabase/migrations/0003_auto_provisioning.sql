-- ============================================================================
-- Auto-provisioning (Migration 0003)
-- When a new auth.users row is created with role/full_name in raw_user_meta_data
-- (set by the admin-manage-account edge function), mirror it into profiles
-- and the role-specific table.
-- ============================================================================

create or replace function handle_new_user() returns trigger as $$
declare
  meta_role text := new.raw_user_meta_data ->> 'role';
  meta_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.email);
begin
  insert into profiles (id, role, full_name, email, status)
  values (new.id, coalesce(meta_role, 'teacher')::user_role, meta_name, new.email, 'active')
  on conflict (id) do nothing;

  if coalesce(meta_role, 'teacher') = 'teacher' then
    insert into teachers (id) values (new.id) on conflict (id) do nothing;
  elsif meta_role = 'parent' then
    insert into parents (id) values (new.id) on conflict (id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- View: teacher syllabus completion, computed from topics rather than the
-- stored completion_pct column (which the edge function keeps in sync as a cache).
create or replace view v_teacher_completion
  with (security_invoker = true) as
select
  t.id as teacher_id,
  count(top.id) filter (where top.status = 'completed') as completed_topics,
  count(top.id) as total_topics,
  case when count(top.id) = 0 then 0
       else round(100.0 * count(top.id) filter (where top.status = 'completed') / count(top.id))
  end as computed_completion_pct
from teachers t
left join syllabus s on s.teacher_id = t.id
left join chapters c on c.syllabus_id = s.id
left join topics top on top.chapter_id = c.id
group by t.id;
