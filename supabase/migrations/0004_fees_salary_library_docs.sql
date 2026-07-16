-- ============================================================================
-- Migration 0004: Fees, Salary, Library, Documents
-- NOTE: fee/salary structures below are reasonable STARTER defaults, not a
-- verified accounting model. Review fee_heads / salary_components against
-- your school's actual policy before using this for real transactions.
-- ============================================================================

create type fee_status as enum ('pending', 'paid', 'partial', 'overdue', 'waived');
create type salary_status as enum ('pending', 'paid');
create type book_status as enum ('available', 'issued', 'lost', 'damaged');

-- ---------------------------------------------------------------------------
-- FEES
-- ---------------------------------------------------------------------------
create table fee_heads (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- e.g. 'Tuition', 'Admission', 'Transport', 'Exam Fee'
  default_amount numeric(10,2) not null default 0,
  frequency text not null default 'monthly' check (frequency in ('monthly','quarterly','annual','one-time')),
  created_at timestamptz not null default now()
);

create table fee_structures (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  fee_head_id uuid not null references fee_heads(id) on delete cascade,
  amount numeric(10,2) not null,
  academic_session text not null,
  unique (class_id, fee_head_id, academic_session)
);

create table fee_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  fee_head_id uuid not null references fee_heads(id),
  amount_due numeric(10,2) not null,
  amount_paid numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  status fee_status not null default 'pending',
  due_date date not null,
  paid_date date,
  receipt_no text unique,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_fee_payments_student on fee_payments(student_id, status);

-- ---------------------------------------------------------------------------
-- SALARY
-- ---------------------------------------------------------------------------
create table salary_components (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- e.g. 'Base Salary', 'Transport Allowance', 'Tax Deduction'
  type text not null check (type in ('earning','deduction')),
  created_at timestamptz not null default now()
);

create table salary_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  month date not null, -- first day of the salary month
  base_amount numeric(10,2) not null,
  bonuses numeric(10,2) not null default 0,
  deductions numeric(10,2) not null default 0,
  net_amount numeric(10,2) generated always as (base_amount + bonuses - deductions) stored,
  status salary_status not null default 'pending',
  paid_date date,
  created_at timestamptz not null default now(),
  unique (teacher_id, month)
);

-- ---------------------------------------------------------------------------
-- LIBRARY
-- ---------------------------------------------------------------------------
create table library_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn text,
  total_copies int not null default 1,
  available_copies int not null default 1,
  created_at timestamptz not null default now()
);

create table book_issues (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references library_books(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete cascade,
  issue_date date not null default current_date,
  due_date date not null,
  return_date date,
  fine_amount numeric(10,2) not null default 0,
  status book_status not null default 'issued',
  check (student_id is not null or teacher_id is not null)
);

-- ---------------------------------------------------------------------------
-- DOCUMENTS (metadata only; binary files live in Supabase Storage)
-- ---------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('student','teacher','school')),
  owner_id uuid, -- student_id or teacher_id; null for school-wide docs
  file_name text not null,
  file_path text not null, -- storage bucket path
  file_type text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table fee_heads enable row level security;
alter table fee_structures enable row level security;
alter table fee_payments enable row level security;
alter table salary_components enable row level security;
alter table salary_records enable row level security;
alter table library_books enable row level security;
alter table book_issues enable row level security;
alter table documents enable row level security;

create policy fee_heads_read on fee_heads for select using (auth.uid() is not null);
create policy fee_heads_staff_write on fee_heads for all using (is_staff()) with check (is_staff());
create policy fee_structures_read on fee_structures for select using (auth.uid() is not null);
create policy fee_structures_staff_write on fee_structures for all using (is_staff()) with check (is_staff());

create policy fee_payments_staff_all on fee_payments for all using (is_staff()) with check (is_staff());
create policy fee_payments_parent_read on fee_payments for select using (
  exists (select 1 from parent_students ps where ps.parent_id = auth.uid() and ps.student_id = fee_payments.student_id)
);

-- Salary: superadmin/admin only, teachers never see other teachers' salary.
create policy salary_components_staff on salary_components for all using (is_staff()) with check (is_staff());
create policy salary_records_staff on salary_records for all using (is_staff()) with check (is_staff());
create policy salary_records_self_read on salary_records for select using (teacher_id = auth.uid());

create policy library_books_read on library_books for select using (auth.uid() is not null);
create policy library_books_staff_write on library_books for all using (is_staff()) with check (is_staff());
create policy book_issues_staff_all on book_issues for all using (is_staff()) with check (is_staff());
create policy book_issues_self_read on book_issues for select using (student_id in (
  select student_id from parent_students where parent_id = auth.uid()
) or teacher_id = auth.uid());

create policy documents_staff_all on documents for all using (is_staff()) with check (is_staff());
create policy documents_own_read on documents for select using (
  owner_id = auth.uid() or
  owner_id in (select student_id from parent_students where parent_id = auth.uid())
);
