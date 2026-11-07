"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, Search, Trash2, X } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Priority, Task } from "@/lib/types";
import { addDays, priorityRank, sortSmart, todayKey, weekDays, weekStart, parseKey } from "@/lib/utils";
import { Btn, Card, Chip, Empty, Page, Segmented, cx, inputCls } from "../ui";
import TaskRow from "../TaskRow";

type Filter = "all" | "today" | "upcoming" | "done" | "archived";
type Sort = "smart" | "date" | "priority" | "stars";

export default function Tasks() {
  const { t, fmt, fmtDate, data, catName, openTask, clearArchive, dir } = useApp();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState("");
  const [prio, setPrio] = useState<"" | Priority>("");
  const [sort, setSort] = useState<Sort>("smart");
  const [view, setView] = useState<"list" | "cal">("list");
  const [ws, setWs] = useState(weekStart());
  const [day, setDay] = useState(todayKey());
  const today = todayKey();

  const filtered = useMemo(() => {
    let l: Task[] = data.tasks;
    if (view === "cal") l = l.filter((x) => !x.archived && x.date === day);
    else {
      l = l.filter((x) => {
        if (filter === "archived") return x.archived;
        if (x.archived) return false;
        if (filter === "today") return x.date === today;
        if (filter === "upcoming") return x.date > today && !x.done;
        if (filter === "done") return x.done;
        return true;
      });
    }
    if (cat) l = l.filter((x) => x.categoryId === cat);
    if (prio) l = l.filter((x) => x.priority === prio);
    const qq = q.trim().toLowerCase();
    if (qq) l = l.filter((x) => x.title.toLowerCase().includes(qq) || x.notes.toLowerCase().includes(qq));
    const cmp: Record<Sort, (a: Task, b: Task) => number> = {
      smart: (a, b) => Number(a.done) - Number(b.done) || sortSmart(a, b),
      date: (a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "").localeCompare(b.time || ""),
      priority: (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || sortSmart(a, b),
      stars: (a, b) => b.stars - a.stars,
    };
    return [...l].sort(filter === "done" && view === "list" ? (a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? "") : cmp[sort]);
  }, [data.tasks, filter, cat, prio, q, sort, view, day, today]);

  const days = weekDays(ws);
  const count = (k: string) => data.tasks.filter((x) => !x.archived && x.date === k);
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;
  const filters: Filter[] = ["all", "today", "upcoming", "done", "archived"];

  return (
    <Page title={t("tasks.title")}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted start-4" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("tasks.searchPh")} className={cx(inputCls, "!ps-11 !pe-11")} aria-label={t("search")} />
        {q && (
          <button aria-label={t("close")} onClick={() => setQ("")} className="absolute top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-muted end-1">
            <X size={16} />
          </button>
        )}
      </div>

      <Segmented
        className="mt-3"
        value={view}
        onChange={setView}
        options={[
          { value: "list", label: <span className="flex items-center justify-center gap-1.5"><List size={15} />{t("tasks.list")}</span> },
          { value: "cal", label: <span className="flex items-center justify-center gap-1.5"><CalendarDays size={15} />{t("tasks.calendar")}</span> },
        ]}
      />

      {view === "list" ? (
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {filters.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{t(`tasks.f.${f}`)}</Chip>
          ))}
        </div>
      ) : (
        <Card className="mt-3 p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <button aria-label={t("back")} onClick={() => setWs(addDays(ws, -7))} className="press grid h-10 w-10 place-items-center rounded-full bg-card2"><Prev size={18} /></button>
            <div className="text-sm font-extrabold">{fmtDate(days[0], { day: "numeric", month: "short" })} – {fmtDate(days[6], { day: "numeric", month: "short" })}</div>
            <button aria-label={t("next")} onClick={() => setWs(addDays(ws, 7))} className="press grid h-10 w-10 place-items-center rounded-full bg-card2"><Next size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((k) => {
              const n = count(k);
              const sel = k === day;
              return (
                <button
                  key={k}
                  onClick={() => setDay(k)}
                  className={cx("press flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-2xl", sel ? "grad-accent text-white shadow-md" : k === today ? "bg-accent/12 text-accent" : "text-ink")}
                >
                  <span className="text-[11px] font-bold opacity-80">{fmtDate(k, { weekday: "short" })}</span>
                  <span className="text-lg font-black">{fmt(parseKey(k).getDate())}</span>
                  <span className="flex h-1.5 gap-0.5">
                    {n.slice(0, 3).map((x) => <i key={x.id} className={cx("h-1.5 w-1.5 rounded-full", x.done ? "bg-ok" : sel ? "bg-white" : "bg-accent")} />)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-center">
            <button onClick={() => { setWs(weekStart()); setDay(today); }} className="press min-h-9 rounded-full px-4 text-xs font-bold text-accent">{t("tasks.today")}</button>
          </div>
        </Card>
      )}

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        <Chip active={!cat} onClick={() => setCat("")}>{t("tasks.allCats")}</Chip>
        {data.categories.map((c) => (
          <Chip key={c.id} active={cat === c.id} color={c.color} onClick={() => setCat(cat === c.id ? "" : c.id)}>{catName(c)}</Chip>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select aria-label={t("tasks.priority")} value={prio} onChange={(e) => setPrio(e.target.value as Priority | "")} className={cx(inputCls, "!min-h-11 text-sm font-bold")}>
          <option value="">{t("tasks.allPrio")}</option>
          {(["urgent", "important", "normal"] as Priority[]).map((p) => <option key={p} value={p}>{t(`prio.${p}`)}</option>)}
        </select>
        <select aria-label={t("tasks.sort")} value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={cx(inputCls, "!min-h-11 text-sm font-bold")}>
          {(["smart", "date", "priority", "stars"] as Sort[]).map((s) => <option key={s} value={s}>{t("tasks.sort")}: {t(`tasks.sort.${s}`)}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {view === "cal" && <div className="px-1 text-sm font-bold text-muted">{t("tasks.dayTasks")} · {fmtDate(day, { weekday: "long", day: "numeric", month: "long" })}</div>}
        {filtered.length === 0 ? (
          <Card>
            {q || cat || prio ? (
              <Empty icon="search" title={t("tasks.noResults")} sub={t("tasks.noResultsSub")} />
            ) : (
              <Empty icon="listChecks" title={t("tasks.empty")} sub={t("tasks.emptySub")} action={<Btn onClick={() => openTask(undefined, view === "cal" ? { date: day } : undefined)}>{t("tasks.new")}</Btn>} />
            )}
          </Card>
        ) : (
          <>
            {filtered.map((x) => <TaskRow key={x.id} task={x} />)}
            {filter === "archived" && view === "list" && (
              <Btn variant="danger" className="w-full" onClick={clearArchive}><Trash2 size={16} />{t("tasks.clearArchive")}</Btn>
            )}
            <p className="pt-1 text-center text-xs text-muted">{t("tasks.swipeHint")}</p>
          </>
        )}
      </div>
    </Page>
  );
}
