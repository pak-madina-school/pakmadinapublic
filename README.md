# Pak Madina Public School — Syllabus Tracker

A focused, runnable app: **Syllabus Tracking only**, with real Supabase auth,
9 subjects, and separate logins for up to 13 teachers. You (Super Admin) can
create/disable/reset-password on every account and see and edit every
teacher's syllabus. Teachers only see their own assigned classes/sections/subjects.

## What's in this build

- **Auth**: real Supabase email/password logins. Roles: `superadmin`, `admin`, `teacher`, `parent` (parent isn't used by this trimmed build, but the column exists for later).
- **Teacher Accounts** screen (Super Admin only): create a teacher, assign them to class + section + subject, disable/enable, reset password, delete.
- **Syllabus Tracking** module: chapters, topics, pending/in-progress/completed tracking, progress dashboards (teacher-wise, class-wise, subject-wise), monthly/weekly trend, and an AI syllabus-prediction tab.
- Data: 10 classes (Nursery–Class 8, each with a default Section A — add more sections any time from the Supabase table if needed), 9 subjects (English, Urdu, Sindhi, Mathematics, Science, Social Studies, Islamiat, Computer Science, Nazra-e-Quran).
- Everything else from the earlier, bigger scope (fees, salary, library, documents, attendance, homework, exams UI) still has database tables and RLS from the earlier migrations, but **no screens** — this build deliberately only mounts Syllabus Tracking + Teacher Accounts, per your last request.

## 1. Create your Supabase project

1. Go to supabase.com → New project. Note your **Project URL** and **anon public key** (Settings → API) — you'll need these in step 3.

## 2. Run the database migrations

In your Supabase project → **SQL Editor**, run these files **in order**, each as its own query:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_auto_provisioning.sql`
4. `supabase/migrations/0004_fees_salary_library_docs.sql` *(safe to run — just adds unused tables for later)*
5. `supabase/migrations/0005_syllabus_tracking.sql`
6. `supabase/migrations/0006_seed_school_data.sql` *(adds your 10 classes, sections, 9 subjects)*

## 3. Deploy the edge functions

You need the Supabase CLI (`npm install -g supabase`) logged in and linked to your project (`supabase link --project-ref <your-ref>`), then:

```
supabase functions deploy admin-manage-account
supabase functions deploy ai-generate
```

For the AI Prediction tab, set your Anthropic key as a function secret:
```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## 4. Create your own Super Admin login

The app can't create the *first* account for you (chicken-and-egg — account
creation requires an existing Super Admin). Do this once, manually:

1. Supabase Dashboard → **Authentication → Users → Add user** → enter your email + a password, tick "Auto Confirm User".
2. Go to **SQL Editor** and run (replace with your email):
   ```sql
   update profiles set role = 'superadmin', full_name = 'Naseer Ahmed Laghari'
   where email = 'you@pakmadinaschool.pk';
   ```
3. That's your login. From here, use the **Teacher Accounts** tab in the app to create your 13 teacher logins — no more manual SQL needed.

## 5. Configure and run the app

```
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Settings → API.

```
npm install
npm run dev
```
Open http://localhost:5173 and sign in with the Super Admin account you created in step 4.

## Known, pre-existing gap (not part of this pass)

`npm run build` (which runs `tsc -b`) currently fails — the hand-written
`src/types/database.ts` doesn't line up with what `@supabase/supabase-js`'s
generics expect, so several `src/api/*.ts` files show type errors. This
predates this Syllabus Tracker pass and doesn't affect `npm run dev` (Vite
doesn't type-check), so the app runs fine day to day. Worth fixing before a
real production build — happy to take it on whenever you want.
