import type { AppData, Settings, Task, Tx, Phase } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const pad = (n: number) => String(n).padStart(2, "0");
export const dateKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => dateKey();
export const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
export const isoKey = (iso: string) => dateKey(new Date(iso));
export const weekStart = (d: Date = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 1) % 7)); // week starts Saturday
  return dateKey(x);
};
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

export const defaultSettings = (lang: Settings["lang"] = "ar"): Settings => ({
  lang,
  theme: "auto",
  digits: "auto",
  name: lang === "ar" ? "دكتور يوسف" : "Dr. Yousef",
  avatar: "🦉",
  accent: "#6C63FF",
  sound: true,
  haptics: true,
  quotes: true,
  notifTasks: true,
  notifFocus: true,
  notifDaily: false,
  notifStreak: true,
  dailyTime: "20:00",
  starsEasy: 1,
  starsMedium: 2,
  starsHard: 3,
  bonusDay: 2,
  bonusPomo: 1,
  bonusStreak3: 3,
  bonusStreak7: 7,
  bonusStreak30: 30,
  weeklyGoal: 20,
  weeklyBonus: 10,
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: false,
  keepAwake: true,
  ambient: "none",
  presets: [10, 20, 45, 60],
});

export const balanceOf = (txs: Tx[]) => Math.max(0, txs.reduce((a, t) => a + t.amount, 0));
export const totalEarned = (txs: Tx[]) =>
  txs.filter((t) => t.amount > 0 && t.type !== "refund").reduce((a, t) => a + t.amount, 0);
export const totalSpent = (txs: Tx[]) => txs.filter((t) => t.type === "purchase").reduce((a, t) => a - t.amount, 0);

export function levelInfo(earned: number) {
  // level n starts at 10*(n-1)^2 stars
  const level = Math.floor(Math.sqrt(earned / 10)) + 1;
  const cur = 10 * (level - 1) ** 2;
  const next = 10 * level ** 2;
  const title = level >= 10 ? "legend" : level >= 6 ? "pro" : level >= 3 ? "achiever" : "beginner";
  return { level, cur, next, progress: (earned - cur) / (next - cur), title };
}

export function doneDates(tasks: Task[]): Set<string> {
  const s = new Set<string>();
  tasks.forEach((t) => t.done && t.doneAt && s.add(isoKey(t.doneAt)));
  return s;
}

export function streakInfo(tasks: Task[]) {
  const dates = doneDates(tasks);
  const today = todayKey();
  let start = dates.has(today) ? today : addDays(today, -1);
  let cur = 0;
  while (dates.has(start)) {
    cur++;
    start = addDays(start, -1);
  }
  const startKey = cur ? addDays(dates.has(today) ? today : addDays(today, -1), -(cur - 1)) : "";
  const sorted = [...dates].sort();
  let best = 0,
    run = 0,
    prev = "";
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current: cur, best, startKey, dates };
}

export function phaseMinutes(s: Settings, p: Phase) {
  return p === "focus" ? s.focusMin : p === "short" ? s.shortMin : s.longMin;
}

export function priorityRank(p: Task["priority"]) {
  return p === "urgent" ? 0 : p === "important" ? 1 : 2;
}

export function sortSmart(a: Task, b: Task) {
  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  const da = a.date ? a.date + (a.time || "99:99") : "9999";
  const db = b.date ? b.date + (b.time || "99:99") : "9999";
  if (da !== db) return da < db ? -1 : 1;
  return pr || b.stars - a.stars;
}

export function nextDate(t: Task): string {
  const base = t.date || todayKey();
  const r = t.repeat;
  if (r.type === "daily") return addDays(base, 1);
  if (r.type === "custom") return addDays(base, Math.max(1, r.every));
  if (r.type === "monthly") {
    const d = parseKey(base);
    d.setMonth(d.getMonth() + 1);
    return dateKey(d);
  }
  if (r.type === "weekly") {
    const days = r.days.length ? r.days : [parseKey(base).getDay()];
    for (let i = 1; i <= 7; i++) {
      const k = addDays(base, i);
      if (days.includes(parseKey(k).getDay())) return k;
    }
  }
  return base;
}

export function compressImage(file: File, max = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = String(fr.result);
    };
    fr.readAsDataURL(file);
  });
}

export function badgeList(d: AppData) {
  const doneCount = d.tasks.filter((t) => t.done).length;
  const earned = totalEarned(d.txs);
  const focusSec = d.sessions.reduce((a, s) => a + s.seconds, 0);
  const { best } = streakInfo(d.tasks);
  return [
    { id: "first", icon: "flag", color: "#34C759", ok: doneCount >= 1, progress: Math.min(1, doneCount / 1) },
    { id: "ten", icon: "listChecks", color: "#5B8CFF", ok: doneCount >= 10, progress: Math.min(1, doneCount / 10) },
    { id: "fifty", icon: "trophy", color: "#FF9F0A", ok: doneCount >= 50, progress: Math.min(1, doneCount / 50) },
    { id: "streak7", icon: "flame", color: "#FF6B35", ok: best >= 7, progress: Math.min(1, best / 7) },
    { id: "reward", icon: "gift", color: "#FF5A8A", ok: d.purchases.length >= 1, progress: Math.min(1, d.purchases.length) },
    { id: "star100", icon: "star", color: "#FFB020", ok: earned >= 100, progress: Math.min(1, earned / 100) },
    { id: "focus10", icon: "timer", color: "#6C63FF", ok: focusSec >= 36000, progress: Math.min(1, focusSec / 36000) },
    { id: "star500", icon: "crown", color: "#AF52DE", ok: earned >= 500, progress: Math.min(1, earned / 500) },
  ];
}
