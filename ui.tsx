"use client";

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { ChevronRight, Minus, Plus, X, Star as StarI } from "lucide-react";
import { useApp } from "@/lib/store";
import { ICONS } from "./icons";
import { haptic } from "@/lib/fx";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/* ---------- Buttons ---------- */
type Variant = "primary" | "gold" | "soft" | "danger" | "ghost" | "success";
export function Btn({
  variant = "primary", size = "md", className, children, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const v: Record<Variant, string> = {
    primary: "grad-accent text-white shadow-[0_8px_20px_-6px_var(--accent)]",
    gold: "grad-gold text-[#4a2c00] shadow-[0_8px_20px_-8px_#ffb020]",
    soft: "bg-accent/12 text-accent",
    danger: "bg-danger/12 text-danger",
    ghost: "bg-card2 text-ink",
    success: "bg-ok text-white shadow-[0_8px_20px_-8px_#34c759]",
  };
  const sz = { sm: "min-h-9 px-3.5 text-sm", md: "min-h-11 px-5 text-[15px]", lg: "min-h-14 px-6 text-base" }[size];
  return (
    <button
      {...p}
      className={cx("press inline-flex items-center justify-center gap-2 rounded-2xl font-bold disabled:opacity-45 disabled:pointer-events-none", v[variant], sz, className)}
    >
      {children}
    </button>
  );
}

export function IconBtn({ label, children, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button {...p} aria-label={label} title={label} className={cx("press grid h-11 w-11 shrink-0 place-items-center rounded-full", className)}>
      {children}
    </button>
  );
}

/* ---------- Surfaces ---------- */
export function Card({ children, className, style, onClick }: { children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={style} className={cx("card-shadow rounded-3xl bg-card", onClick && "press cursor-pointer", className)}>
      {children}
    </div>
  );
}

export function IconBox({ icon, color = "#6C63FF", size = 44, className }: { icon: string; color?: string; size?: number; className?: string }) {
  const I = ICONS[icon] ?? ICONS.star;
  return (
    <div
      className={cx("grid shrink-0 place-items-center text-white", className)}
      style={{
        width: size, height: size, borderRadius: size * 0.3,
        background: `linear-gradient(145deg, color-mix(in srgb, ${color} 62%, white), ${color})`,
        boxShadow: `0 6px 14px -6px ${color}`,
      }}
    >
      <I size={size * 0.5} strokeWidth={2.2} />
    </div>
  );
}

export function Chev({ className }: { className?: string }) {
  return <ChevronRight size={18} className={cx("shrink-0 text-muted rtl:rotate-180", className)} />;
}

export function StarGlyph({ size = 18, className }: { size?: number; className?: string }) {
  return <StarI size={size} className={cx("fill-[#FFB020] text-[#FFB020]", className)} strokeWidth={1.5} />;
}

export function StarPill({ onClick }: { onClick?: () => void }) {
  const { balance, fmt } = useApp();
  return (
    <button
      id="star-target"
      onClick={onClick}
      aria-label={`${fmt(balance)}`}
      className="press flex h-10 items-center gap-1.5 rounded-full bg-card/90 px-3.5 text-sm font-extrabold text-gold-ink shadow-sm ring-1 ring-line"
    >
      <StarGlyph size={17} />
      <span>{fmt(balance)}</span>
    </button>
  );
}

/* ---------- Progress ---------- */
export function Ring({
  size = 120, stroke = 12, progress, colors = ["#8F86FF", "#6C63FF"], track, children,
}: { size?: number; stroke?: number; progress: number; colors?: [string, string]; track?: string; children?: ReactNode }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 rtl:scale-x-[-1]">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colors[0]} />
            <stop offset="1" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? "var(--line)"} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(.3,.8,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Bar({ value, gold, className }: { value: number; gold?: boolean; className?: string }) {
  return (
    <div className={cx("h-2.5 w-full overflow-hidden rounded-full bg-black/8 dark:bg-white/10", className)} role="progressbar" aria-valuenow={Math.round(value * 100)}>
      <div
        className={cx("h-full rounded-full transition-[width] duration-700", gold ? "grad-gold" : "grad-accent")}
        style={{ width: `${Math.max(2, Math.min(1, value) * 100)}%` }}
      />
    </div>
  );
}

/* ---------- Inputs ---------- */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch" aria-checked={on} aria-label={label}
      onClick={() => { haptic("light"); onChange(!on); }}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300"
      style={{ background: on ? "#34C759" : "var(--card2)", boxShadow: "inset 0 0 0 1px var(--line)" }}
    >
      <span
        className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-[inset-inline-start] duration-300"
        style={{ insetInlineStart: on ? 22 : 2, transitionTimingFunction: "cubic-bezier(.3,1.4,.5,1)" }}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value, onChange, options, className,
}: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={cx("relative flex rounded-2xl bg-card2 p-1", className)} role="tablist">
      <div
        className="absolute top-1 bottom-1 rounded-xl bg-card shadow-sm transition-[inset-inline-start] duration-300"
        style={{ width: `calc((100% - 8px) / ${options.length})`, insetInlineStart: `calc(4px + ${i} * (100% - 8px) / ${options.length})`, transitionTimingFunction: "cubic-bezier(.3,1.3,.5,1)" }}
      />
      {options.map((o) => (
        <button
          key={o.value} role="tab" aria-selected={o.value === value}
          onClick={() => { haptic("light"); onChange(o.value); }}
          className={cx("relative z-10 min-h-9 flex-1 rounded-xl px-2 text-[13px] font-bold transition-colors", o.value === value ? "text-ink" : "text-muted")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, color }: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      onClick={() => { haptic("light"); onClick?.(); }}
      aria-pressed={active}
      className={cx("press inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold ring-1 transition-colors", active ? "text-white ring-transparent" : "bg-card text-muted ring-line")}
      style={active ? { background: color ?? "var(--accent)" } : undefined}
    >
      {children}
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; label: string }) {
  const { fmt } = useApp();
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-card2 p-1" role="group" aria-label={label}>
      <button aria-label="-" className="press grid h-9 w-9 place-items-center rounded-xl bg-card" onClick={() => onChange(Math.max(min, value - step))}>
        <Minus size={16} />
      </button>
      <span className="min-w-9 text-center text-[15px] font-extrabold tabular-nums">{fmt(value)}</span>
      <button aria-label="+" className="press grid h-9 w-9 place-items-center rounded-xl bg-card" onClick={() => onChange(Math.min(max, value + step))}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function Field({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      {label && <div className="px-1 text-[13px] font-bold text-muted">{label}</div>}
      {children}
    </div>
  );
}

export const inputCls = "min-h-12 w-full rounded-2xl bg-card2 px-4 text-[16px] outline-none ring-2 ring-transparent transition focus:ring-accent/50";

/* ---------- Overlays ---------- */
export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useApp();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="anim-fade absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose} />
      <div className="anim-sheet relative flex max-h-[92dvh] w-full max-w-[560px] flex-col rounded-t-[28px] bg-bg shadow-2xl">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-black/15 dark:bg-white/20" />
        <div className="flex shrink-0 items-center justify-between px-5 pt-2 pb-2">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <IconBtn label={t("close")} onClick={onClose} className="bg-card2">
            <X size={18} />
          </IconBtn>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 pt-3 pb-[calc(14px+var(--safe-b))]">{footer}</div>}
      </div>
    </div>
  );
}

export function Dialog({
  open, title, message, confirmLabel, danger, onConfirm, onCancel, icon,
}: { open: boolean; title: string; message?: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; icon?: ReactNode }) {
  const { t } = useApp();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-6" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="anim-fade absolute inset-0 bg-black/45 backdrop-blur-[3px]" onClick={onCancel} />
      <div className="anim-pop relative w-full max-w-[340px] rounded-[28px] bg-card p-6 text-center shadow-2xl">
        {icon && <div className="mb-3 flex justify-center">{icon}</div>}
        <h3 className="text-lg font-extrabold">{title}</h3>
        {message && <p className="mt-2 text-[15px] leading-relaxed text-muted">{message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Btn variant="ghost" onClick={onCancel}>{t("cancel")}</Btn>
          <Btn variant={danger ? "danger" : "primary"} className={danger ? "!bg-danger !text-white" : ""} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page scaffold with collapsing large title ---------- */
export function Page({ title, right, children, noStar }: { title: string; right?: ReactNode; children: ReactNode; noStar?: boolean }) {
  const [y, setY] = useState(0);
  const k = Math.max(0, Math.min(1, (y - 24) / 36));
  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar" onScroll={(e) => setY(e.currentTarget.scrollTop)}>
      <div className="sticky top-0 z-30 pt-[var(--safe-t)] transition-[background,box-shadow]" style={{ background: k > 0.5 ? "var(--glass)" : "transparent", backdropFilter: k > 0.5 ? "blur(22px) saturate(1.6)" : "none", WebkitBackdropFilter: k > 0.5 ? "blur(22px) saturate(1.6)" : "none", boxShadow: k > 0.9 ? "0 1px 0 var(--line)" : "none" }}>
        <div className="flex h-14 items-center justify-between gap-3 px-5">
          <div className="min-w-0 truncate text-[17px] font-extrabold" style={{ opacity: k, transform: `translateY(${(1 - k) * 6}px)` }}>{title}</div>
          <div className="flex items-center gap-2">
            {right}
            {!noStar && <StarPill />}
          </div>
        </div>
      </div>
      <div className="-mt-3 px-5 pb-[calc(130px+var(--safe-b))]">
        <h1 className="mb-4 origin-left text-[34px] leading-tight font-black tracking-tight rtl:origin-right" style={{ opacity: 1 - k * 0.9, transform: `scale(${1 - k * 0.12})` }}>
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon: string; title: string; sub?: string; action?: ReactNode }) {
  const I = ICONS[icon] ?? ICONS.star;
  return (
    <div className="anim-rise flex flex-col items-center px-8 py-12 text-center">
      <div className="relative mb-5 anim-float">
        <div className="absolute -inset-4 rounded-full bg-accent/10 blur-xl" />
        <div className="relative grid h-24 w-24 place-items-center rounded-[32px] grad-accent text-white shadow-[0_14px_30px_-10px_var(--accent)]">
          <I size={44} strokeWidth={1.8} />
        </div>
        <span className="anim-twinkle absolute -top-2 -end-3 text-2xl">✨</span>
        <span className="anim-twinkle absolute -bottom-1 -start-4 text-lg" style={{ animationDelay: "0.8s" }}>⭐</span>
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      {sub && <p className="mt-1.5 max-w-xs text-[15px] leading-relaxed text-muted">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between px-1">
      <h2 className="text-xl font-extrabold">{children}</h2>
      {right}
    </div>
  );
}

/* ---------- iOS wheel picker ---------- */
export function Wheel({ values, value, onChange, format, label }: { values: number[]; value: number; onChange: (v: number) => void; format?: (n: number) => string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const H = 44;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = values.indexOf(value);
    if (idx >= 0 && Math.round(el.scrollTop / H) !== idx) el.scrollTo({ top: idx * H, behavior: "auto" });
  }, [value, values]);
  return (
    <div className="relative h-[176px] w-24" aria-label={label} role="listbox">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-11 -translate-y-1/2 rounded-xl bg-card2" />
      <div
        ref={ref}
        className="wheel no-scrollbar relative h-full overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const v = values[Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / H)))];
            if (v !== value) { haptic("light"); onChange(v); }
          }, 70);
        }}
      >
        <div style={{ height: 66 }} />
        {values.map((v) => (
          <div key={v} role="option" aria-selected={v === value} className={cx("grid h-11 place-items-center text-2xl font-bold tabular-nums transition-opacity", v === value ? "opacity-100" : "opacity-40")}>
            {format ? format(v) : v}
          </div>
        ))}
        <div style={{ height: 66 }} />
      </div>
    </div>
  );
}
