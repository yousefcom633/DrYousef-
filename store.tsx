"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData, Category, FocusSession, Phase, Purchase, Reward, Settings, Task, TimerKind, TimerState, Tx, TxType } from "./types";
import { translate } from "./i18n";
import { freshData, sampleRewards, sampleTasks, defaultCategories, defaultTimer } from "./seed";
import {
  addDays, balanceOf, defaultSettings, dateKey, isoKey, nextDate, phaseMinutes, streakInfo, todayKey, totalEarned, uid, weekStart,
} from "./utils";
import { confetti, fxState, flyStar, haptic, playSound, rectCenter, setAmbient, showNotification, syncNativeTaskReminders } from "./fx";

const KEY = "dyt:data:v1";

export type TabId = "today" | "tasks" | "focus" | "store" | "profile";

interface ToastItem {
  id: number;
  msg: string;
  action?: { label: string; fn: () => void };
}

export const timerElapsedMs = (tm: TimerState, now: number) => tm.accMs + (tm.status === "running" ? Math.max(0, now - tm.startedAt) : 0);
export const timerRemainingMs = (tm: TimerState, now: number) => tm.durationSec * 1000 - timerElapsedMs(tm, now);

interface Ctx {
  data: AppData;
  ready: boolean;
  lang: Settings["lang"];
  dir: "rtl" | "ltr";
  t: (key: string, vars?: Record<string, string | number>) => string;
  fmt: (n: number | string) => string;
  fmtDate: (key: string, opts?: Intl.DateTimeFormatOptions) => string;
  balance: number;
  earned: number;
  streak: ReturnType<typeof streakInfo>;
  catName: (c?: Category) => string;
  tab: TabId;
  setTab: (t: TabId) => void;
  taskSheet: { open: boolean; task?: Task; preset?: Partial<Task> };
  openTask: (task?: Task, preset?: Partial<Task>) => void;
  closeTask: () => void;
  deepFocus: boolean;
  setDeepFocus: (v: boolean) => void;
  giftModal: Purchase | null;
  closeGift: () => void;
  toast: (msg: string, action?: { label: string; fn: () => void }) => void;
  toasts: ToastItem[];
  // tasks
  saveTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, origin?: { x: number; y: number }) => void;
  archiveTask: (id: string, archived: boolean) => void;
  clearArchive: () => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  saveCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  // rewards
  saveReward: (r: Reward) => void;
  deleteReward: (id: string) => void;
  buyReward: (id: string) => boolean;
  useReward: (purchaseId: string) => void;
  pinReward: (id: string) => void;
  claimGift: (origin?: { x: number; y: number }) => void;
  // settings / data
  updateSettings: (p: Partial<Settings>) => void;
  replaceData: (d: AppData) => void;
  resetAll: () => void;
  addSamples: () => void;
  finishOnboarding: (samples: boolean) => void;
  // timer
  timerSetKind: (k: TimerKind) => void;
  timerSetMinutes: (m: number) => void;
  timerStart: () => void;
  timerPause: () => void;
  timerReset: () => void;
  timerAdjust: (deltaMin: number) => void;
  timerSkip: () => void;
  timerSetTask: (id?: string) => void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(C);
  if (!c) throw new Error("AppProvider missing");
  return c;
};

function hydrate(raw: unknown): AppData {
  const base = freshData("ar");
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AppData>;
  const settings = { ...defaultSettings(r.settings?.lang ?? "ar"), ...(r.settings ?? {}) };
  return {
    ...base,
    ...r,
    version: 1,
    settings,
    tasks: Array.isArray(r.tasks) ? r.tasks : [],
    categories: Array.isArray(r.categories) && r.categories.length ? r.categories : defaultCategories(),
    rewards: Array.isArray(r.rewards) ? r.rewards : [],
    purchases: Array.isArray(r.purchases) ? r.purchases : [],
    txs: Array.isArray(r.txs) ? r.txs : [],
    sessions: Array.isArray(r.sessions) ? r.sessions : [],
    timer: { ...defaultTimer(), ...(r.timer ?? {}) },
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => freshData("ar"));
  const ref = useRef<AppData>(data);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>("today");
  const [taskSheet, setTaskSheet] = useState<Ctx["taskSheet"]>({ open: false });
  const [deepFocus, setDeepFocus] = useState(false);
  const [giftModal, setGiftModal] = useState<Purchase | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const commit = useCallback((fn: (d: AppData) => AppData) => {
    ref.current = fn(ref.current);
    setData(ref.current);
  }, []);

  // ---- load & persist
  useEffect(() => {
    let d: AppData;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) d = hydrate(JSON.parse(raw));
      else {
        const nav = (navigator.language || "ar").toLowerCase().startsWith("ar") ? "ar" : "en";
        d = freshData(nav);
      }
    } catch {
      d = freshData("ar");
    }
    ref.current = d;
    setData(d);
    setReady(true);
    const p = new URLSearchParams(location.search);
    const tb = p.get("tab") as TabId | null;
    if (tb && ["today", "tasks", "focus", "store", "profile"].includes(tb)) setTab(tb);
    if (p.get("action") === "add" && d.onboarded) setTaskSheet({ open: true });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const h = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch {}
    }, 250);
    return () => clearTimeout(h);
  }, [data, ready]);

  const s = data.settings;
  const lang = s.lang;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const nu = s.digits === "auto" ? (lang === "ar" ? "arab" : "latn") : s.digits;
  const locale = `${lang}-u-nu-${nu}`;

  // ---- document level: lang/dir/theme/accent
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = dir;
    el.style.setProperty("--accent", s.accent);
    fxState.sound = s.sound;
    fxState.haptics = s.haptics;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = s.theme === "dark" || (s.theme === "auto" && mq.matches);
      el.classList.toggle("dark", dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0E0F14" : "#F5F6FA");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [lang, dir, s.accent, s.theme, s.sound, s.haptics]);

  // ---- i18n helpers
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const fmt = useCallback(
    (n: number | string) => {
      if (typeof n === "number") return nf.format(n);
      if (nu !== "arab") return n;
      return n.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
    },
    [nf, nu],
  );
  const fmtDate = useCallback(
    (key: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Intl.DateTimeFormat(locale, opts).format(new Date(y, m - 1, d));
    },
    [locale],
  );
  const catName = useCallback((c?: Category) => (!c ? "" : c.nameKey ? translate(lang, c.nameKey) : c.name), [lang]);

  const toast = useCallback((msg: string, action?: { label: string; fn: () => void }) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-1), { id, msg, action }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), action ? 5500 : 3200);
  }, []);

  const balance = useMemo(() => balanceOf(data.txs), [data.txs]);
  const earned = useMemo(() => totalEarned(data.txs), [data.txs]);
  const streak = useMemo(() => streakInfo(data.tasks), [data.tasks]);

  const mkTx = (amount: number, type: TxType, reason: string, ref?: string): Tx => ({
    id: uid(),
    amount,
    type,
    reason,
    at: new Date().toISOString(),
    ref,
  });

  // ---- tasks
  const saveTask = useCallback(
    (task: Task) => commit((d) => {
      const exists = d.tasks.some((x) => x.id === task.id);
      return { ...d, tasks: exists ? d.tasks.map((x) => (x.id === task.id ? task : x)) : [task, ...d.tasks] };
    }),
    [commit],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const task = ref.current.tasks.find((x) => x.id === id);
      if (!task) return;
      commit((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));
      haptic("light");
      toast(translate(ref.current.settings.lang, "tasks.deleted"), {
        label: translate(ref.current.settings.lang, "undo"),
        fn: () => commit((d) => ({ ...d, tasks: [task, ...d.tasks] })),
      });
    },
    [commit, toast],
  );

  const toggleTask = useCallback(
    (id: string, origin?: { x: number; y: number }) => {
      const d = ref.current;
      const L = d.settings.lang;
      const task = d.tasks.find((x) => x.id === id);
      if (!task) return;
      const st = d.settings;
      if (!task.done) {
        const award = Math.max(0, task.stars - task.paid);
        const txs: Tx[] = [];
        if (award > 0) txs.push(mkTx(award, "task", translate(L, "tx.task", { t: task.title }), `task:${task.id}`));
        const doneAt = new Date().toISOString();
        let tasks = d.tasks.map((x) =>
          x.id === id ? { ...x, done: true, doneAt, paid: task.stars, subtasks: x.subtasks.map((sb) => ({ ...sb, done: true })) } : x,
        );
        if (task.repeat.type !== "none") {
          const nd = nextDate(task);
          const dup = tasks.some((x) => !x.done && x.title === task.title && x.date === nd);
          if (!dup)
            tasks = [
              { ...task, id: uid(), date: nd, done: false, doneAt: undefined, paid: 0, pomosDone: 0, notified: false, archived: false,
                subtasks: task.subtasks.map((sb) => ({ ...sb, id: uid(), done: false })), createdAt: new Date().toISOString() },
              ...tasks,
            ];
        }
        const allTx = [...d.txs];
        const has = (ref0: string) => allTx.some((x) => x.ref === ref0) || txs.some((x) => x.ref === ref0);
        // all-today bonus
        const today = todayKey();
        const dueToday = tasks.filter((x) => x.date === today && !x.archived);
        if (dueToday.length >= 2 && dueToday.every((x) => x.done) && st.bonusDay > 0 && !has(`day:${today}`))
          txs.push(mkTx(st.bonusDay, "daybonus", translate(L, "tx.daybonus"), `day:${today}`));
        // streak bonus
        const si = streakInfo(tasks);
        const sb: Record<number, number> = { 3: st.bonusStreak3, 7: st.bonusStreak7, 30: st.bonusStreak30 };
        if (sb[si.current] && !has(`streak:${si.current}:${si.startKey}`))
          txs.push(mkTx(sb[si.current], "streak", translate(L, "tx.streak", { n: si.current }), `streak:${si.current}:${si.startKey}`));
        // weekly challenge
        const ws = weekStart();
        const wk = tasks.filter((x) => x.done && x.doneAt && weekStart(new Date(x.doneAt)) === ws).length;
        if (wk >= st.weeklyGoal && st.weeklyBonus > 0 && !has(`week:${ws}`))
          txs.push(mkTx(st.weeklyBonus, "challenge", translate(L, "tx.challenge"), `week:${ws}`));
        commit((x) => ({ ...x, tasks, txs: [...x.txs, ...txs] }));
        const total = txs.reduce((a, b) => a + b.amount, 0);
        const pos = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        playSound("done");
        haptic("success");
        confetti(pos.x, pos.y, total > award ? 60 : 32);
        if (total > 0) flyStar(pos, total);
        const nf0 = new Intl.NumberFormat(`${L}-u-nu-${st.digits === "auto" ? (L === "ar" ? "arab" : "latn") : st.digits}`);
        toast(translate(L, "tasks.starsEarned", { n: nf0.format(total) }));
        if (txs.length > 1) setTimeout(() => confetti(undefined, undefined, 50), 350);
      } else {
        const bal = balanceOf(d.txs);
        const deduct = Math.min(bal, task.paid);
        const txs = deduct > 0 ? [mkTx(-deduct, "reverse", translate(L, "tx.reverse", { t: task.title }), `undo:${task.id}`)] : [];
        commit((x) => ({
          ...x,
          tasks: x.tasks.map((y) => (y.id === id ? { ...y, done: false, doneAt: undefined, paid: y.paid - deduct } : y)),
          txs: [...x.txs, ...txs],
        }));
        haptic("light");
        const nf0 = new Intl.NumberFormat(`${L}-u-nu-${st.digits === "auto" ? (L === "ar" ? "arab" : "latn") : st.digits}`);
        toast(deduct > 0 ? translate(L, "tasks.starsRemoved", { n: nf0.format(deduct) }) : translate(L, "tasks.unmarked"));
      }
    },
    [commit, toast],
  );

  const archiveTask = useCallback(
    (id: string, archived: boolean) => {
      commit((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, archived } : x)) }));
      toast(translate(ref.current.settings.lang, archived ? "tasks.archivedMsg" : "tasks.restored"));
    },
    [commit, toast],
  );

  const clearArchive = useCallback(() => {
    const removed = ref.current.tasks.filter((x) => x.archived);
    commit((d) => ({ ...d, tasks: d.tasks.filter((x) => !x.archived) }));
    toast(translate(ref.current.settings.lang, "tasks.deleted"), {
      label: translate(ref.current.settings.lang, "undo"),
      fn: () => commit((d) => ({ ...d, tasks: [...removed, ...d.tasks] })),
    });
  }, [commit, toast]);

  const toggleSubtask = useCallback(
    (taskId: string, subId: string) => {
      haptic("light");
      commit((d) => ({
        ...d,
        tasks: d.tasks.map((x) =>
          x.id === taskId ? { ...x, subtasks: x.subtasks.map((sb) => (sb.id === subId ? { ...sb, done: !sb.done } : sb)) } : x,
        ),
      }));
    },
    [commit],
  );

  const saveCategory = useCallback(
    (c: Category) => commit((d) => ({
      ...d,
      categories: d.categories.some((x) => x.id === c.id) ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c],
    })),
    [commit],
  );
  const deleteCategory = useCallback(
    (id: string) => commit((d) => {
      if (d.categories.length <= 1) return d;
      const rest = d.categories.filter((x) => x.id !== id);
      return { ...d, categories: rest, tasks: d.tasks.map((x) => (x.categoryId === id ? { ...x, categoryId: rest[0].id } : x)) };
    }),
    [commit],
  );

  // ---- rewards
  const saveReward = useCallback(
    (r: Reward) => commit((d) => ({
      ...d,
      rewards: d.rewards.some((x) => x.id === r.id) ? d.rewards.map((x) => (x.id === r.id ? r : x)) : [...d.rewards, r],
    })),
    [commit],
  );
  const deleteReward = useCallback(
    (id: string) => {
      const r = ref.current.rewards.find((x) => x.id === id);
      if (!r) return;
      commit((d) => ({ ...d, rewards: d.rewards.filter((x) => x.id !== id) }));
      toast(translate(ref.current.settings.lang, "store.deleted"), {
        label: translate(ref.current.settings.lang, "undo"),
        fn: () => commit((d) => ({ ...d, rewards: [...d.rewards, r] })),
      });
    },
    [commit, toast],
  );
  const pinReward = useCallback(
    (id: string) => commit((d) => ({ ...d, rewards: d.rewards.map((x) => ({ ...x, pinned: x.id === id ? !x.pinned : false })) })),
    [commit],
  );

  const buyReward = useCallback(
    (id: string) => {
      const d = ref.current;
      const r = d.rewards.find((x) => x.id === id);
      if (!r) return false;
      if (balanceOf(d.txs) < r.price) return false;
      if (!r.repeatable && d.purchases.some((p) => p.rewardId === r.id)) return false;
      const p: Purchase = {
        id: uid(), rewardId: r.id, title: r.title, price: r.price, icon: r.icon, color: r.color, image: r.image, boughtAt: new Date().toISOString(),
      };
      commit((x) => ({
        ...x,
        purchases: [p, ...x.purchases],
        rewards: x.rewards.map((y) => (y.id === r.id && !r.repeatable ? { ...y, pinned: false } : y)),
        txs: [...x.txs, mkTx(-r.price, "purchase", translate(d.settings.lang, "tx.purchase", { t: r.title }), `buy:${p.id}`)],
      }));
      setGiftModal(p);
      playSound("buy");
      haptic("success");
      return true;
    },
    [commit],
  );
  const closeGift = useCallback(() => setGiftModal(null), []);
  const useReward = useCallback(
    (pid: string) => {
      commit((d) => ({ ...d, purchases: d.purchases.map((p) => (p.id === pid ? { ...p, usedAt: new Date().toISOString() } : p)) }));
      haptic("success");
      toast(translate(ref.current.settings.lang, "store.markedUsed"));
    },
    [commit, toast],
  );

  const claimGift = useCallback(
    (origin?: { x: number; y: number }) => {
      const d = ref.current;
      const today = todayKey();
      if (d.lastGift === today) return;
      const n = 1 + Math.floor(Math.random() * 3);
      commit((x) => ({ ...x, lastGift: today, txs: [...x.txs, mkTx(n, "gift", translate(d.settings.lang, "tx.gift"), `gift:${today}`)] }));
      const pos = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      playSound("gift");
      haptic("success");
      confetti(pos.x, pos.y, 44);
      flyStar(pos, n);
      const L = d.settings.lang;
      const nfx = new Intl.NumberFormat(`${L}-u-nu-${d.settings.digits === "auto" ? (L === "ar" ? "arab" : "latn") : d.settings.digits}`);
      toast(translate(L, "today.giftGot", { n: nfx.format(n) }));
    },
    [commit, toast],
  );

  // ---- settings & data
  const updateSettings = useCallback((p: Partial<Settings>) => commit((d) => ({ ...d, settings: { ...d.settings, ...p } })), [commit]);
  const replaceData = useCallback((nd: AppData) => commit(() => hydrate(nd)), [commit]);
  const resetAll = useCallback(() => {
    const L = ref.current.settings.lang;
    const fresh = freshData(L);
    commit(() => fresh);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, [commit]);
  const addSamples = useCallback(() => {
    const L = ref.current.settings.lang;
    commit((d) => ({ ...d, tasks: [...sampleTasks(L), ...d.tasks], rewards: d.rewards.length ? d.rewards : sampleRewards(L) }));
    toast(translate(L, "set.samplesAdded"));
  }, [commit, toast]);
  const finishOnboarding = useCallback(
    (samples: boolean) => {
      const L = ref.current.settings.lang;
      commit((d) => ({
        ...d,
        onboarded: true,
        tasks: samples ? [...sampleTasks(L).filter((x) => !d.tasks.some((y) => y.title === x.title)), ...d.tasks] : d.tasks,
        txs: d.txs.some((x) => x.type === "welcome") ? d.txs : [...d.txs, mkTx(5, "welcome", translate(L, "tx.welcome"), "welcome")],
        rewards: d.rewards.length ? d.rewards : sampleRewards(L),
      }));
      confetti(undefined, undefined, 70);
      playSound("gift");
      haptic("success");
    },
    [commit],
  );

  // ---- timer
  const applyTimer = useCallback((fn: (tm: TimerState) => TimerState) => commit((d) => ({ ...d, timer: fn(d.timer) })), [commit]);

  const recordSession = useCallback(
    (seconds: number, mode: FocusSession["mode"], taskId?: string, extraCommit?: (d: AppData) => AppData) => {
      commit((d) => {
        const nd = { ...d, sessions: [...d.sessions, { id: uid(), mode, seconds: Math.round(seconds), taskId, at: new Date().toISOString() }] };
        return extraCommit ? extraCommit(nd) : nd;
      });
    },
    [commit],
  );

  const finishTimer = useCallback(() => {
    const d = ref.current;
    const tm = d.timer;
    const st = d.settings;
    const L = st.lang;
    const now = Date.now();
    if (tm.status !== "running" || tm.durationSec <= 0 || timerRemainingMs(tm, now) > 0) return;
    playSound("bell");
    haptic("heavy");
    if (tm.kind === "pomodoro") {
      const wasFocus = tm.phase === "focus";
      let nextPhase: Phase = "focus";
      let cycle = tm.cycle;
      if (wasFocus) {
        cycle = tm.cycle + 1;
        nextPhase = cycle % Math.max(1, st.longEvery) === 0 ? "long" : "short";
        recordSession(tm.durationSec, "pomodoro", tm.taskId, (x) => ({
          ...x,
          tasks: x.tasks.map((y) => (y.id === tm.taskId ? { ...y, pomosDone: y.pomosDone + 1 } : y)),
          txs: st.bonusPomo > 0 ? [...x.txs, mkTx(st.bonusPomo, "pomodoro", translate(L, "tx.pomodoro"), `pomo:${now}`)] : x.txs,
        }));
        confetti(undefined, undefined, 50);
        const nfx = new Intl.NumberFormat(`${L}-u-nu-${st.digits === "auto" ? (L === "ar" ? "arab" : "latn") : st.digits}`);
        toast(st.bonusPomo > 0 ? translate(L, "focus.finishedStar", { n: nfx.format(st.bonusPomo) }) : translate(L, "focus.finished"));
        if (st.notifFocus) showNotification(translate(L, "focus.notifFocusTitle"), translate(L, "focus.notifFocusBody"), "focus");
      } else {
        toast(translate(L, "focus.breakOver"));
        if (st.notifFocus) showNotification(translate(L, "focus.notifBreakTitle"), translate(L, "focus.notifBreakBody"), "focus");
      }
      applyTimer((x) => ({
        ...x,
        phase: nextPhase,
        cycle,
        durationSec: phaseMinutes(st, nextPhase) * 60,
        accMs: 0,
        startedAt: st.autoStart ? Date.now() : 0,
        status: st.autoStart ? "running" : "idle",
      }));
    } else {
      recordSession(tm.durationSec, "timer", tm.taskId);
      toast(translate(L, "focus.timerDone"));
      if (st.notifFocus) showNotification(translate(L, "focus.notifTimerTitle"), translate(L, "focus.notifTimerBody"), "focus");
      applyTimer((x) => ({ ...x, status: "idle", accMs: 0, startedAt: 0 }));
    }
  }, [applyTimer, recordSession, toast]);

  // tick engine (worker-based so it is not throttled in background tabs)
  const running = data.timer.status === "running";
  useEffect(() => {
    if (!running) return;
    let worker: Worker | null = null;
    let iv: ReturnType<typeof setInterval> | null = null;
    try {
      const blob = new Blob(["setInterval(()=>postMessage(1),500)"], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      worker = new Worker(url);
      worker.onmessage = () => finishTimer();
      URL.revokeObjectURL(url);
    } catch {
      iv = setInterval(finishTimer, 500);
    }
    const vis = () => finishTimer();
    document.addEventListener("visibilitychange", vis);
    finishTimer();
    return () => {
      worker?.terminate();
      if (iv) clearInterval(iv);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [running, finishTimer]);

  // wake lock
  useEffect(() => {
    if (!running || !s.keepAwake) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    const req = () => nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    req();
    const vis = () => document.visibilityState === "visible" && req();
    document.addEventListener("visibilitychange", vis);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      lock?.release().catch(() => {});
    };
  }, [running, s.keepAwake]);

  // ambient sound
  const isFocusRun = running && (data.timer.kind !== "pomodoro" || data.timer.phase === "focus");
  useEffect(() => {
    setAmbient(isFocusRun ? s.ambient : "none");
    return () => setAmbient("none");
  }, [isFocusRun, s.ambient]);

  const timerSetKind = useCallback(
    (k: TimerKind) =>
      applyTimer((tm) => {
        if (tm.status !== "idle") return tm;
        const st = ref.current.settings;
        return { ...tm, kind: k, phase: "focus", accMs: 0,
          durationSec: k === "pomodoro" ? st.focusMin * 60 : k === "timer" ? tm.timerMin * 60 : 0 };
      }),
    [applyTimer],
  );
  const timerSetMinutes = useCallback(
    (m: number) => applyTimer((tm) => (tm.status === "idle" && tm.kind === "timer" ? { ...tm, timerMin: m, durationSec: m * 60 } : tm)),
    [applyTimer],
  );
  const timerStart = useCallback(() => {
    playSound("tap");
    haptic("light");
    applyTimer((tm) => {
      if (tm.status === "running") return tm;
      if (tm.status === "paused") return { ...tm, status: "running", startedAt: Date.now() };
      return { ...tm, status: "running", startedAt: Date.now(), accMs: 0 };
    });
  }, [applyTimer]);
  const timerPause = useCallback(() => {
    haptic("light");
    applyTimer((tm) => (tm.status === "running" ? { ...tm, status: "paused", accMs: tm.accMs + (Date.now() - tm.startedAt), startedAt: 0 } : tm));
  }, [applyTimer]);
  const timerReset = useCallback(() => {
    const d = ref.current;
    const tm = d.timer;
    const el = timerElapsedMs(tm, Date.now()) / 1000;
    if (tm.status !== "idle" && el >= 60 && (tm.kind !== "pomodoro" || tm.phase === "focus"))
      recordSession(el, tm.kind === "stopwatch" ? "stopwatch" : tm.kind === "timer" ? "timer" : "pomodoro", tm.taskId);
    const st = d.settings;
    applyTimer((x) => ({
      ...x, status: "idle", accMs: 0, startedAt: 0, phase: "focus",
      durationSec: x.kind === "pomodoro" ? st.focusMin * 60 : x.kind === "timer" ? x.timerMin * 60 : 0,
    }));
  }, [applyTimer, recordSession]);
  const timerAdjust = useCallback(
    (delta: number) => {
      haptic("light");
      applyTimer((tm) => {
        if (tm.kind === "stopwatch") return tm;
        const rem = tm.durationSec + delta * 60;
        const minDur = Math.ceil(timerElapsedMs(tm, Date.now()) / 1000) + 60;
        return { ...tm, durationSec: Math.max(tm.status === "idle" ? 60 : minDur, rem), timerMin: tm.kind === "timer" && tm.status === "idle" ? Math.max(1, tm.timerMin + delta) : tm.timerMin };
      });
    },
    [applyTimer],
  );
  const timerSkip = useCallback(() => {
    applyTimer((tm) => {
      if (tm.kind !== "pomodoro") return tm;
      const st = ref.current.settings;
      let nextPhase: Phase = "focus";
      let cycle = tm.cycle;
      if (tm.phase === "focus") {
        nextPhase = (cycle + 1) % Math.max(1, st.longEvery) === 0 ? "long" : "short";
        cycle = tm.cycle + 1;
      }
      return { ...tm, phase: nextPhase, cycle, status: "idle", accMs: 0, startedAt: 0, durationSec: phaseMinutes(st, nextPhase) * 60 };
    });
  }, [applyTimer]);
  const timerSetTask = useCallback((id?: string) => applyTimer((tm) => ({ ...tm, taskId: id })), [applyTimer]);

  // keep idle pomodoro duration in sync with settings
  useEffect(() => {
    if (!ready) return;
    applyTimer((tm) =>
      tm.status === "idle" && tm.kind === "pomodoro" ? { ...tm, durationSec: phaseMinutes(ref.current.settings, tm.phase) * 60 } : tm,
    );
  }, [ready, s.focusMin, s.shortMin, s.longMin, applyTimer]);

  // ---- reminders (while app is open / in background tab)
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      const d = ref.current;
      const st = d.settings;
      const L = st.lang;
      const now = new Date();
      const today = dateKey(now);
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (st.notifTasks) {
        const due = d.tasks.filter((x) => x.remind && !x.notified && !x.done && !x.archived && x.date && x.time && (x.date < today || (x.date === today && x.time <= hhmm)));
        if (due.length) {
          due.forEach((x) => {
            if (x.date === today || addDays(x.date, 1) === today) showNotification(x.title, translate(L, "tasks.remind") + " ⏰", `task-${x.id}`);
          });
          commit((x) => ({ ...x, tasks: x.tasks.map((y) => (due.some((z) => z.id === y.id) ? { ...y, notified: true } : y)) }));
        }
      }
      const flag = (k: string) => {
        const key = `dyt:n:${k}:${today}`;
        if (localStorage.getItem(key)) return false;
        localStorage.setItem(key, "1");
        return true;
      };
      if (st.notifDaily && hhmm >= st.dailyTime && flag("daily")) {
        showNotification(translate(L, "appName"), translate(L, `quote.${now.getDate() % 7}`), "daily");
      }
      if (st.notifStreak && hhmm >= "19:00") {
        const si = streakInfo(d.tasks);
        if (si.current > 0 && !si.dates.has(today) && flag("streak")) showNotification(`🔥 ${si.current}`, translate(L, "today.streak"), "streak");
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [ready, commit]);

  // Native Android reminders: scheduled by Android and audible while the app is closed.
  useEffect(() => {
    if (!ready) return;
    const sync = () => void syncNativeTaskReminders(
      data.tasks.map((task) => ({ ...task })),
      data.settings.notifTasks,
    );
    sync();
    window.addEventListener("dyt:notifications-enabled", sync);
    return () => window.removeEventListener("dyt:notifications-enabled", sync);
  }, [ready, data.tasks, data.settings.notifTasks]);

  // register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const value: Ctx = {
    data, ready, lang, dir, t, fmt, fmtDate, balance, earned, streak, catName, tab, setTab,
    taskSheet,
    openTask: (task, preset) => setTaskSheet({ open: true, task, preset }),
    closeTask: () => setTaskSheet({ open: false }),
    deepFocus, setDeepFocus, giftModal, closeGift, toast, toasts,
    saveTask, deleteTask, toggleTask, archiveTask, clearArchive, toggleSubtask, saveCategory, deleteCategory,
    saveReward, deleteReward, buyReward, useReward, pinReward, claimGift,
    updateSettings, replaceData, resetAll, addSamples, finishOnboarding,
    timerSetKind, timerSetMinutes, timerStart, timerPause, timerReset, timerAdjust, timerSkip, timerSetTask,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

/** Re-renders every `ms` while active; returns Date.now() */
export function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      const h = setTimeout(() => setNow(Date.now()), 0);
      return () => clearTimeout(h);
    }
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [active, ms]);
  return now;
}

export { rectCenter, isoKey };
