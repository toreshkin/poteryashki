-- Кэш оценок совпадения заявок (чтобы не платить за повторные сравнения).
-- Выполнить в Supabase SQL Editor.

create table public.ai_matches (
  id uuid primary key default gen_random_uuid(),
  report_a uuid not null references public.reports (id) on delete cascade,
  report_b uuid not null references public.reports (id) on delete cascade,
  score int not null,
  reason text not null,
  provider text not null,
  created_at timestamptz not null default now(),
  -- пара хранится в отсортированном порядке, чтобы не дублировать сравнения
  constraint ordered_pair check (report_a < report_b),
  unique (report_a, report_b)
);

alter table public.ai_matches enable row level security;
