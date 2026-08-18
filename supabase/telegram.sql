-- Привязка заявок к Telegram-аккаунту автора (Mini App).
-- Скрипт идемпотентен: можно выполнять повторно.
-- tg_user_id — кто создал заявку (для «моих заявок» и закрытия без кода),
-- tg_chat_id — куда бот шлёт уведомления (личный чат с ботом).

alter table public.reports add column if not exists tg_user_id bigint;
alter table public.reports add column if not exists tg_chat_id bigint;

create index if not exists reports_tg_user_id_idx
  on public.reports (tg_user_id)
  where tg_user_id is not null;
