-- Гео-поиск «похожие рядом» на стороне БД (earthdistance + GiST-индекс).
-- Скрипт идемпотентен: можно выполнять повторно.
-- Пока скрипт не выполнен, код использует медленный JS-fallback (lib/similar.ts).

create extension if not exists cube;
create extension if not exists earthdistance;

create index if not exists reports_earth_idx
  on public.reports using gist (ll_to_earth(lat, lng));

create index if not exists reports_similar_idx
  on public.reports (status, report_type, animal_type);

-- Активные заявки заданного типа и вида в радиусе, ближайшие первыми.
create or replace function public.similar_reports(
  p_lat double precision,
  p_lng double precision,
  p_report_type report_type,
  p_animal_type animal_type,
  p_radius_km double precision default 3,
  p_limit integer default 5
)
returns table (
  id uuid,
  created_at timestamptz,
  report_type report_type,
  animal_type animal_type,
  name text,
  description text,
  landmarks text,
  lat double precision,
  lng double precision,
  photos text[],
  status report_status,
  event_date date,
  distance_km double precision
)
language sql
stable
as $$
  select
    r.id, r.created_at, r.report_type, r.animal_type, r.name, r.description,
    r.landmarks, r.lat, r.lng, r.photos, r.status, r.event_date,
    earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(r.lat, r.lng)) / 1000.0
      as distance_km
  from public.reports r
  where r.status = 'active'
    and r.report_type = p_report_type
    and r.animal_type = p_animal_type
    -- earth_box отсекает по индексу, earth_distance уточняет по кругу
    and earth_box(ll_to_earth(p_lat, p_lng), p_radius_km * 1000.0)
        @> ll_to_earth(r.lat, r.lng)
    and earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(r.lat, r.lng))
        <= p_radius_km * 1000.0
  order by distance_km
  limit p_limit;
$$;
