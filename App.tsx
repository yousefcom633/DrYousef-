"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Gift, ListChecks, Plus, Timer, UserRound } from "lucide-react";
import { AppProvider, useApp, type TabId } from "@/lib/store";
import { confetti, playSound } from "@/lib/fx";
import { Btn, IconBox, cx } from "./ui";
import Onboarding from "./Onboarding";
import TaskSheet from "./TaskSheet";
import Today from "./screens/Today";
import Tasks from "./screens/Tasks";
import Focus from "./screens/Focus";
import Store from "./screens/Store";
import Profile from "./screens/Profile";

function Splash() {
  const { t } = useApp();
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center" style={{ background: "linear-gradient(160deg,#8B7BFF,#6C63FF 55%,#4A7DFF)" }}>
      <div className="flex flex-col items-center gap-6 text-white">
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-white/25 blur-2xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-512.png" alt="" width={128} height={128} className="relative rounded-[34px] shadow-2xl" style={{ animation: "splashStar 0.9s cubic-bezier(.3,1.3,.5,1) both" }} />
          <span className="anim-twinkle absolute -top-3 -end-3 text-3xl">✨</span>
        </div>
        <div className="text-center" style={{ animation: "riseIn .7s .5s both" }}>
          <div className="text-[28px] font-black tracking-tight">{t("appName")}</div>
          <div className="mt-1 text-sm font-semibold opacity-85">{t("appTagline")}</div>
        </div>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-t)+10px)] z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className="anim-pop glass pointer-events-auto flex max-w-[92%] items-center gap-3 rounded-full py-2.5 ps-5 pe-2.5 text-[15px] font-bold shadow-xl ring-1 ring-line">
          <span>{x.msg}</span>
          {x.action && (
            <button onClick={x.action.fn} className="press min-h-9 rounded-full bg-accent px-4 text-sm font-extrabold text-white">{x.action.label}</button>
          )}
        </div>
      ))}
    </div>
  );
}

function GiftModal() {
  const { giftModal, closeGift, t, fmt } = useApp();
  const [open, setOpen] = useState(false);
  const idRef = useRef("");
  useEffect(() => {
    if (giftModal && idRef.current !== giftModal.id) {
      idRef.current = giftModal.id;
      setOpen(false);
    }
  }, [giftModal]);
  if (!giftModal) return null;
  const reveal = () => {
    if (open) return;
    setOpen(true);
    playSound("buy");
    confetti(undefined, window.innerHeight * 0.38, 90);
    setTimeout(() => confetti(window.innerWidth * 0.25, window.innerHeight * 0.5, 40), 250);
    setTimeout(() => confetti(window.innerWidth * 0.75, window.innerHeight * 0.5, 40), 400);
  };
  return (
    <div className="fixed inset-0 z-[75] grid place-items-center p-6" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/60 backdrop-blur-md" onClick={open ? closeGift : undefined} />
      <div className="relative flex w-full max-w-sm flex-col items-center text-center text-white">
        {!open ? (
          <button onClick={reveal} aria-label={t("store.openGift")} className="press flex flex-col items-center gap-6">
            <div className="relative" style={{ animation: "shake 1.1s ease-in-out infinite" }}>
              <div className="absolute -inset-10 rounded-full bg-gold/40 blur-3xl" />
              <div className="relative grid h-44 w-44 place-items-center rounded-[48px] shadow-2xl" style={{ background: "linear-gradient(145deg,#FF8FB1,#AF52DE)" }}>
                <Gift size={92} className="text-white" strokeWidth={1.6} />
              </div>
            </div>
            <div className="text-2xl font-black">{t("store.openGift")}</div>
            <div className="text-sm opacity-80">{t("store.tapOpen")}</div>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4" style={{ animation: "giftPop .7s cubic-bezier(.3,1.4,.5,1) both" }}>
            <div className="text-sm font-bold opacity-85">{t("store.purchased")}</div>
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-gold/45 blur-3xl" />
              {giftModal.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={giftModal.image} alt="" className="relative h-40 w-40 rounded-[44px] object-cover shadow-2xl" />
              ) : (
                <IconBox icon={giftModal.icon} color={giftModal.color} size={160} className="relative !rounded-[44px]" />
              )}
              <span className="anim-twinkle absolute -top-4 -end-4 text-4xl">✨</span>
              <span className="anim-twinkle absolute -bottom-3 -start-5 text-3xl" style={{ animationDelay: ".7s" }}>⭐</span>
            </div>
            <h2 className="text-3xl font-black">{giftModal.title}</h2>
            <p className="text-[15px] opacity-85">{t("store.enjoy")}</p>
            <div className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-extrabold">−{fmt(giftModal.price)} ⭐</div>
            <Btn variant="gold" size="lg" className="mt-2 w-56" onClick={closeGift}>{t("done")}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBar() {
  const { tab, setTab, t, openTask } = useApp();
  const tabs: { id: TabId; icon: typeof Timer }[] = [
    { id: "today", icon: CalendarCheck },
    { id: "tasks", icon: ListChecks },
    { id: "focus", icon: Timer },
    { id: "store", icon: Gift },
    { id: "profile", icon: UserRound },
  ];
  return (
    <>
      <button
        aria-label={t("a11y.add")}
        onClick={() => openTask()}
        className="press grad-accent fixed z-40 grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_12px_28px_-8px_var(--accent)] end-[max(16px,calc(50%-284px))]"
        style={{ bottom: "calc(86px + var(--safe-b))" }}
      >
        <Plus size={28} strokeWidth={2.6} />
      </button>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center" aria-label="Tabs">
        <div className="glass flex w-full max-w-[600px] items-stretch justify-around border-t border-line px-2 pt-2 pb-[calc(8px+var(--safe-b))] sm:mb-3 sm:rounded-[28px] sm:border sm:shadow-xl">
          {tabs.map((x) => {
            const on = tab === x.id;
            return (
              <button
                key={x.id}
                onClick={() => setTab(x.id)}
                aria-current={on ? "page" : undefined}
                className="press flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5"
              >
                <span className={cx("grid h-8 w-14 place-items-center rounded-full transition-all duration-300", on ? "bg-accent/15 text-accent" : "text-muted")}>
                  <x.icon size={22} strokeWidth={on ? 2.4 : 2} />
                </span>
                <span className={cx("text-[11px] font-bold", on ? "text-accent" : "text-muted")}>{t(`tab.${x.id}`)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function Shell() {
  const { ready, data, tab, deepFocus } = useApp();
  const [minDone, setMinDone] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => setMinDone(true), 1500);
    return () => clearTimeout(h);
  }, []);

  if (!ready || !minDone) return <Splash />;
  if (!data.onboarded)
    return (
      <>
        <Onboarding />
        <Toasts />
      </>
    );
  const Screen = { today: Today, tasks: Tasks, focus: Focus, store: Store, profile: Profile }[tab];
  return (
    <>
      <main className="relative mx-auto h-dvh w-full max-w-[600px] overflow-hidden">
        <div key={tab} className="anim-fade absolute inset-0">
          <Screen />
        </div>
      </main>
      {!deepFocus && <TabBar />}
      <TaskSheet />
      <GiftModal />
      <Toasts />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
