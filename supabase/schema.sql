create extension if not exists pgcrypto;

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_code text not null default 'DSA-MIDTERM-60',
  student_id text not null,
  full_name text not null,
  section text not null,
  access_token_hash text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  objective_score integer,
  manual_score integer,
  instructor_feedback text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'graded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_attempt_per_student unique (exam_code, student_id),
  constraint objective_score_range check (objective_score between 0 and 50),
  constraint manual_score_range check (manual_score between 0 and 50)
);

create index if not exists exam_attempts_status_idx
  on public.exam_attempts (status);
create index if not exists exam_attempts_section_idx
  on public.exam_attempts (section);
create index if not exists exam_attempts_submitted_idx
  on public.exam_attempts (submitted_at desc);

alter table public.exam_attempts enable row level security;
revoke all on table public.exam_attempts from anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists exam_attempts_set_updated_at on public.exam_attempts;
create trigger exam_attempts_set_updated_at
before update on public.exam_attempts
for each row execute function public.set_updated_at();
