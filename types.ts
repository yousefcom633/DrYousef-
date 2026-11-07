export type Lang = "ar" | "en";
export type ThemeMode = "auto" | "light" | "dark";
export type Priority = "normal" | "important" | "urgent";
export type RepeatType = "none" | "daily" | "weekly" | "monthly" | "custom";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  date: string; // YYYY-MM-DD or ""
  time: string; // HH:mm or ""
  remind: boolean;
  notified?: boolean;
  priority: Priority;
  stars: number;
  categoryId: string;
  subtasks: Subtask[];
  repeat: { type: RepeatType; days: number[]; every: number };
  pomos: number; // estimated sessions
  pomosDone: number;
  done: boolean;
  doneAt?: string; // ISO
  paid: number; // stars currently held from this task
  archived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameKey?: string;
  color: string;
  icon: string;
}

export type RewardCat = "entertainment" | "food" | "shopping" | "rest" | "other";

export interface Reward {
  id: string;
  title: string;
  price: number;
  icon: string;
  color: string;
  image?: string;
  category: RewardCat;
  note: string;
  repeatable: boolean;
  hidden: boolean;
  pinned: boolean;
  createdAt: string;
}

export interface Purchase {
  id: string;
  rewardId: string;
  title: string;
  price: number;
  icon: string;
  color: string;
  image?: string;
  boughtAt: string;
  usedAt?: string;
}

export type TxType = "task" | "daybonus" | "streak" | "pomodoro" | "purchase" | "gift" | "welcome" | "challenge" | "refund" | "reverse";

export interface Tx {
  id: string;
  amount: number;
  type: TxType;
  reason: string;
  at: string;
  ref?: string;
}

export interface FocusSession {
  id: string;
  taskId?: string;
  mode: "pomodoro" | "timer" | "stopwatch";
  seconds: number;
  at: string;
}

export interface Settings {
  lang: Lang;
  theme: ThemeMode;
  digits: "auto" | "latn" | "arab";
  name: string;
  avatar: string; // emoji or data url
  accent: string;
  sound: boolean;
  haptics: boolean;
  quotes: boolean;
  notifTasks: boolean;
  notifFocus: boolean;
  notifDaily: boolean;
  notifStreak: boolean;
  dailyTime: string;
  starsEasy: number;
  starsMedium: number;
  starsHard: number;
  bonusDay: number;
  bonusPomo: number;
  bonusStreak3: number;
  bonusStreak7: number;
  bonusStreak30: number;
  weeklyGoal: number;
  weeklyBonus: number;
  focusMin: number;
  shortMin: number;
  longMin: number;
  longEvery: number;
  autoStart: boolean;
  keepAwake: boolean;
  ambient: "none" | "rain" | "waves" | "white";
  presets: number[];
}

export type TimerKind = "pomodoro" | "timer" | "stopwatch";
export type Phase = "focus" | "short" | "long";

export interface TimerState {
  kind: TimerKind;
  phase: Phase;
  status: "idle" | "running" | "paused";
  durationSec: number; // target (0 for stopwatch)
  startedAt: number; // ms epoch when last resumed
  accMs: number; // elapsed before last resume
  taskId?: string;
  cycle: number; // completed focus sessions in the current cycle
  timerMin: number; // chosen minutes for free timer
}

export interface AppData {
  version: 1;
  onboarded: boolean;
  tasks: Task[];
  categories: Category[];
  rewards: Reward[];
  purchases: Purchase[];
  txs: Tx[];
  sessions: FocusSession[];
  settings: Settings;
  lastGift: string;
  timer: TimerState;
}
