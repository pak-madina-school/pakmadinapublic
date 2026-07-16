-- ============================================================================
-- Fix (Migration 0007): the on-auth-user-created trigger from 0003 didn't set
-- search_path explicitly. SECURITY DEFINER functions should always pin
-- search_path — without it, the unqualified `profiles` / `teachers` /
-- `parents` table names can fail to resolve depending on the caller's
-- session context (GoTrue's internal connection), which surfaces to the
-- Dashboard simply as "Database error creating new user" with no detail.
--
-- This also hardens role handling: treats an empty-string role the same as
-- NULL (defaults to 'teacher') instead of trying to cast '' to the enum,
-- which would also fail.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text := nullif(trim(both from coalesce(new.raw_user_meta_data ->> 'role', '')), '');
  meta_name text := coalesce(nullif(trim(both from coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''), new.email);
  final_role user_role := coalesce(meta_role, 'teacher')::user_role;
begin
  insert into profiles (id, role, full_name, email, status)
  values (new.id, final_role, meta_name, new.email, 'active')
  on conflict (id) do nothing;

  if final_role = 'teacher' then
    insert into teachers (id) values (new.id) on conflict (id) do nothing;
  elsif final_role = 'parent' then
    insert into parents (id) values (new.id) on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- Trigger itself doesn't need to change, but re-create it to be safe in case
-- it's pointing at a stale function definition.
drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function handle_new_user();
