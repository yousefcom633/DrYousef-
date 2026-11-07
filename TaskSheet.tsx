"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Flag, Flame, Plus, Trash2, X, Timer, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Category, Priority, RepeatType, Task } from "@/lib/types";
import { todayKey, uid } from "@/lib/utils";
import { askNotifPermission, haptic } from "@/lib/fx";
import { Btn, Chip, Field, IconBox, Segmented, Sheet, Stepper, Toggle, inputCls, StarGlyph, cx } from "./ui";
import { CATEGORY_ICONS, COLORS } from "./icons";

const blank = (categoryId: string, stars: number, preset?: Partial<Task>): Task => ({
  id: uid(), title: "", notes: "", date: todayKey(), time: "", remind: false, priority: "normal", stars, categoryId, subtasks: [],
  repeat: { type: "none", days: [], every: 2 }, pomos: 0, pomosDone: 0, done: false, paid: 0, archived: false, createdAt: new Date().toISOString(), ...preset,
});

export default function TaskSheet() {
  const { taskSheet, closeTask, data, t, fmt, saveTask, deleteTask, saveCategory, catName, toast, setTab, timerSetTask, timerSetKind } = useApp();
  const st = data.settings;
  const [f, setF] = useState<Task>(() => blank("study", 2));
  const [sub, setSub] = useState("");
  const [newCat, setNewCat] = useState<Category | null>(null);
  const editing = !!taskSheet.task;

  useEffect(() => {
    if (!taskSheet.open) return;
    setF(taskSheet.task ? structuredClone(taskSheet.task) : blank(data.categories[0]?.id ?? "study", st.starsMedium, taskSheet.preset));
    setSub("");
    setNewCat(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskSheet.open, taskSheet.task?.id]);

  const set = <K extends keyof Task>(k: K, v: Task[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.title.trim()) {
      toast(t("tasks.titleReq"));
      haptic("heavy");
      return;
    }
    const clean: Task = { ...f, title: f.title.trim(), remind: f.remind && !!f.date && !!f.time, notified: f.remind && taskSheet.task?.date === f.date && taskSheet.task?.time === f.time ? f.notified : false };
    saveTask(clean);
    if (!editing) toast(t("tasks.added"));
    haptic("success");
    closeTask();
  };

  const addSub = () => {
    if (!sub.trim()) return;
    set("subtasks", [...f.subtasks, { id: uid(), title: sub.trim(), done: false }]);
    setSub("");
  };

  const prios: { v: Priority; icon: typeof Flag; c: string }[] = [
    { v: "normal", icon: Flag, c: "#8E93A6" },
    { v: "important", icon: CircleAlert, c: "#FF9F0A" },
    { v: "urgent", icon: Flame, c: "#FF5A5F" },
  ];
  const diffs = [
    { k: "easy", n: st.starsEasy },
    { k: "medium", n: st.starsMedium },
    { k: "hard", n: st.starsHard },
  ];
  const days = [6, 0, 1, 2, 3, 4, 5];

  return (
    <Sheet
      open={taskSheet.open}
      onClose={closeTask}
      title={editing ? t("tasks.edit") : t("tasks.new")}
      footer={
        <div className="flex gap-3">
          {editing && (
            <>
              <Btn variant="danger" aria-label={t("delete")} onClick={() => { deleteTask(f.id); closeTask(); }}>
                <Trash2 size={18} />
              </Btn>
              <Btn variant="soft" aria-label={t("tasks.focusIt")} onClick={() => { timerSetKind("pomodoro"); timerSetTask(f.id); closeTask(); setTab("focus"); }}>
                <Timer size={18} />
              </Btn>
            </>
          )}
          <Btn className="flex-1" size="lg" onClick={submit}>{t("save")}</Btn>
        </div>
      }
    >
      <div className="space-y-5 pt-2">
        <input
          autoFocus={!editing}
          value={f.title}
          onChange={(e) => set("title", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("tasks.titlePh")}
          className={cx(inputCls, "!text-lg font-bold")}
          maxLength={120}
        />
        <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("tasks.notesPh")} rows={2} className={cx(inputCls, "min-h-[72px] resize-none py-3")} />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("tasks.date")}>
            <input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </Field>
          <Field label={t("tasks.time")}>
            <input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="flex min-h-12 items-center justify-between rounded-2xl bg-card px-4">
          <div className="flex items-center gap-3 font-bold"><IconBox icon="bell" color="#FF9F0A" size={32} />{t("tasks.remind")}</div>
          <Toggle
            on={f.remind}
            label={t("tasks.remind")}
            onChange={async (v) => {
              set("remind", v);
              if (v && typeof Notification !== "undefined" && Notification.permission === "default") await askNotifPermission();
              if (v && !f.time) toast(t("tasks.time"));
            }}
          />
        </div>

        <Field label={t("tasks.priority")}>
          <div className="grid grid-cols-3 gap-2">
            {prios.map((p) => {
              const on = f.priority === p.v;
              return (
                <button
                  key={p.v}
                  onClick={() => { haptic("light"); set("priority", p.v); }}
                  className="press flex min-h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold ring-2 transition"
                  style={{ background: on ? `${p.c}22` : "var(--card)", color: on ? p.c : "var(--muted)", ["--tw-ring-color" as string]: on ? p.c : "transparent" }}
                >
                  <p.icon size={17} />
                  {t(`prio.${p.v}`)}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={t("tasks.difficulty")}>
          <div className="grid grid-cols-3 gap-2">
            {diffs.map((d) => (
              <button
                key={d.k}
                onClick={() => { haptic("light"); set("stars", d.n); }}
                className={cx("press flex min-h-14 flex-col items-center justify-center rounded-2xl text-sm font-bold ring-2 transition", f.stars === d.n ? "bg-gold/15 ring-gold" : "bg-card ring-transparent text-muted")}
              >
                {t(`diff.${d.k}`)}
                <span className="flex items-center gap-0.5 text-xs text-gold-ink">{fmt(d.n)} <StarGlyph size={12} /></span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-2">
            <span className="text-sm font-bold text-muted">{t("diff.custom")}</span>
            <div className="flex items-center gap-2">
              <span className="flex">{Array.from({ length: f.stars }).map((_, i) => <StarGlyph key={i} size={14} />)}</span>
              <Stepper label={t("diff.custom")} value={f.stars} min={1} max={5} onChange={(n) => set("stars", n)} />
            </div>
          </div>
        </Field>

        <Field label={t("tasks.category")}>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {data.categories.map((c) => (
              <Chip key={c.id} active={f.categoryId === c.id} color={c.color} onClick={() => set("categoryId", c.id)}>
                {catName(c)}
              </Chip>
            ))}
            <Chip onClick={() => setNewCat({ id: uid(), name: "", color: COLORS[0], icon: "star" })}>
              <Plus size={15} />
            </Chip>
          </div>
          {newCat && (
            <div className="anim-pop space-y-3 rounded-2xl bg-card p-3">
              <input autoFocus value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder={t("cat.name")} className={inputCls} maxLength={20} />
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {COLORS.map((c) => (
                  <button key={c} aria-label={c} onClick={() => setNewCat({ ...newCat, color: c })} className="press grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: c }}>
                    {newCat.color === c && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                {CATEGORY_ICONS.map((ic) => (
                  <button key={ic} onClick={() => setNewCat({ ...newCat, icon: ic })} className={cx("press shrink-0 rounded-xl p-1 ring-2", newCat.icon === ic ? "ring-accent" : "ring-transparent")}>
                    <IconBox icon={ic} color={newCat.color} size={36} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Btn variant="ghost" className="flex-1" onClick={() => setNewCat(null)}>{t("cancel")}</Btn>
                <Btn
                  className="flex-1"
                  onClick={() => {
                    if (!newCat.name.trim()) return;
                    saveCategory({ ...newCat, name: newCat.name.trim() });
                    set("categoryId", newCat.id);
                    setNewCat(null);
                  }}
                >
                  {t("add")}
                </Btn>
              </div>
            </div>
          )}
        </Field>

        <Field label={t("tasks.subtasks")}>
          <div className="space-y-2">
            {f.subtasks.map((s) => (
              <div key={s.id} className="flex min-h-11 items-center gap-2 rounded-2xl bg-card ps-2 pe-1">
                <button
                  aria-label={s.title}
                  onClick={() => set("subtasks", f.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                  className={cx("press grid h-6 w-6 shrink-0 place-items-center rounded-full border-2", s.done ? "border-ok bg-ok text-white" : "border-muted/50")}
                >
                  {s.done && <Check size={14} strokeWidth={3} />}
                </button>
                <span className={cx("flex-1 text-[15px]", s.done && "text-muted line-through")}>{s.title}</span>
                <button aria-label={t("delete")} onClick={() => set("subtasks", f.subtasks.filter((x) => x.id !== s.id))} className="press grid h-10 w-10 place-items-center text-muted">
                  <X size={16} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSub()} placeholder={t("tasks.subPh")} className={inputCls} />
              <Btn variant="soft" aria-label={t("add")} onClick={addSub}><Plus size={20} /></Btn>
            </div>
          </div>
        </Field>

        <Field label={t("tasks.repeat")}>
          <Segmented<RepeatType>
            value={f.repeat.type}
            onChange={(v) => set("repeat", { ...f.repeat, type: v })}
            options={(["none", "daily", "weekly", "monthly", "custom"] as RepeatType[]).map((v) => ({ value: v, label: t(`rep.${v}`) }))}
          />
          {f.repeat.type === "weekly" && (
            <div className="anim-pop flex flex-wrap gap-1.5 pt-1">
              {days.map((d) => {
                const on = f.repeat.days.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => set("repeat", { ...f.repeat, days: on ? f.repeat.days.filter((x) => x !== d) : [...f.repeat.days, d] })}
                    className={cx("press min-h-10 flex-1 rounded-xl px-1.5 text-xs font-bold", on ? "grad-accent text-white" : "bg-card text-muted")}
                  >
                    {t(`day.${d}`)}
                  </button>
                );
              })}
            </div>
          )}
          {f.repeat.type === "custom" && (
            <div className="anim-pop flex items-center justify-between rounded-2xl bg-card px-4 py-2">
              <span className="text-sm font-bold">{t("rep.every", { n: fmt(f.repeat.every) })}</span>
              <Stepper label={t("rep.custom")} value={f.repeat.every} min={2} max={60} onChange={(n) => set("repeat", { ...f.repeat, every: n })} />
            </div>
          )}
        </Field>

        <Field label={t("tasks.pomos")}>
          <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-2">
            <span className="text-sm font-bold text-muted">{t("tasks.pomosHint")}</span>
            <Stepper label={t("tasks.pomos")} value={f.pomos} min={0} max={12} onChange={(n) => set("pomos", n)} />
          </div>
        </Field>
      </div>
    </Sheet>
  );
}
