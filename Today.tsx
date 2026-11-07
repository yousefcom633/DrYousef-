"use client";

import { useMemo, useRef } from "react";
import { Flame, Gift, Play, Quote, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { isoKey, sortSmart, todayKey, weekStart } from "@/lib/utils";
import { rectCenter } from "@/lib/fx";
import { Bar, Btn, Card, Empty, IconBox, Page, Ring, SectionTitle, StarGlyph, cx } from "../ui";
import TaskRow from "../TaskRow";

export default function Today() {
  const { t, fmt, fmtDate, data, balance, streak, setTab, openTask, claimGift, timerSetTask, timerSetKind } = useApp();
  const s = data.settings;
  const today = todayKey();
  const hour = new Date().getHours();
  const greet = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "noon" : hour < 21 ? "evening" : "night";
  const emoji = hour < 5 ? "🌙" : hour < 12 ? "☀️" : hour < 17 ? "🌤️" : hour < 21 ? "🌆" : "🌙";
  const giftRef = useRef<HTMLButtonElement>(null);

  const todayStars = useMemo(
    () => data.txs.filter((x) => x.amount > 0 && isoKey(x.at) === today).reduce((a, b) => a + b.amount, 0),
    [data.txs, today],
  );

  const list = useMemo(
    () => data.tasks.filter((x) => !x.archived && (x.date === today || (x.date < today && x.date !== "" && !x.done))).sort((a, b) => Number(a.done) - Number(b.done) || sortSmart(a, b)),
    [data.tasks, today],
  );
  const dueToday = data.tasks.filter((x) => !x.archived && x.date === today);
  const doneToday = dueToday.filter((x) => x.done).length;
  const progress = dueToday.length ? doneToday / dueToday.length : 0;
  const nextTask = list.find((x) => !x.done);

  const goal = useMemo(() => {
    const avail = data.rewards.filter((r) => !r.hidden && (r.repeatable || !data.purchases.some((p) => p.rewardId === r.id)));
    const pinned = avail.find((r) => r.pinned);
    if (pinned) return { r: pinned, pinned: true };
    const up = avail.filter((r) => r.price > balance).sort((a, b) => a.price - b.price)[0];
    if (up) return { r: up, pinned: false };
    const ok = avail.sort((a, b) => b.price - a.price)[0];
    return ok ? { r: ok, pinned: false } : null;
  }, [data.rewards, data.purchases, balance]);

  const ws = weekStart();
  const weekDone = data.tasks.filter((x) => x.done && x.doneAt && weekStart(new Date(x.doneAt)) === ws).length;
  const weekClaimed = data.txs.some((x) => x.ref === `week:${ws}`);
  const quote = t(`quote.${new Date().getDate() % 7}`);
  const mood = progress >= 1 ? 3 : progress >= 0.5 ? 2 : doneToday > 0 ? 1 : 0;
  const face = ["😴", "🙂", "😄", "🤩"][mood];

  return (
    <Page title={`${t(`greet.${greet}`)}${data.settings.lang === "ar" ? "،" : ","} ${s.name} ${emoji}`}>
      <p className="-mt-2 mb-4 text-sm font-semibold text-muted">{fmtDate(today, { weekday: "long", day: "numeric", month: "long" })}</p>

      {/* Stars card */}
      <div className="grad-gold shine anim-rise relative overflow-hidden rounded-[30px] p-5 text-[#3d2500] shadow-[0_18px_40px_-18px_#ffb020]">
        <div className="absolute -top-10 -end-8 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-sm font-bold opacity-80">{t("today.balance")}</div>
            <div className="mt-1 flex items-center gap-2 text-[56px] leading-none font-black tracking-tight">
              {fmt(balance)}
              <span className="anim-twinkle text-4xl">⭐</span>
            </div>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/30 text-3xl backdrop-blur">{s.avatar.startsWith("data:") ? <img src={s.avatar} alt="" className="h-full w-full rounded-2xl object-cover" /> : s.avatar}</div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/35 px-3.5 py-2.5 backdrop-blur">
            <div className="text-xs font-bold opacity-75">{t("today.todayStars")}</div>
            <div className="text-xl font-black">+{fmt(todayStars)}</div>
          </div>
          <div className="rounded-2xl bg-white/35 px-3.5 py-2.5 backdrop-blur">
            <div className="text-xs font-bold opacity-75">{t("today.streak")}</div>
            <div className="flex items-center gap-1 text-xl font-black"><Flame size={20} className="fill-[#ff6b35] text-[#ff6b35]" />{fmt(streak.current)}</div>
          </div>
        </div>
      </div>

      {/* Daily gift */}
      {data.lastGift !== today && (
        <button
          ref={giftRef}
          onClick={() => claimGift(rectCenter(giftRef.current))}
          className="press anim-rise mt-4 flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-start card-shadow ring-2 ring-accent/30"
          style={{ animation: "riseIn .45s both, ringPulse 2s 1s infinite" }}
        >
          <div className="anim-float grid h-14 w-14 place-items-center rounded-2xl grad-accent text-white"><Gift size={28} /></div>
          <div className="flex-1">
            <div className="text-[17px] font-extrabold">{t("today.giftTitle")}</div>
            <div className="text-sm text-muted">{t("today.giftSub")}</div>
          </div>
          <Sparkles className="text-gold" />
        </button>
      )}

      {/* Progress */}
      <Card className="anim-rise mt-4 flex items-center gap-5 p-5">
        <Ring size={104} stroke={11} progress={progress} colors={["#5FD97F", "#34C759"]}>
          <div className="text-center">
            <div className="text-2xl font-black">{fmt(`${Math.round(progress * 100)}%`)}</div>
          </div>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold">{t("today.progress")}</div>
          <div className="mt-0.5 text-sm text-muted">{t("today.progressSub", { a: fmt(doneToday), b: fmt(dueToday.length) })}</div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-card2 px-3 py-2 text-[13px] font-semibold">
            <span className="text-2xl">{face}</span>
            <span>{t(`today.companion${mood}`)}</span>
          </div>
        </div>
      </Card>

      {/* Quote */}
      {s.quotes && (
        <div className="anim-rise mt-4 flex items-start gap-3 rounded-3xl bg-accent/10 p-4">
          <Quote size={20} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-[15px] leading-relaxed font-semibold">{quote}</p>
        </div>
      )}

      {/* Next task */}
      {nextTask && (
        <>
          <SectionTitle>{t("today.nextTask")}</SectionTitle>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <IconBox icon={data.categories.find((c) => c.id === nextTask.categoryId)?.icon ?? "star"} color={data.categories.find((c) => c.id === nextTask.categoryId)?.color} size={46} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-extrabold">{nextTask.title}</div>
                <div className="flex items-center gap-1 text-sm font-bold text-gold-ink">+{fmt(nextTask.stars)} <StarGlyph size={14} /></div>
              </div>
              <Btn
                size="md"
                onClick={() => { timerSetKind("pomodoro"); timerSetTask(nextTask.id); setTab("focus"); }}
                aria-label={t("today.startFocus")}
              >
                <Play size={16} className="fill-white rtl:scale-x-[-1]" />
                {t("today.startFocus")}
              </Btn>
            </div>
          </Card>
        </>
      )}

      {/* Nearest reward */}
      {goal && (
        <>
          <SectionTitle>{goal.pinned ? t("today.goal") : t("today.nearest")}</SectionTitle>
          <Card onClick={() => setTab("store")} className="p-4">
            <div className="flex items-center gap-3">
              {goal.r.image ? <img src={goal.r.image} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : <IconBox icon={goal.r.icon} color={goal.r.color} size={48} />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-extrabold">{goal.r.title}</div>
                <div className={cx("text-sm font-semibold", balance >= goal.r.price ? "text-ok" : "text-muted")}>
                  {balance >= goal.r.price ? t("today.unlocked") : t("today.needMore", { n: fmt(goal.r.price - balance) })}
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-sm font-extrabold text-gold-ink">{fmt(goal.r.price)}<StarGlyph size={14} /></div>
            </div>
            <Bar className="mt-3" gold value={Math.min(1, balance / goal.r.price)} />
            <div className="mt-1.5 text-xs font-semibold text-muted">{t("store.have", { a: fmt(Math.min(balance, goal.r.price)), b: fmt(goal.r.price) })}</div>
          </Card>
        </>
      )}

      {/* Weekly challenge */}
      <Card className="mt-4 p-4">
        <div className="flex items-center gap-3">
          <IconBox icon="trophy" color="#AF52DE" size={44} />
          <div className="min-w-0 flex-1">
            <div className="font-extrabold">{weekClaimed ? t("today.weeklyDone") : t("today.weekly")}</div>
            <div className="text-[13px] text-muted">{t("today.weeklySub", { n: fmt(s.weeklyGoal), b: fmt(s.weeklyBonus) })}</div>
          </div>
          <div className="text-sm font-extrabold tabular-nums">{fmt(`${Math.min(weekDone, s.weeklyGoal)}/${s.weeklyGoal}`)}</div>
        </div>
        <Bar className="mt-3" value={Math.min(1, weekDone / Math.max(1, s.weeklyGoal))} />
      </Card>

      {/* Tasks */}
      <SectionTitle>{t("today.tasks")}</SectionTitle>
      {list.length === 0 ? (
        <Card>
          <Empty icon="sparkles" title={t("today.noTasks")} sub={t("today.noTasksSub")} action={<Btn onClick={() => openTask()}>{t("tasks.new")}</Btn>} />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((x) => (
            <TaskRow key={x.id} task={x} />
          ))}
          {progress >= 1 && dueToday.length > 0 && <div className="anim-pop rounded-3xl bg-ok/12 p-4 text-center font-extrabold text-ok">{t("today.allDone")}</div>}
          <p className="pt-1 text-center text-xs text-muted">{t("tasks.swipeHint")}</p>
        </div>
      )}
    </Page>
  );
}
