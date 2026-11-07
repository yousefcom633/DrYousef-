"use client";

import { useState } from "react";
import { Bell, ChevronRight, ListChecks, Gift, Star } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Task } from "@/lib/types";
import { askNotifPermission, notifySupported } from "@/lib/fx";
import { todayKey, uid } from "@/lib/utils";
import { Btn, Segmented, Toggle, inputCls, IconBox, StarGlyph, cx } from "./ui";

export default function Onboarding() {
  const { t, data, updateSettings, saveTask, finishOnboarding, fmt } = useApp();
  const s = data.settings;
  const [step, setStep] = useState(0);
  const [first, setFirst] = useState("");
  const [samples, setSamples] = useState(true);
  const last = 5;

  const finish = async (askNotif: boolean) => {
    if (askNotif && notifySupported() && Notification.permission === "default") await askNotifPermission();
    if (first.trim()) {
      const task: Task = {
        id: uid(), title: first.trim(), notes: "", date: todayKey(), time: "", remind: false, priority: "important", stars: s.starsMedium,
        categoryId: data.categories[0]?.id ?? "study", subtasks: [], repeat: { type: "none", days: [], every: 2 }, pomos: 0, pomosDone: 0,
        done: false, paid: 0, archived: false, createdAt: new Date().toISOString(),
      };
      saveTask(task);
    }
    finishOnboarding(samples);
  };

  const slides = [
    { icon: <ListChecks size={64} strokeWidth={1.8} />, g: "linear-gradient(145deg,#8F86FF,#5B8CFF)", t: t("ob.1.t"), d: t("ob.1.d") },
    { icon: <Star size={64} strokeWidth={1.8} className="fill-white" />, g: "linear-gradient(145deg,#FFD36B,#FF9F0A)", t: t("ob.2.t"), d: t("ob.2.d") },
    { icon: <Gift size={64} strokeWidth={1.8} />, g: "linear-gradient(145deg,#FF8FB1,#AF52DE)", t: t("ob.3.t"), d: t("ob.3.d") },
  ];
  const sug = [t("ob.sug1"), t("ob.sug2"), t("ob.sug3")];

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-[600px] flex-col overflow-hidden px-6 pt-[calc(20px+var(--safe-t))] pb-[calc(24px+var(--safe-b))]">
      <div className="pointer-events-none absolute -top-32 -start-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex h-11 items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: last + 1 }).map((_, i) => (
            <span key={i} className={cx("h-2 rounded-full transition-all duration-500", i === step ? "w-6 grad-accent" : "w-2 bg-card2")} />
          ))}
        </div>
        {step < 3 && <button onClick={() => setStep(3)} className="press min-h-11 px-3 text-sm font-bold text-muted">{t("skip")}</button>}
      </div>

      <div key={step} className="anim-rise relative flex flex-1 flex-col items-center justify-center overflow-y-auto text-center">
        {step < 3 && (
          <>
            <div className="relative mb-10 anim-float">
              <div className="absolute -inset-6 rounded-full opacity-40 blur-2xl" style={{ background: slides[step].g }} />
              <div className="relative grid h-40 w-40 place-items-center rounded-[48px] text-white shadow-2xl" style={{ background: slides[step].g }}>{slides[step].icon}</div>
              <span className="anim-twinkle absolute -top-3 -end-4 text-3xl">✨</span>
              <span className="anim-twinkle absolute -bottom-2 -start-5 text-2xl" style={{ animationDelay: ".9s" }}>⭐</span>
            </div>
            <h1 className="text-[32px] font-black">{slides[step].t}</h1>
            <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-muted">{slides[step].d}</p>
          </>
        )}
        {step === 3 && (
          <div className="w-full max-w-sm space-y-6 text-start">
            <h1 className="text-center text-[30px] font-black">{t("ob.setup")}</h1>
            <div>
              <div className="mb-2 px-1 text-[13px] font-bold text-muted">{t("ob.chooseLang")}</div>
              <Segmented value={s.lang} onChange={(v) => updateSettings({ lang: v, name: s.name === "دكتور يوسف" || s.name === "Dr. Yousef" ? (v === "ar" ? "دكتور يوسف" : "Dr. Yousef") : s.name })} options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]} />
            </div>
            <div>
              <div className="mb-2 px-1 text-[13px] font-bold text-muted">{t("ob.chooseTheme")}</div>
              <Segmented value={s.theme} onChange={(v) => updateSettings({ theme: v })} options={[{ value: "auto", label: t("set.theme.auto") }, { value: "light", label: t("set.theme.light") }, { value: "dark", label: t("set.theme.dark") }]} />
            </div>
            <div>
              <div className="mb-2 px-1 text-[13px] font-bold text-muted">{t("ob.yourName")}</div>
              <input value={s.name} onChange={(e) => updateSettings({ name: e.target.value })} className={cx(inputCls, "!text-lg font-bold")} maxLength={24} />
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="w-full max-w-sm space-y-4 text-start">
            <h1 className="text-center text-[28px] font-black">{t("ob.firstTask")}</h1>
            <p className="text-center text-muted">{t("ob.firstTaskSub")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {sug.map((x) => (
                <button key={x} onClick={() => setFirst(x)} className={cx("press min-h-11 rounded-full px-4 text-sm font-bold ring-1", first === x ? "grad-accent text-white ring-transparent" : "bg-card ring-line")}>{x}</button>
              ))}
            </div>
            <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder={t("tasks.titlePh")} className={cx(inputCls, "!text-lg font-bold")} maxLength={120} />
            <div className="flex min-h-14 items-center justify-between rounded-2xl bg-card px-4">
              <span className="font-bold">{t("ob.keepSamples")}</span>
              <Toggle on={samples} onChange={setSamples} label={t("ob.keepSamples")} />
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="w-full max-w-sm space-y-5">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-[32px] grad-accent text-white anim-float"><Bell size={44} /></div>
            <h1 className="text-[28px] font-black">{t("ob.notifTitle")}</h1>
            <p className="text-[16px] leading-relaxed text-muted">{t("ob.notifSub")}</p>
            <div className="rounded-3xl bg-card p-4 text-start card-shadow">
              <div className="mb-1 font-extrabold">{t("ob.rewardsTitle")}</div>
              <div className="mb-3 text-sm text-muted">{t("ob.rewardsSub")}</div>
              <div className="flex flex-wrap gap-2">
                {data.rewards.slice(0, 5).map((r) => (
                  <span key={r.id} className="flex items-center gap-1.5 rounded-full bg-card2 py-1 ps-1 pe-3 text-xs font-bold">
                    <IconBox icon={r.icon} color={r.color} size={24} />{r.title}<span className="flex items-center text-gold-ink">{fmt(r.price)}<StarGlyph size={11} /></span>
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-gold/15 py-3 text-center font-extrabold text-gold-ink">{t("ob.welcomeGift", { n: fmt(5) })}</div>
          </div>
        )}
      </div>

      <div className="relative space-y-2 pt-3">
        {step < last ? (
          <Btn size="lg" className="w-full" onClick={() => setStep(step + 1)}>
            {step < 3 ? t("next") : t("next")}
            <ChevronRight size={20} className="rtl:rotate-180" />
          </Btn>
        ) : (
          <>
            <Btn size="lg" variant="gold" className="w-full" onClick={() => finish(true)}>{t("ob.notifYes")}</Btn>
            <Btn variant="ghost" className="w-full" onClick={() => finish(false)}>{t("ob.notifLater")}</Btn>
          </>
        )}
      </div>
    </div>
  );
}
