"use client";

import { useMemo, useState } from "react";
import { Lock, Settings as Cog } from "lucide-react";
import { useApp } from "@/lib/store";
import { addDays, badgeList, isoKey, levelInfo, parseKey, todayKey, totalEarned, totalSpent, weekDays, weekStart } from "@/lib/utils";
import { Bar, Btn, Card, Empty, IconBox, IconBtn, Page, SectionTitle, StarGlyph, cx } from "../ui";
import SettingsSheet from "../SettingsSheet";

export default function Profile() {
  const { t, fmt, fmtDate, data, streak } = useApp();
  const s = data.settings;
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const today = todayKey();
  const earned = totalEarned(data.txs);
  const lv = levelInfo(earned);
  const badges = badgeList(data);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    data.tasks.forEach((x) => x.done && x.doneAt && (m[isoKey(x.doneAt)] = (m[isoKey(x.doneAt)] ?? 0) + 1));
    return m;
  }, [data.tasks]);

  const wk = weekDays(weekStart());
  const wkVals = wk.map((k) => counts[k] ?? 0);
  const wkMax = Math.max(3, ...wkVals);
  const sumDays = (n: number) => Array.from({ length: n }, (_, i) => counts[addDays(today, -i)] ?? 0).reduce((a, b) => a + b, 0);
  const month = Object.entries(counts).filter(([k]) => k.slice(0, 7) === today.slice(0, 7)).reduce((a, [, v]) => a + v, 0);
  const focusSec = data.sessions.reduce((a, b) => a + b.seconds, 0);
  const focusText = focusSec >= 3600 ? `${fmt((focusSec / 3600).toFixed(1).replace(/\.0$/, ""))} ${t("hours")}` : `${fmt(Math.round(focusSec / 60))} ${t("min")}`;

  // heatmap: 12 weeks, columns = weeks
  const hmStart = addDays(weekStart(), -7 * 11);
  const cells = Array.from({ length: 84 }, (_, i) => addDays(hmStart, i));
  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
  const heat = ["var(--card2)", "color-mix(in srgb,var(--accent) 25%,var(--card2))", "color-mix(in srgb,var(--accent) 50%,var(--card2))", "color-mix(in srgb,var(--accent) 75%,var(--card2))", "var(--accent)"];

  const txs = [...data.txs].reverse();
  const shown = all ? txs : txs.slice(0, 6);

  const stat = (label: string, value: string, icon: string, color: string) => (
    <Card className="flex items-center gap-3 p-3.5">
      <IconBox icon={icon} color={color} size={40} />
      <div className="min-w-0">
        <div className="truncate text-[19px] leading-tight font-black">{value}</div>
        <div className="truncate text-xs font-bold text-muted">{label}</div>
      </div>
    </Card>
  );

  return (
    <>
      <Page title={t("profile.title")} right={<IconBtn label={t("profile.settings")} onClick={() => setOpen(true)} className="bg-card text-ink shadow-sm ring-1 ring-line"><Cog size={20} /></IconBtn>}>
        {/* Hero */}
        <div className="grad-accent anim-rise relative overflow-hidden rounded-[30px] p-5 text-white shadow-[0_18px_40px_-18px_var(--accent)]">
          <div className="absolute -top-12 -end-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-[26px] bg-white/25 text-4xl backdrop-blur">
              {s.avatar.startsWith("data:") ? <img src={s.avatar} alt="" className="h-full w-full object-cover" /> : s.avatar}
            </div>
            <div className="min-w-0">
              <div className="truncate text-2xl font-black">{s.name}</div>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-sm font-extrabold">
                {t(`profile.title.${lv.title}`)} · {t("profile.level", { n: fmt(lv.level) })}
              </div>
            </div>
          </div>
          <div className="relative mt-5">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-[width] duration-700" style={{ width: `${Math.max(3, lv.progress * 100)}%` }} /></div>
            <div className="mt-2 text-[13px] font-bold opacity-90">{t("profile.toNext", { n: fmt(lv.next - earned) })}</div>
          </div>
        </div>

        <SectionTitle>{t("profile.stats")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {stat(t("profile.doneToday"), fmt(counts[today] ?? 0), "listChecks", "#34C759")}
          {stat(t("profile.doneWeek"), fmt(sumDays(7)), "listChecks", "#5B8CFF")}
          {stat(t("profile.doneMonth"), fmt(month), "listChecks", "#6C63FF")}
          {stat(t("profile.bestStreak"), fmt(streak.best), "flame", "#FF6B35")}
          {stat(t("profile.earned"), fmt(earned), "star", "#FFB020")}
          {stat(t("profile.spent"), fmt(totalSpent(data.txs)), "gift", "#FF5A8A")}
          <div className="col-span-2">{stat(t("profile.focusTotal"), focusText, "timer", "#AF52DE")}</div>
        </div>

        <SectionTitle>{t("profile.weekChart")}</SectionTitle>
        <Card className="p-4">
          <div className="flex h-36 items-end justify-between gap-2" dir="ltr">
            {wk.map((k, i) => (
              <div key={k} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="text-[11px] font-extrabold text-muted">{wkVals[i] || ""}</div>
                <div className="flex w-full flex-1 items-end">
                  <div className={cx("w-full rounded-xl transition-[height] duration-700", k === today ? "grad-accent" : "bg-accent/30")} style={{ height: `${Math.max(6, (wkVals[i] / wkMax) * 100)}%` }} />
                </div>
                <div className={cx("text-[11px] font-bold", k === today ? "text-accent" : "text-muted")}>{fmtDate(k, { weekday: "short" })}</div>
              </div>
            ))}
          </div>
        </Card>

        <SectionTitle>{t("profile.heatmap")}</SectionTitle>
        <Card className="p-4">
          <div dir="ltr" className="grid grid-flow-col grid-rows-7 gap-1.5" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
            {cells.map((k) => (
              <div key={k} title={`${fmtDate(k)} · ${counts[k] ?? 0}`} className="aspect-square rounded-[5px]" style={{ background: parseKey(k) > new Date() ? "transparent" : heat[level(counts[k] ?? 0)], outline: k === today ? "2px solid var(--accent)" : "none" }} />
            ))}
          </div>
        </Card>

        <SectionTitle>{t("profile.badges")}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {badges.map((b) => (
            <Card key={b.id} className={cx("relative flex items-center gap-3 p-3", !b.ok && "opacity-80")}>
              <div className={cx(!b.ok && "grayscale-[0.9] opacity-60")}><IconBox icon={b.icon} color={b.color} size={46} /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">{t(`badge.${b.id}`)}</div>
                <div className="truncate text-[11px] font-semibold text-muted">{t(`badge.${b.id}.d`)}</div>
                {!b.ok && <Bar className="mt-1.5 !h-1.5" value={b.progress} />}
              </div>
              {!b.ok && <Lock size={13} className="absolute top-2.5 end-2.5 text-muted" />}
            </Card>
          ))}
        </div>

        <SectionTitle>{t("profile.wallet")}</SectionTitle>
        {txs.length === 0 ? (
          <Card><Empty icon="wallet" title={t("profile.walletEmpty")} /></Card>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {shown.map((x) => (
              <div key={x.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <div className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full", x.amount > 0 ? "bg-ok/15" : "bg-danger/12")}><StarGlyph size={17} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{x.reason}</div>
                  <div className="text-[11px] font-semibold text-muted">{fmtDate(isoKey(x.at), { day: "numeric", month: "short" })} · {fmt(new Date(x.at).toTimeString().slice(0, 5))}</div>
                </div>
                <div className={cx("text-[15px] font-black tabular-nums", x.amount > 0 ? "text-ok" : "text-danger")} dir="ltr">{x.amount > 0 ? "+" : "−"}{fmt(Math.abs(x.amount))}</div>
              </div>
            ))}
          </Card>
        )}
        {txs.length > 6 && <Btn variant="ghost" className="mt-3 w-full" onClick={() => setAll(!all)}>{all ? t("profile.showLess") : t("profile.showAll")}</Btn>}
        <Btn variant="soft" className="mt-5 w-full" size="lg" onClick={() => setOpen(true)}><Cog size={18} />{t("profile.settings")}</Btn>
      </Page>
      <SettingsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
