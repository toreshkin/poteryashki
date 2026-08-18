"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ANIMAL_TYPE_LABELS,
  COMPLAINT_REASONS,
  Report,
  REPORT_TYPE_LABELS,
} from "@/lib/types";
import {
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  ImageIcon,
  MapPinIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
} from "@/components/Icons";
import { SITE_NAME } from "@/lib/config";

interface AdminReport extends Report {
  complaints: { id: string; reason: string; comment: string | null }[];
}

const REASON_LABELS = Object.fromEntries(
  COMPLAINT_REASONS.map((r) => [r.value, r.label])
);

type Tab = "attention" | "all" | "hidden";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("attention");
  const [query, setQuery] = useState("");

  const load = useCallback(async (pwd: string) => {
    setError(null);
    const res = await fetch("/api/admin", { headers: { "x-admin-password": pwd } });
    if (!res.ok) {
      setAuthed(false);
      setError(res.status === 401 ? "Неверный пароль" : "Ошибка сервера");
      return;
    }
    setReports(await res.json());
    setAuthed(true);
    sessionStorage.setItem("admin_password", pwd);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_password");
    if (saved) {
      setPassword(saved);
      load(saved);
    }
  }, [load]);

  const stats = useMemo(
    () => ({
      active: reports.filter((r) => r.status === "active").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      complaints: reports.filter((r) => r.complaints.length > 0).length,
      hidden: reports.filter((r) => r.status === "hidden").length,
    }),
    [reports]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (tab === "attention" && r.complaints.length === 0 && r.status !== "hidden")
        return false;
      if (tab === "hidden" && r.status !== "hidden") return false;
      if (q) {
        const hay = `${r.name ?? ""} ${r.description} ${r.landmarks ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, tab, query]);

  async function act(id: string, action: "hide" | "restore" | "delete") {
    if (action === "delete" && !confirm("Удалить заявку безвозвратно?")) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) load(password);
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-3.5 px-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white">
          <ShieldIcon size={22} />
        </span>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          Модерация
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(password)}
          placeholder="Пароль администратора"
          className="rounded-[15px] border-[1.5px] border-line bg-surface px-4 py-3.5 outline-none focus:border-ink"
        />
        {error && <p className="text-sm text-lost">{error}</p>}
        <button
          onClick={() => load(password)}
          className="rounded-[15px] bg-ink py-3.5 font-semibold text-white"
        >
          Войти
        </button>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    {
      id: "attention",
      label: "Требуют внимания",
      badge: stats.complaints + stats.hidden,
    },
    { id: "all", label: "Все заявки" },
    { id: "hidden", label: "Скрытые" },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
            <ShieldIcon size={19} />
          </span>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-semibold tracking-tight">
              Модерация
            </span>
            <span className="text-[12.5px] text-ink-3">{SITE_NAME} · Бишкек</span>
          </div>
        </div>
        <Link
          href="/"
          className="flex h-10 items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-4 text-[13.5px] font-semibold"
        >
          <MapPinIcon size={16} />К карте
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Активных", value: stats.active, tone: "" },
          { label: "Решено", value: stats.resolved, tone: "text-found" },
          { label: "Жалобы", value: stats.complaints, tone: "text-lost" },
          { label: "Скрыто", value: stats.hidden, tone: "" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1.5 rounded-[15px] border border-line-soft bg-surface px-4 py-3.5"
          >
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">
              {s.label}
            </span>
            <span className={`text-[26px] font-bold leading-none ${s.tone}`}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold ${
              tab === t.id
                ? "bg-ink text-white"
                : "border-[1.5px] border-line bg-surface text-ink-2"
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lost px-1.5 text-[11.5px] text-white">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
        <label className="ml-auto flex h-10 min-w-[200px] flex-1 items-center gap-2.5 rounded-xl border-[1.5px] border-line bg-surface px-3.5 sm:flex-none">
          <SearchIcon size={17} className="text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по заявкам"
            className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-ink-3"
          />
        </label>
      </div>

      <div className="space-y-2.5">
        {visible.length === 0 && (
          <p className="py-10 text-center text-ink-3">Здесь пусто</p>
        )}
        {visible.map((r) => {
          const flagged = r.complaints.length > 0;
          const hidden = r.status === "hidden";
          return (
            <div
              key={r.id}
              className={`flex flex-wrap items-center gap-4 rounded-2xl border p-3.5 ${
                flagged && !hidden
                  ? "border-[1.5px] border-[#F0D5CC] bg-[#FFF9F7]"
                  : hidden
                    ? "border-line-soft bg-[#F7F4EF]"
                    : "border-line-soft bg-surface"
              }`}
            >
              {r.photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.photos[0]}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted-tint text-ink-3">
                  <ImageIcon size={22} />
                </div>
              )}

              <div className="flex min-w-[180px] flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold">
                    {r.name ?? ANIMAL_TYPE_LABELS[r.animal_type]}
                  </span>
                  <span
                    className={`flex h-[21px] items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold ${
                      r.report_type === "lost"
                        ? "bg-lost-tint text-lost"
                        : "bg-found-tint text-found"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        r.report_type === "lost" ? "bg-lost" : "bg-found"
                      }`}
                    />
                    {REPORT_TYPE_LABELS[r.report_type]}
                  </span>
                  {flagged && (
                    <span className="flex h-[21px] items-center gap-1.5 rounded-full bg-lost-tint px-2.5 text-[11.5px] font-semibold text-lost">
                      <FlagIcon size={12} />
                      {r.complaints.length} жалоб ·{" "}
                      {REASON_LABELS[r.complaints[0].reason] ?? r.complaints[0].reason}
                    </span>
                  )}
                  {hidden && (
                    <span className="flex h-[21px] items-center rounded-full bg-muted-tint px-2.5 text-[11.5px] font-semibold text-ink-2">
                      Скрыта
                    </span>
                  )}
                  <span className="text-xs text-ink-3">
                    {new Date(r.created_at).toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="truncate text-[13.5px] text-ink-2">{r.description}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/pet/${r.id}`}
                  className="flex h-[38px] items-center rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[13.5px] font-semibold text-ink-2"
                >
                  Открыть
                </Link>
                {hidden ? (
                  <button
                    onClick={() => act(r.id, "restore")}
                    className="flex h-[38px] items-center gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3.5 text-[13.5px] font-semibold"
                  >
                    <EyeIcon size={16} />
                    Вернуть
                  </button>
                ) : (
                  <button
                    onClick={() => act(r.id, "hide")}
                    aria-label="Скрыть заявку"
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border-[1.5px] border-line bg-surface text-ink-2"
                  >
                    <EyeOffIcon size={18} />
                  </button>
                )}
                <button
                  onClick={() => act(r.id, "delete")}
                  aria-label="Удалить заявку"
                  className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-lost text-white"
                >
                  <TrashIcon size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
