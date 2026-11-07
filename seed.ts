import type { AppData, Category, Reward, Task, TimerState } from "./types";
import { addDays, defaultSettings, todayKey, uid } from "./utils";
import { translate } from "./i18n";
import type { Lang } from "./types";

export const defaultCategories = (): Category[] => [
  { id: "study", name: "", nameKey: "cat.study", color: "#5B8CFF", icon: "book" },
  { id: "work", name: "", nameKey: "cat.work", color: "#6C63FF", icon: "briefcase" },
  { id: "health", name: "", nameKey: "cat.health", color: "#34C759", icon: "heart" },
  { id: "home", name: "", nameKey: "cat.home", color: "#FF9F0A", icon: "home" },
  { id: "personal", name: "", nameKey: "cat.personal", color: "#FF5A8A", icon: "user" },
];

export const defaultTimer = (): TimerState => ({
  kind: "pomodoro",
  phase: "focus",
  status: "idle",
  durationSec: 25 * 60,
  startedAt: 0,
  accMs: 0,
  cycle: 0,
  timerMin: 15,
});

export function sampleRewards(lang: Lang): Reward[] {
  const t = (k: string) => translate(lang, k);
  const now = new Date().toISOString();
  const mk = (
    title: string,
    price: number,
    icon: string,
    color: string,
    category: Reward["category"],
    note: string,
    repeatable: boolean,
  ): Reward => ({ id: uid(), title, price, icon, color, category, note, repeatable, hidden: false, pinned: false, createdAt: now });
  return [
    mk(t("store.sample.break"), 20, "coffee", "#34C759", "rest", t("store.sample.note1"), true),
    mk(t("store.sample.coffee"), 50, "cup", "#A2845E", "food", t("store.sample.note2"), true),
    mk(t("store.sample.game"), 70, "gamepad", "#5B8CFF", "entertainment", "", true),
    mk(t("store.sample.movie"), 100, "film", "#AF52DE", "entertainment", t("store.sample.note3"), true),
    mk(t("store.sample.meal"), 300, "utensils", "#FF9F0A", "food", t("store.sample.note4"), true),
    mk(t("store.sample.gift"), 1000, "gift", "#FF5A8A", "shopping", t("store.sample.note5"), false),
  ];
}

export function sampleTasks(lang: Lang): Task[] {
  const isAr = lang === "ar";
  const today = todayKey();
  const mk = (
    title: string,
    categoryId: string,
    stars: number,
    priority: Task["priority"],
    time: string,
    extra: Partial<Task> = {},
  ): Task => ({
    id: uid(),
    title,
    notes: "",
    date: today,
    time,
    remind: false,
    priority,
    stars,
    categoryId,
    subtasks: [],
    repeat: { type: "none", days: [], every: 1 },
    pomos: 0,
    pomosDone: 0,
    done: false,
    paid: 0,
    archived: false,
    createdAt: new Date().toISOString(),
    ...extra,
  });
  return [
    mk(isAr ? "مراجعة الفصل الثالث" : "Review chapter three", "study", 3, "important", "10:00", {
      pomos: 2,
      subtasks: [
        { id: uid(), title: isAr ? "قراءة الملخص" : "Read the summary", done: true },
        { id: uid(), title: isAr ? "حل التمارين" : "Solve the exercises", done: false },
      ],
    }),
    mk(isAr ? "الرد على رسائل البريد" : "Reply to emails", "work", 1, "normal", "12:30"),
    mk(isAr ? "مشي سريع ٣٠ دقيقة" : "30-minute brisk walk", "health", 2, "important", "17:00", {
      repeat: { type: "daily", days: [], every: 1 },
    }),
    mk(isAr ? "تجهيز تقرير الأسبوع" : "Prepare the weekly report", "work", 3, "urgent", "15:00", { pomos: 3 }),
    mk(isAr ? "ترتيب غرفة المعيشة" : "Tidy the living room", "home", 2, "normal", "", { date: addDays(today, 1) }),
    mk(isAr ? "اتصال بالعائلة" : "Call the family", "personal", 1, "normal", "20:00", { date: addDays(today, 2) }),
  ];
}

export function freshData(lang: Lang = "ar"): AppData {
  return {
    version: 1,
    onboarded: false,
    tasks: [],
    categories: defaultCategories(),
    rewards: sampleRewards(lang),
    purchases: [],
    txs: [],
    sessions: [],
    settings: defaultSettings(lang),
    lastGift: "",
    timer: defaultTimer(),
  };
}
