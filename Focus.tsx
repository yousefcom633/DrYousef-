"use client";

import { useMemo, useState } from "react";
import { Check, Expand, Minimize2, Pause, Play, Plus, RotateCcw, SkipForward, Lightbulb, X, ChevronDown } from "lucide-react";
import { useApp, useNow, timerElapsedMs, timerRemainingMs } from "@/lib/store";
import { isoKey, todayKey, weekStart } from "@/lib/utils";
import { Btn, Card, Chip, Page, Ring, Segmented, SectionTitle, Sheet, Wheel, cx, inputCls, IconBox } from "../ui";

function useClock() {
  const { data, fmt } = useApp();
  const tm = data.timer;
  const now = useNow(tm.status === "running", 200);
  const elapsed = timerElapsedMs(tm, now);
  const count = tm.kind !== "stopwatch";
  const ms = count ? Math.max(0, timerRemainingMs(tm, now)) : elapsed;
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = fmt(h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`);
  const progress = count ? (tm.durationSec ? elapsed / (tm.durationSec * 1000) : 0) : (elapsed % 3600000) / 3600000;
  return { text, progress, tm };
}

function Controls({ big }: { big?: boolean }) {
  const { t, timerStart, timerPause, timerReset, timerAdjust, timerSkip, data } = useApp();
  const tm = data.timer;
  const running = tm.status === "running";
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <button aria-label={t("focus.reset")} onClick={timerReset} disabled={tm.status === "idle"} className={cx("press grid h-14 w-14 place-items-center rounded-full disabled:opacity-35", big ? "bg-white/15 text-white" : "bg-card2")}>
          <RotateCcw size={22} />
        </button>
        <button
          aria-label={running ? t("focus.pause") : tm.status === "paused" ? t("focus.resume") : t("focus.start")}
          onClick={running ? timerPause : timerStart}
          className={cx("press grid h-[76px] w-[76px] place-items-center rounded-full text-white shadow-xl", big ? "bg-white/25 backdrop-blur" : tm.phase !== "focus" && tm.kind === "pomodoro" ? "bg-ok" : "grad-accent")}
        >
          {running ? <Pause size={32} className="fill-white" /> : <Play size={32} className="fill-white rtl:scale-x-[-1]" />}
        </button>
        {tm.kind === "pomodoro" ? (
          <button aria-label={t("focus.skip")} onClick={timerSkip} className={cx("press grid h-14 w-14 place-items-center rounded-full", big ? "bg-white/15 text-white" : "bg-card2")}>
            <SkipForward size={22} className="rtl:scale-x-[-1]" />
          </button>
        ) : (
          <div className="h-14 w-14" />
        )}
      </div>
      {tm.kind !== "stopwatch" && (
        <div className="flex gap-3">
          <button onClick={() => timerAdjust(-5)} className={cx("press min-h-11 rounded-full px-5 text-sm font-extrabold", big ? "bg-white/15 text-white" : "bg-card2")}>{t("focus.minus5")}</button>
          <button onClick={() => timerAdjust(5)} className={cx("press min-h-11 rounded-full px-5 text-sm font-extrabold", big ? "bg-white/15 text-white" : "bg-card2")}>{t("focus.plus5")}</button>
        </div>
      )}
    </div>
  );
}

function DeepFocus() {
  const { t, data, setDeepFocus } = useApp();
  const { text, progress, tm } = useClock();
  const brk = tm.kind === "pomodoro" && tm.phase !== "focus";
  const task = data.tasks.find((x) => x.id === tm.taskId);
  return (
    <div
      className="anim-fade fixed inset-0 z-[70] flex flex-col items-center justify-between px-6 pt-[calc(24px+var(--safe-t))] pb-[calc(32px+var(--safe-b))] text-white"
      style={{ background: brk ? "linear-gradient(160deg,#0f3d33,#0a1f2e)" : "linear-gradient(160deg,#2a2370,#0e0f14)" }}
    >
      <button onClick={() => setDeepFocus(false)} className="press flex min-h-11 items-center gap-2 self-end rounded-full bg-white/15 px-4 text-sm font-bold">
        <Minimize2 size={16} /> {t("focus.exitDeep")}
      </button>
      <div className="flex flex-col items-center gap-6">
        <div className="text-sm font-bold tracking-wide opacity-80">{tm.kind === "pomodoro" ? t(`focus.phase.${tm.phase}`) : t(tm.kind === "timer" ? "focus.countdown" : "focus.stopwatch")}</div>
        <Ring size={290} stroke={10} progress={progress} colors={brk ? ["#7CF2C4", "#34C759"] : ["#C9C4FF", "#8F86FF"]} track="rgba(255,255,255,.12)">
          <div className="text-[64px] font-black tabular-nums" dir="ltr">{text}</div>
        </Ring>
        {task && <div className="max-w-xs truncate rounded-full bg-white/12 px-4 py-2 text-sm font-bold">{task.title}</div>}
      </div>
      <Controls big />
    </div>
  );
}

export default function Focus() {
  const { t, fmt, data, setDeepFocus, deepFocus, timerSetKind, timerSetMinutes, timerSetTask, updateSettings } = useApp();
  const { text, progress, tm } = useClock();
  const s = data.settings;
  const [pick, setPick] = useState(false);
  const [newPreset, setNewPreset] = useState("");
  const idle = tm.status === "idle";
  const brk = tm.kind === "pomodoro" && tm.phase !== "focus";
  const task = data.tasks.find((x) => x.id === tm.taskId);
  const L = Math.max(1, s.longEvery);
  const filled = tm.cycle > 0 && tm.cycle % L === 0 && tm.phase === "long" ? L : tm.cycle % L;

  const stats = useMemo(() => {
    const today = todayKey();
    const ws = weekStart();
    const day = data.sessions.filter((x) => isoKey(x.at) === today);
    const wk = data.sessions.filter((x) => weekStart(new Date(x.at)) === ws);
    const hours: Record<number, number> = {};
    data.sessions.forEach((x) => {
      const h = new Date(x.at).getHours();
      hours[h] = (hours[h] ?? 0) + x.seconds;
    });
    const best = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    return {
      daySec: day.reduce((a, b) => a + b.seconds, 0),
      weekSec: wk.reduce((a, b) => a + b.seconds, 0),
      dayN: day.filter((x) => x.mode === "pomodoro").length,
      bestHour: data.sessions.length >= 3 && best ? Number(best[0]) : null,
    };
  }, [data.sessions]);

  const dur = (sec: number) => {
    const m = Math.round(sec / 60);
    return m >= 60 ? `${fmt(Math.floor(m / 60))}${t("focus.hoursShort")} ${fmt(m % 60)}${t("focus.minShort")}` : `${fmt(m)} ${t("min")}`;
  };
  const hourLabel = (h: number) => fmt(new Intl.DateTimeFormat(s.lang === "ar" ? "ar-u-nu-latn" : "en", { hour: "numeric" }).format(new Date(2020, 0, 1, h)));

  const openTasks = data.tasks.filter((x) => !x.done && !x.archived);
  const hrs = Math.floor(tm.timerMin / 60);
  const mins = tm.timerMin % 60;
  const setHM = (h: number, m: number) => timerSetMinutes(Math.max(1, h * 60 + m));

  return (
    <>
      <Page title={t("focus.title")}>
        <Segmented
          value={tm.kind === "pomodoro" ? "pomodoro" : "timer"}
          onChange={(v) => timerSetKind(v === "pomodoro" ? "pomodoro" : "timer")}
          options={[{ value: "pomodoro", label: t("focus.pomodoro") }, { value: "timer", label: t("focus.timer") }]}
        />
        {tm.kind !== "pomodoro" && (
          <Segmented className="mt-2" value={tm.kind} onChange={(v) => timerSetKind(v)} options={[{ value: "timer", label: t("focus.countdown") }, { value: "stopwatch", label: t("focus.stopwatch") }]} />
        )}

        {/* Task link */}
        <button onClick={() => setPick(true)} className="press mt-4 flex min-h-12 w-full items-center gap-3 rounded-2xl bg-card px-4 text-start card-shadow">
          <IconBox icon={task ? "target" : "listChecks"} color={task ? "#6C63FF" : "#8E93A6"} size={34} />
          <span className={cx("flex-1 truncate font-bold", !task && "text-muted")}>{task ? task.title : t("focus.chooseTask")}</span>
          {task && <span className="text-xs font-bold text-muted">{t("focus.linked")}</span>}
          <ChevronDown size={18} className="text-muted" />
        </button>

        {/* Main dial */}
        <Card className="mt-4 flex flex-col items-center gap-5 px-4 py-7" style={brk ? { background: "linear-gradient(160deg, color-mix(in srgb,#34C759 14%, var(--card)), var(--card))" } : undefined}>
          <div className={cx("rounded-full px-4 py-1.5 text-[13px] font-extrabold", brk ? "bg-ok/15 text-ok" : "bg-accent/12 text-accent")}>
            {tm.kind === "pomodoro" ? t(`focus.phase.${tm.phase}`) : tm.status === "idle" ? t("focus.setDuration") : t("focus.running")}
          </div>
          <div className={cx("rounded-full", tm.status === "running" && "[animation:ringPulse_2s_infinite]")}>
            <Ring size={270} stroke={16} progress={tm.status === "idle" && tm.kind !== "stopwatch" ? 0 : progress} colors={brk ? ["#7CF2C4", "#34C759"] : ["#9A93FF", "#6C63FF"]}>
              <div className="text-center">
                <div className="text-[58px] leading-none font-black tracking-tight tabular-nums" dir="ltr">{text}</div>
                {tm.kind === "stopwatch" && <div className="mt-1 text-sm font-bold text-muted">{t("focus.stopwatch")}</div>}
              </div>
            </Ring>
          </div>
          {tm.kind === "pomodoro" && (
            <div className="flex items-center gap-2" aria-label={t("focus.cycle")}>
              {Array.from({ length: L }).map((_, i) => (
                <span key={i} className={cx("h-3 w-3 rounded-full transition-all duration-500", i < filled ? "grad-accent scale-110" : "bg-card2")} />
              ))}
            </div>
          )}
          <Controls />
          <Btn variant="soft" size="sm" onClick={() => setDeepFocus(true)}><Expand size={15} />{t("focus.deep")}</Btn>
        </Card>

        {/* Timer pickers */}
        {tm.kind === "timer" && idle && (
          <>
            <SectionTitle>{t("focus.setDuration")}</SectionTitle>
            <Card className="flex items-center justify-center gap-4 p-4">
              <div className="flex flex-col items-center">
                <Wheel values={[0, 1, 2, 3, 4, 5]} value={hrs} onChange={(h) => setHM(h, mins)} format={(n) => fmt(n)} label={t("hours")} />
                <span className="text-xs font-bold text-muted">{t("hours")}</span>
              </div>
              <span className="pb-5 text-3xl font-black text-muted">:</span>
              <div className="flex flex-col items-center">
                <Wheel values={Array.from({ length: 60 }, (_, i) => i)} value={mins} onChange={(m) => setHM(hrs, m)} format={(n) => fmt(String(n).padStart(2, "0"))} label={t("min")} />
                <span className="text-xs font-bold text-muted">{t("min")}</span>
              </div>
            </Card>
            <SectionTitle>{t("focus.presets")}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {s.presets.map((p) => (
                <span key={p} className="relative">
                  <Chip active={tm.timerMin === p} onClick={() => timerSetMinutes(p)}>{fmt(p)} {t("min")}</Chip>
                  {!([10, 20, 45, 60].includes(p)) && (
                    <button aria-label={t("delete")} onClick={() => updateSettings({ presets: s.presets.filter((x) => x !== p) })} className="absolute -top-1 -end-1 grid h-5 w-5 place-items-center rounded-full bg-danger text-white"><X size={11} /></button>
                  )}
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input value={newPreset} onChange={(e) => setNewPreset(e.target.value.replace(/\D/g, "").slice(0, 3))} placeholder={t("focus.presetPh")} inputMode="numeric" className={cx(inputCls, "!min-h-10 !w-24 !rounded-full text-center text-sm")} />
                <button
                  aria-label={t("focus.addPreset")}
                  onClick={() => {
                    const n = Number(newPreset);
                    if (n >= 1 && n <= 600 && !s.presets.includes(n)) updateSettings({ presets: [...s.presets, n].sort((a, b) => a - b) });
                    setNewPreset("");
                  }}
                  className="press grid h-10 w-10 place-items-center rounded-full bg-accent text-white"
                ><Plus size={18} /></button>
              </div>
            </div>
          </>
        )}

        {/* Ambient */}
        <SectionTitle>{t("focus.ambient")}</SectionTitle>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {(["none", "rain", "waves", "white"] as const).map((a) => (
            <Chip key={a} active={s.ambient === a} onClick={() => updateSettings({ ambient: a })}>{t(`focus.ambient.${a}`)}</Chip>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { l: t("focus.today"), v: dur(stats.daySec) },
            { l: t("focus.week"), v: dur(stats.weekSec) },
            { l: t("focus.sessionsToday"), v: fmt(stats.dayN) },
          ].map((x) => (
            <Card key={x.l} className="p-3 text-center">
              <div className="text-[17px] font-black">{x.v}</div>
              <div className="mt-0.5 text-[11px] font-bold text-muted">{x.l}</div>
            </Card>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-3xl bg-gold/12 p-4">
          <Lightbulb size={20} className="mt-0.5 shrink-0 text-gold-ink" />
          <div>
            <div className="text-sm font-extrabold">{t("focus.tip")}</div>
            <div className="text-sm leading-relaxed text-muted">{stats.bestHour !== null ? t("focus.tipBest", { h: hourLabel(stats.bestHour) }) : t("focus.tipNone")}</div>
          </div>
        </div>
      </Page>

      <Sheet open={pick} onClose={() => setPick(false)} title={t("focus.chooseTask")}>
        <div className="space-y-2 pt-2">
          <button onClick={() => { timerSetTask(undefined); setPick(false); }} className="press flex min-h-12 w-full items-center justify-between rounded-2xl bg-card px-4 text-start font-bold">
            {t("focus.noTask")}{!tm.taskId && <Check size={18} className="text-accent" />}
          </button>
          {openTasks.map((x) => (
            <button key={x.id} onClick={() => { timerSetTask(x.id); setPick(false); }} className="press flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl bg-card px-4 text-start font-bold">
              <span className="truncate">{x.title}</span>
              {tm.taskId === x.id && <Check size={18} className="shrink-0 text-accent" />}
            </button>
          ))}
        </div>
      </Sheet>
      {deepFocus && <DeepFocus />}
    </>
  );
}
