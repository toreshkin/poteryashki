# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Что это

«Потеряшки» — карта потерявшихся и найденных животных, стартовый город Бишкек
(`CITY_CENTER` в `lib/config.ts`). Next.js App Router + Supabase + Leaflet,
mobile-first, работает как Telegram Mini App и устанавливается как PWA.

**Весь текст интерфейса — на русском.** Комментарии в коде тоже.

## Команды

```bash
npm run dev      # разработка (сервис-воркер выключен, индикатор Next скрыт)
npm run build    # сборка + проверка типов
npm start        # production-сервер: только так работает PWA/сервис-воркер
npm run lint     # eslint
```

Тестов в проекте нет. Проверка — сборкой и прогоном сценариев через API
(`curl`/`Invoke-RestMethod` по роутам `/api/...`) на запущенном сервере.

## Переменные окружения (`.env.local`)

| Переменная | Зачем |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase, **без** `/rest/v1/` |
| `SUPABASE_SERVICE_ROLE_KEY` | секретный ключ (`sb_secret_…`), только сервер |
| `ADMIN_PASSWORD` | вход в `/admin` |
| `AI_PROVIDER` | `off` (по умолчанию) \| `mock` \| `gemini` \| `deepseek` \| `claude` |
| `GEMINI_API_KEY` / `DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` | под выбранного провайдера |

## Архитектура

### Доступ к данным — только через сервер

RLS включён **без политик**, поэтому анонимный клиент не может ничего прочитать.
Единственный путь к БД — `getServiceClient()` из `lib/supabase.ts` внутри
API-роутов и серверных компонентов. Клиентского Supabase-клиента в проекте нет
и заводить его не нужно: любая новая работа с данными — это новый роут в
`app/api/`.

Публичные выборки всегда перечисляют поля явно (`PUBLIC_FIELDS`), чтобы
`secret_code_hash` не утёк наружу.

### Схема БД применяется вручную

`supabase/*.sql` — не миграции, а скрипты для SQL Editor: `schema.sql`
(reports, complaints, bucket), `sightings.sql`, `ai.sql`, `seed.sql`.
Инструмента миграций нет. Добавляя таблицу, добавьте новый `.sql` и скажите
пользователю выполнить его — код должен переживать отсутствие таблицы без
падения (пример: кэш в `app/api/reports/[id]/match/route.ts` логирует ошибку
записи и продолжает работать).

### Владение заявкой без регистрации

Аутентификации нет. При создании заявки генерируется код из 6 символов,
показывается автору один раз, в БД лежит только `sha256` (`lib/rate-limit.ts`).
Закрытие заявки — `POST /api/reports/[id]/resolve` с этим кодом.

### Постмодерация

Заявка видна сразу. `POST /api/reports/[id]/complain` пишет в `complaints`
(одна жалоба на IP-хэш), при `AUTO_HIDE_COMPLAINTS` жалобах статус меняется на
`hidden`. `/admin` авторизуется заголовком `x-admin-password`; восстановление
заявки чистит её жалобы, иначе она скроется снова.

Анти-спам: rate-limit по IP (`lib/rate-limit.ts`) — **in-memory, на процесс**,
сбрасывается при деплое и не общий между инстансами. Плюс honeypot-поле
`website` в форме.

### ИИ — опциональный слой

`getAiProvider()` в `lib/ai/index.ts` возвращает `null`, когда `AI_PROVIDER=off`;
тогда роуты отвечают 503, а UI прячет кнопки через `useAiStatus()`. Провайдер
за интерфейсом `AiProvider` (`lib/ai/types.ts`): `describePhoto`,
`compareReports`, `parseSearchQuery`. `mock` отвечает без сети и без затрат —
им проверяют интерфейс.

Ответы моделей ненадёжны, поэтому всё проходит через `lib/ai/normalize.ts`.
DeepSeek не видит изображения (`vision: false`) — код обязан это учитывать.
ИИ вызывается только по нажатию кнопки, оценки совпадений кэшируются в
`ai_matches`.

### Карта: только на клиенте

Leaflet ломается на сервере, поэтому `Map`, `LocationPicker`, `SightingsMap`
подключаются через `dynamic(..., { ssr: false })`. Маркеры — `L.divIcon` с
HTML-строкой, поэтому иконки для них берутся из строковых функций
`animalIconMarkup()` / `*_MARKUP` в `components/Icons.tsx`, а не из React-компонентов.

### Дизайн-система

Токены — CSS-переменные в `app/globals.css`, проброшены в Tailwind v4 через
`@theme inline`: `bg-paper`, `bg-surface`, `text-ink` / `text-ink-2` / `text-ink-3`,
`border-line`, `bg-lost` / `bg-lost-tint`, `bg-found`, `bg-sight`, `bg-ai`.
Цвета в компонентах берите оттуда, а не хардкодом.

Шрифты подключены в `app/layout.tsx` через `next/font`: `font-sans` (Golos Text)
и `font-serif` (Literata, только заголовки).

**Эмодзи как иконки не используются** — весь набор в `components/Icons.tsx`
(штрих 1.6, сетка 24px). Статус всегда показывается точкой + подписью
(`components/StatusBadge.tsx`), а не одним цветом.

### Общая логика экранов

Карта (`MapView`) и лента (`FeedView`) используют один набор фильтров
(`components/Filters.tsx`) и одну функцию отбора (`lib/filter.ts`) — правьте
поведение там, чтобы экраны не разъезжались.

Тип заявки выбирается **до** формы: `EntryButtons` ведут на
`/report?type=lost|found`, форма получает его пропсом и имеет 4 шага
(Фото → Приметы → Где → Контакты).

### PWA

Манифест генерируется в `app/manifest.ts`, иконки в `public/icons`.
`components/ServiceWorker.tsx` регистрирует `public/sw.js` **только в
production**. Стратегия: оболочка и статика из кэша, `/api/*` — всегда из сети
(устаревшие заявки хуже, чем их отсутствие), офлайн-заглушка `/offline`.

### Telegram Mini App

Скрипт Telegram грузится в `app/layout.tsx`; `suppressHydrationWarning` на
`<html>` стоит намеренно — скрипт дописывает свои CSS-переменные до гидратации.
`initTelegram()` (`lib/telegram.ts`) разворачивает окно и подставляет
`@username` в контакты.

## Прочее

`design/` — исходники дизайн-макетов (`.dc.html` + `canvas.json`) для
опубликованного полотна; в сборку приложения не входят.
