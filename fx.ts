"use client";

// ---------- Audio (generated with WebAudio, no assets needed) ----------
let ctx: AudioContext | null = null;
export const fxState = { sound: true, haptics: true };

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, start: number, dur: number, vol = 0.12, type: OscillatorType = "sine") {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export type SoundName = "done" | "buy" | "bell" | "tap" | "gift";
export function playSound(name: SoundName) {
  if (!fxState.sound) return;
  switch (name) {
    case "done":
      tone(659.25, 0, 0.18);
      tone(880, 0.09, 0.22);
      tone(1318.5, 0.18, 0.3, 0.09);
      break;
    case "buy":
    case "gift":
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.09, 0.4, 0.1, "triangle"));
      break;
    case "bell":
      [880, 1108.7, 1318.5].forEach((f, i) => tone(f, i * 0.35, 1.1, 0.14));
      break;
    case "tap":
      tone(520, 0, 0.06, 0.05);
      break;
  }
}

export function haptic(kind: "light" | "success" | "heavy" = "light") {
  if (!fxState.haptics || typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(kind === "light" ? 10 : kind === "success" ? [18, 40, 28] : [40, 30, 60]);
}

// ---------- Ambient sounds ----------
let ambientNodes: { stop: () => void } | null = null;
export function setAmbient(kind: "none" | "rain" | "waves" | "white") {
  ambientNodes?.stop();
  ambientNodes = null;
  if (kind === "none") return;
  const c = ac();
  if (!c) return;
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = c.createBiquadFilter();
  const gain = c.createGain();
  let lfo: OscillatorNode | null = null;
  if (kind === "white") {
    filter.type = "lowpass";
    filter.frequency.value = 6000;
    gain.gain.value = 0.05;
  } else if (kind === "rain") {
    filter.type = "bandpass";
    filter.frequency.value = 2200;
    filter.Q.value = 0.4;
    gain.gain.value = 0.12;
  } else {
    filter.type = "lowpass";
    filter.frequency.value = 700;
    gain.gain.value = 0.1;
    lfo = c.createOscillator();
    lfo.frequency.value = 0.12;
    const lg = c.createGain();
    lg.gain.value = 0.08;
    lfo.connect(lg).connect(gain.gain);
    lfo.start();
  }
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
  ambientNodes = {
    stop: () => {
      try {
        src.stop();
        lfo?.stop();
        gain.disconnect();
      } catch {}
    },
  };
}

// ---------- Visual effects ----------
const COLORS = ["#FFD36B", "#FFB020", "#6C63FF", "#5B8CFF", "#34C759", "#FF5A8A", "#FF9F0A"];

export function confetti(x?: number, y?: number, count = 36) {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const cx = x ?? window.innerWidth / 2;
  const cy = y ?? window.innerHeight / 2.4;
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  Object.assign(canvas.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "9999" });
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d")!;
  const parts = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 7;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 5,
      s: 5 + Math.random() * 6,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      star: Math.random() < 0.25,
    };
  });
  let frame = 0;
  const loop = () => {
    frame++;
    g.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += 0.28;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.globalAlpha = Math.max(0, 1 - frame / 90);
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.c;
      if (p.star) {
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 ? p.s * 0.45 : p.s;
          const ang = (i * Math.PI) / 5 - Math.PI / 2;
          g.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        g.closePath();
        g.fill();
      } else {
        g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      }
      g.restore();
    }
    if (frame < 90) requestAnimationFrame(loop);
    else canvas.remove();
  };
  requestAnimationFrame(loop);
}

/** Fly a golden star from a screen rect to the star counter in the header */
export function flyStar(from: { x: number; y: number }, count = 1) {
  if (typeof document === "undefined") return;
  const target = document.getElementById("star-target");
  if (!target) return;
  const tr = target.getBoundingClientRect();
  const tx = tr.left + tr.width / 2;
  const ty = tr.top + tr.height / 2;
  for (let i = 0; i < Math.min(count, 5); i++) {
    const el = document.createElement("div");
    el.textContent = "⭐";
    Object.assign(el.style, {
      position: "fixed",
      left: "0",
      top: "0",
      fontSize: "26px",
      zIndex: "9998",
      pointerEvents: "none",
      filter: "drop-shadow(0 4px 8px rgba(255,176,32,.6))",
    });
    document.body.appendChild(el);
    const midX = (from.x + tx) / 2 + (Math.random() - 0.5) * 120;
    const midY = Math.min(from.y, ty) - 60 - Math.random() * 60;
    const anim = el.animate(
      [
        { transform: `translate(${from.x - 13}px, ${from.y - 13}px) scale(0.6)`, opacity: 0 },
        { transform: `translate(${from.x - 13}px, ${from.y - 13}px) scale(1.3)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${midX - 13}px, ${midY - 13}px) scale(1.1) rotate(180deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${tx - 13}px, ${ty - 13}px) scale(0.5) rotate(360deg)`, opacity: 0.9 },
      ],
      { duration: 850 + i * 110, delay: i * 90, easing: "cubic-bezier(.3,.7,.3,1)", fill: "both" },
    );
    anim.onfinish = () => {
      el.remove();
      target.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
        { duration: 350, easing: "cubic-bezier(.3,1.6,.5,1)" },
      );
    };
  }
}

export function rectCenter(el: Element | null | undefined) {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// ---------- Notifications ----------
export function notifySupported() {
  return typeof window !== "undefined" && ("Notification" in window || !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

export async function askNotifPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined") return "unsupported";
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      let p = await LocalNotifications.checkPermissions();
      if (p.display !== "granted") p = await LocalNotifications.requestPermissions();
      if (p.display === "granted") {
        await ensureTaskNotificationChannel();
        window.dispatchEvent(new Event("dyt:notifications-enabled"));
        return "granted";
      }
      return "denied";
    }
  } catch {}
  if (!("Notification" in window)) return "unsupported";
  try { return await Notification.requestPermission(); } catch { return "denied"; }
}

let channelReady = false;
async function ensureTaskNotificationChannel() {
  if (channelReady) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.createChannel({
      id: "task-reminders",
      name: "تذكيرات المهام",
      description: "تنبيهات مواعيد المهام بصوت الهاتف",
      importance: 5,
      vibration: true,
      visibility: 1,
    });
    channelReady = true;
  } catch {}
}

/** Schedule a real Android notification; it can fire while the app is closed. */
export async function scheduleNativeTaskReminder(task: { id: string; title: string; date: string; time: string; remind: boolean }, enabled = true) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await ensureTaskNotificationChannel();
    const id = stableNotificationId(task.id);
    await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
    if (!enabled || !task.remind || !task.date || !task.time) return;
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;
    const at = new Date(`${task.date}T${task.time}:00`);
    if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: task.title,
        body: "حان موعد مهمتك الآن ⏰",
        schedule: { at, allowWhileIdle: true },
        channelId: "task-reminders",
          smallIcon: "ic_stat_icon_config_sample",
        actionTypeId: "OPEN_TASK",
        extra: { taskId: task.id },
      }],
    });
  } catch (e) { console.warn("Native reminder scheduling failed", e); }
}

export async function cancelNativeTaskReminder(taskId: string) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: stableNotificationId(taskId) }] });
  } catch {}
}

export async function syncNativeTaskReminders(tasks: Array<{ id: string; title: string; date: string; time: string; remind: boolean; done?: boolean; archived?: boolean }>, enabled: boolean) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await ensureTaskNotificationChannel();
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") return;
    for (const task of tasks) {
      await scheduleNativeTaskReminder(task, enabled && !task.done && !task.archived);
    }
  } catch (e) { console.warn("Native reminders sync failed", e); }
}

function stableNotificationId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2000000000) + 1;
}

export async function showNotification(title: string, body: string, tag?: string) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await ensureTaskNotificationChannel();
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") return;
      await LocalNotifications.schedule({ notifications: [{
        id: tag ? stableNotificationId(tag) : Math.floor(Date.now() % 2000000000),
        title, body, channelId: "task-reminders",
        schedule: { at: new Date(Date.now() + 1000) },
        smallIcon: "ic_stat_icon_config_sample",
      }] });
      return;
    }
  } catch {}
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, tag, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" });
      return;
    }
    new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    try {
      new Notification(title, { body, tag });
    } catch {}
  }
}
