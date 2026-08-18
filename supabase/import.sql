-- Импорт заявок из городских пабликов через Telegram-бота.
-- Скрипт идемпотентен: можно выполнять повторно.
-- Без него импорт работает, но без пометки источника и без защиты от дублей.

-- Откуда заявка: 'user' — подал человек сам, 'import' — перенесена из паблика.
alter table public.reports add column if not exists source text not null default 'user';
-- Откуда именно перенесена (название канала, автор поста).
alter table public.reports add column if not exists source_note text;

-- Черновики импорта: между сообщением с текстом и нажатием кнопки
-- «Опубликовать» проходит отдельный запрос от Telegram, состояние нужно хранить.
create table if not exists public.import_drafts (
  id uuid primary key default gen_random_uuid(),
  tg_user_id bigint not null,
  tg_chat_id bigint not null,
  raw_text text not null,
  text_hash text not null,
  parsed jsonb not null,
  photo_file_ids text[] not null default '{}',
  source_note text,
  lat double precision,
  lng double precision,
  status text not null default 'draft', -- draft | published | discarded
  report_id uuid references public.reports (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Поиск ранее присланного того же поста (предупреждение о дубле).
create index if not exists import_drafts_hash_idx
  on public.import_drafts (tg_user_id, text_hash);

-- Доступ только через сервер (service_role), как и у остальных таблиц.
alter table public.import_drafts enable row level security;
