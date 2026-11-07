"use client";

import { useRef, useState, type ReactNode } from "react";
import { Bell, Check, Download, ImagePlus, Info, Moon, Palette, ShieldCheck, Smartphone, Sun, SunMoon, Trash2, Upload } from "lucide-react";
import { useApp } from "@/lib/store";
import type { AppData, Settings } from "@/lib/types";
import { askNotifPermission, notifySupported } from "@/lib/fx";
import { compressImage } from "@/lib/utils";
import { Btn, Card, Dialog, Field, IconBox, Segmented, Sheet, Stepper, Toggle, cx, inputCls } from "./ui";
import { ACCENTS, AVATARS } from "./icons";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 px-1 text-[13px] font-extrabold tracking-wide text-muted uppercase">{title}</div>
      <Card className="divide-y divide-line overflow-hidden">{children}</Card>
    </div>
  );
}
const Row = ({ children, label, sub }: { children?: ReactNode; label: string; sub?: string }) => (
  <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
    <div className="min-w-0">
      <div className="text-[15px] font-bold">{label}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
    {children}
  </div>
);

export default function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, data, updateSettings, replaceData, resetAll, toast, addSamples } = useApp();
  const s = data.settings;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);
  const [reset, setReset] = useState(0);
  const [perm, setPerm] = useState<string>(() => (typeof window !== "undefined" && notifySupported() ? Notification.permission : "unsupported"));
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dr-yousef-tasks-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(t("set.exported"));
  };
  const doImport = async (file: File) => {
    try {
      const j = JSON.parse(await file.text()) as AppData;
      if (!Array.isArray(j.tasks) || !j.settings) throw new Error("bad");
      replaceData({ ...j, onboarded: true });
      toast(t("set.imported"));
    } catch {
      toast(t("set.importFail"));
    }
  };

  const num = (k: keyof Settings, label: string, min = 0, max = 99, step = 1) => (
    <Row label={label}><Stepper label={label} value={s[k] as number} min={min} max={max} step={step} onChange={(n) => set(k, n as never)} /></Row>
  );
  const tog = (k: keyof Settings, label: string) => (
    <Row label={label}><Toggle on={s[k] as boolean} label={label} onChange={(v) => set(k, v as never)} /></Row>
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title={t("set.title")}>
        {/* General */}
        <Group title={t("set.general")}>
          <div className="space-y-3 p-4">
            <Field label={t("set.name")}>
              <input value={s.name} onChange={(e) => set("name", e.target.value)} className={inputCls} maxLength={24} />
            </Field>
            <Field label={t("set.avatar")}>
              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
                {AVATARS.map((a) => (
                  <button key={a} onClick={() => set("avatar", a)} className={cx("press grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card2 text-2xl ring-2", s.avatar === a ? "ring-accent" : "ring-transparent")}>{a}</button>
                ))}
                <button aria-label={t("set.avatarPhoto")} onClick={() => avatarRef.current?.click()} className="press grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-accent/12 text-accent">
                  {s.avatar.startsWith("data:") ? <img src={s.avatar} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}
                </button>
                <input ref={avatarRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) set("avatar", await compressImage(f, 200)); e.target.value = ""; }} />
              </div>
            </Field>
          </div>
          <div className="p-4">
            <Field label={t("set.language")}>
              <Segmented value={s.lang} onChange={(v) => updateSettings({ lang: v, name: s.name === "دكتور يوسف" || s.name === "Dr. Yousef" ? (v === "ar" ? "دكتور يوسف" : "Dr. Yousef") : s.name })} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
            </Field>
          </div>
          <div className="p-4">
            <Field label={t("set.theme")}>
              <Segmented
                value={s.theme}
                onChange={(v) => set("theme", v)}
                options={[
                  { value: "auto", label: <span className="flex items-center justify-center gap-1"><SunMoon size={14} />{t("set.theme.auto")}</span> },
                  { value: "light", label: <span className="flex items-center justify-center gap-1"><Sun size={14} />{t("set.theme.light")}</span> },
                  { value: "dark", label: <span className="flex items-center justify-center gap-1"><Moon size={14} />{t("set.theme.dark")}</span> },
                ]}
              />
            </Field>
          </div>
          <div className="p-4">
            <Field label={t("set.accent")}>
              <div className="flex gap-3">
                {ACCENTS.map((c) => (
                  <button key={c} aria-label={c} onClick={() => set("accent", c)} className="press grid h-10 w-10 place-items-center rounded-full" style={{ background: c }}>
                    {s.accent === c && <Check size={18} className="text-white" />}
                  </button>
                ))}
                <span className="ms-auto grid place-items-center text-accent"><Palette size={20} /></span>
              </div>
            </Field>
          </div>
          <div className="p-4">
            <Field label={t("set.digits")}>
              <Segmented value={s.digits} onChange={(v) => set("digits", v)} options={(["auto", "latn", "arab"] as const).map((v) => ({ value: v, label: t(`set.digits.${v}`) }))} />
            </Field>
          </div>
        </Group>

        {/* Notifications */}
        <Group title={t("set.notifs")}>
          <Row label={perm === "granted" ? t("set.notifGranted") : perm === "denied" ? t("set.notifDenied") : perm === "unsupported" ? t("set.notifUnsupported") : t("set.notifEnable")}>
            {perm === "default" ? (
              <Btn size="sm" onClick={async () => setPerm(await askNotifPermission())}><Bell size={15} />{t("set.notifEnable")}</Btn>
            ) : (
              <IconBox icon="bell" color={perm === "granted" ? "#34C759" : "#8E93A6"} size={34} />
            )}
          </Row>
          {tog("notifTasks", t("set.notifTasks"))}
          {tog("notifFocus", t("set.notifFocus"))}
          {tog("notifDaily", t("set.notifDaily"))}
          {s.notifDaily && (
            <Row label={t("set.dailyTime")}>
              <input type="time" value={s.dailyTime} onChange={(e) => set("dailyTime", e.target.value)} className={cx(inputCls, "!min-h-10 !w-32 text-center")} />
            </Row>
          )}
          {tog("notifStreak", t("set.notifStreak"))}
        </Group>

        <Group title={t("set.feedback")}>
          {tog("sound", t("set.sound"))}
          {tog("haptics", t("set.haptics"))}
          {tog("quotes", t("set.quotes"))}
        </Group>

        <Group title={t("set.economy")}>
          {num("starsEasy", t("set.starsEasy"), 1, 20)}
          {num("starsMedium", t("set.starsMedium"), 1, 20)}
          {num("starsHard", t("set.starsHard"), 1, 20)}
          {num("bonusDay", t("set.bonusDay"), 0, 50)}
          {num("bonusPomo", t("set.bonusPomo"), 0, 20)}
          {num("bonusStreak3", t("set.bonusStreak3"), 0, 100)}
          {num("bonusStreak7", t("set.bonusStreak7"), 0, 200)}
          {num("bonusStreak30", t("set.bonusStreak30"), 0, 1000, 5)}
          {num("weeklyGoal", t("set.weeklyGoal"), 1, 100)}
          {num("weeklyBonus", t("set.weeklyBonus"), 0, 200)}
        </Group>

        <Group title={t("set.pomo")}>
          {num("focusMin", t("set.focusMin"), 1, 120, 5)}
          {num("shortMin", t("set.shortMin"), 1, 60)}
          {num("longMin", t("set.longMin"), 1, 90, 5)}
          {num("longEvery", t("set.longEvery"), 2, 10)}
          {tog("autoStart", t("set.autoStart"))}
          {tog("keepAwake", t("set.keepAwake"))}
        </Group>

        <Group title={t("set.backup")}>
          <div className="grid grid-cols-2 gap-3 p-4">
            <Btn variant="soft" onClick={doExport}><Download size={17} />{t("set.export")}</Btn>
            <Btn variant="soft" onClick={() => fileRef.current?.click()}><Upload size={17} />{t("set.import")}</Btn>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
          </div>
          <div className="p-4"><Btn variant="ghost" className="w-full" onClick={addSamples}>{t("set.loadSamples")}</Btn></div>
        </Group>

        <Group title={t("set.privacy")}>
          <div className="flex gap-3 p-4">
            <ShieldCheck className="shrink-0 text-ok" />
            <p className="text-sm leading-relaxed text-muted">{t("set.privacyText")}</p>
          </div>
        </Group>

        <Group title={t("set.about")}>
          <div className="flex gap-3 p-4">
            <Info className="shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-muted">{t("set.aboutText")}</p>
          </div>
          <div className="flex gap-3 p-4">
            <Smartphone className="shrink-0 text-accent" />
            <div><div className="text-sm font-bold">{t("set.installApp")}</div><div className="text-xs text-muted">{t("set.installHint")}</div></div>
          </div>
        </Group>

        <Group title={t("set.danger")}>
          <div className="p-4"><Btn variant="danger" className="w-full" onClick={() => setReset(1)}><Trash2 size={17} />{t("set.reset")}</Btn></div>
        </Group>
        <div className="h-4" />
      </Sheet>
      <Dialog open={reset === 1} title={t("set.resetConfirm1")} message={t("set.resetConfirm1Sub")} confirmLabel={t("confirm")} danger onCancel={() => setReset(0)} onConfirm={() => setReset(2)} />
      <Dialog
        open={reset === 2}
        title={t("set.resetConfirm2")}
        message={t("set.resetConfirm2Sub")}
        confirmLabel={t("set.resetDo")}
        danger
        onCancel={() => setReset(0)}
        onConfirm={() => { setReset(0); onClose(); resetAll(); }}
      />
    </>
  );
}
