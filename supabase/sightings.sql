-- Отметки «Видел(а) его!» — выполнить в Supabase SQL Editor.

create table public.sightings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  comment text,
  seen_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index sightings_report_idx on public.sightings (report_id, created_at desc);

-- Доступ только через API-роуты (service_role), как и остальные таблицы.
alter table public.sightings enable row level security;
