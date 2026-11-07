"use client";

import { useRef, useState } from "react";
import { Archive, Check, CheckCircle2, ListChecks, Pencil, RotateCcw, Timer, Trash2, Flame, CircleAlert } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/types";
import { addDays, todayKey } from "@/lib/utils";
import { haptic, rectCenter } from "@/lib/fx";
import { StarGlyph, cx } from "./ui";
import { ICONS } from "./icons";

export default function TaskRow({ task, compact }: { task: Task; compact?: boolean }) {
  const { dir, t, fmt, fmtDate, data, catName, toggleTask, openTask, deleteTask, archiveTask, setTab, timerSetTask, timerSetKind } = useApp();
  const cat = data.categories.find((c) => c.id === task.categoryId);
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const st = useRef({ sx: 0, sy: 0, lock: false, moved: false, base: 0, id: -1 });
  const checkRef = useRef<HTMLButtonElement>(null);

  const actions = [
    !task.done && !task.archived && { k: "focus", icon: Timer, c: "#6C63FF", label: t("tasks.focusIt"), fn: () => { timerSetKind("pomodoro"); timerSetTask(task.id); setTab("focus"); } },
    { k: "edit", icon: Pencil, c: "#5B8CFF", label: t("edit"), fn: () => openTask(task) },
    (task.done || task.archived) && { k: "arch", icon: task.archived ? RotateCcw : Archive, c: "#FF9F0A", label: task.archived ? t("tasks.restore") : t("tasks.archive"), fn: () => archiveTask(task.id, !task.archived) },
    { k: "del", icon: Trash2, c: "#FF5A5F", label: t("delete"), fn: () => deleteTask(task.id) },
  ].filter(Boolean) as { k: string; icon: typeof Timer; c: string; label: string; fn: () => void }[];
  const W = actions.length * 60;

  const complete = () => {
    haptic("light");
    toggleTask(task.id, rectCenter(checkRef.current));
  };

  const down = (e: React.PointerEvent) => {
    st.current = { sx: e.clientX, sy: e.clientY, lock: false, moved: false, base: x, id: e.pointerId };
  };
  const move = (e: React.PointerEvent) => {
    const s = st.current;
    if (s.id !== e.pointerId) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!s.lock) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        s.lock = true;
        setDrag(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 10) s.id = -1;
      else return;
    }
    s.moved = true;
    const nx = Math.max(-W - 20, Math.min(140, s.base + dx));
    setX(nx);
  };
  const up = () => {
    const s = st.current;
    if (!s.lock) return;
    setDrag(false);
    s.id = -1;
    if (x > 90) {
      setX(0);
      if (!task.archived) complete();
    } else if (x < -50) setX(-W);
    else setX(0);
  };

  const today = todayKey();
  const overdue = !task.done && task.date && task.date < today;
  const dateLabel = !task.date ? "" : task.date === today ? "" : task.date === addDays(today, 1) ? t("tasks.tomorrow") : fmtDate(task.date);
  const subDone = task.subtasks.filter((s) => s.done).length;
  const CatIcon = ICONS[cat?.icon ?? "star"];
  const prioColor = task.priority === "urgent" ? "#FF5A5F" : task.priority === "important" ? "#FF9F0A" : "";

  return (
    <div className="relative overflow-hidden rounded-3xl" dir="ltr">
      {/* behind: complete */}
      <div className="absolute inset-y-0 left-0 flex w-1/2 items-center ps-6 text-white" style={{ background: "linear-gradient(90deg,#34C759,#5FD97F)", opacity: x > 8 ? 1 : 0 }}>
        <CheckCircle2 size={28} style={{ transform: `scale(${Math.min(1.2, 0.6 + x / 150)})` }} />
      </div>
      {/* behind: actions */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: W }}>
        {actions.map((a) => (
          <button
            key={a.k}
            aria-label={a.label}
            title={a.label}
            tabIndex={x < -20 ? 0 : -1}
            onClick={() => { setX(0); a.fn(); }}
            className="grid flex-1 place-items-center text-white"
            style={{ background: a.c }}
          >
            <a.icon size={21} />
          </button>
        ))}
      </div>
      <div
        dir={dir}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => {
          if (st.current.moved) { st.current.moved = false; return; }
          if (x !== 0) setX(0);
          else openTask(task);
        }}
        style={{ transform: `translateX(${x}px)`, transition: drag ? "none" : "transform .4s cubic-bezier(.2,1,.3,1)", touchAction: "pan-y" }}
        className={cx("relative flex cursor-pointer items-center gap-3 rounded-3xl bg-card p-3 ps-3.5 card-shadow", task.done && "opacity-75")}
      >
        <button
          ref={checkRef}
          aria-label={task.done ? t("tasks.markUndone") : t("a11y.complete")}
          aria-pressed={task.done}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); complete(); }}
          className="press -m-2 grid h-11 w-11 shrink-0 place-items-center"
        >
          <span
            className={cx("grid h-[26px] w-[26px] place-items-center rounded-full border-2 transition-all duration-300", task.done ? "border-ok bg-ok" : "")}
            style={!task.done ? { borderColor: cat?.color ?? "#6C63FF" } : undefined}
          >
            {task.done && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path className="check-path" d="M2.5 7.5l3 3 6-7" />
              </svg>
            )}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {prioColor && (task.priority === "urgent" ? <Flame size={15} style={{ color: prioColor }} className="shrink-0" /> : <CircleAlert size={15} style={{ color: prioColor }} className="shrink-0" />)}
            <div className={cx("truncate text-[16px] font-bold", task.done && "text-muted line-through")}>{task.title}</div>
          </div>
          {!compact && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-muted">
              {cat && (
                <span className="flex items-center gap-1" style={{ color: cat.color }}>
                  <CatIcon size={12} strokeWidth={2.4} />
                  {catName(cat)}
                </span>
              )}
              {(task.time || dateLabel) && (
                <span className={cx(overdue && "text-danger")}>
                  {overdue ? `${t("today.overdue")} · ` : ""}
                  {dateLabel}
                  {dateLabel && task.time ? " " : ""}
                  {task.time && fmt(task.time)}
                </span>
              )}
              {task.subtasks.length > 0 && (
                <span className="flex items-center gap-0.5"><ListChecks size={12} />{fmt(`${subDone}/${task.subtasks.length}`)}</span>
              )}
              {task.pomos > 0 && <span className="flex items-center gap-0.5"><Timer size={12} />{fmt(`${task.pomosDone}/${task.pomos}`)}</span>}
              {task.repeat.type !== "none" && <RotateCcw size={11} />}
            </div>
          )}
        </div>
        <div className={cx("flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1 text-[13px] font-extrabold", task.done ? "bg-ok/15 text-ok" : "bg-gold/15 text-gold-ink")}>
          {task.done ? <Check size={13} strokeWidth={3} /> : <span>+{fmt(task.stars)}</span>}
          <StarGlyph size={13} />
        </div>
      </div>
    </div>
  );
}
