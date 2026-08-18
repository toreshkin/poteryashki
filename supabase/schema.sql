-- Схема БД сервиса «Потеряшки». Выполнить в Supabase SQL Editor.

create type report_type as enum ('lost', 'found');
create type animal_type as enum ('dog', 'cat', 'other');
create type report_status as enum ('active', 'resolved', 'hidden');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  report_type report_type not null,
  animal_type animal_type not null,
  name text,
  description text not null,
  landmarks text,
  lat double precision not null,
  lng double precision not null,
  photos text[] not null default '{}',
  contact_phone text,
  contact_telegram text,
  status report_status not null default 'active',
  secret_code_hash text not null,
  event_date date not null default current_date,
  constraint has_contact check (contact_phone is not null or contact_telegram is not null)
);

create index reports_status_created_idx on public.reports (status, created_at desc);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  reason text not null,
  comment text,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  unique (report_id, ip_hash)
);

-- Доступ к данным только через API-роуты Next.js (service_role).
-- RLS включён, политик для anon нет — прямой доступ с клиента закрыт.
alter table public.reports enable row level security;
alter table public.complaints enable row level security;

-- Публичный бакет для фотографий (чтение по URL, запись только через сервер).
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;
