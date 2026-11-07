"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Lock, Pencil, Plus, Target, Trash2, Eye, EyeOff, Repeat, ShoppingBag, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Purchase, Reward, RewardCat } from "@/lib/types";
import { compressImage, isoKey, uid } from "@/lib/utils";
import { haptic } from "@/lib/fx";
import { Bar, Btn, Card, Chip, Dialog, Empty, Field, IconBtn, IconBox, Page, Segmented, Sheet, StarGlyph, Toggle, cx, inputCls } from "../ui";
import { COLORS, ICONS, REWARD_ICONS } from "../icons";

const CATS: RewardCat[] = ["entertainment", "food", "shopping", "rest", "other"];

function Cover({ r, size = 96 }: { r: { icon: string; color: string; image?: string }; size?: number }) {
  const I = ICONS[r.icon] ?? ICONS.gift;
  return (
    <div
      className="relative grid w-full place-items-center overflow-hidden"
      style={{ height: size, background: `linear-gradient(145deg, color-mix(in srgb, ${r.color} 55%, white), ${r.color})` }}
    >
      {r.image ? <img src={r.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <I size={size * 0.45} className="text-white drop-shadow-md" strokeWidth={1.9} />}
    </div>
  );
}

export default function Store() {
  const { t, fmt, data, balance, buyReward, useReward, pinReward, toast } = useApp();
  const [mode, setMode] = useState<"shop" | "mine">("shop");
  const [cat, setCat] = useState<"all" | RewardCat>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [edit, setEdit] = useState<Reward | null>(null);
  const [confirm, setConfirm] = useState<Reward | null>(null);

  const bought = (r: Reward) => data.purchases.some((p) => p.rewardId === r.id);
  const list = data.rewards
    .filter((r) => (showHidden || !r.hidden) && (cat === "all" || r.category === cat) && (r.repeatable || !bought(r)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.price - b.price);
  const hiddenCount = data.rewards.filter((r) => r.hidden).length;
  const unused = data.purchases.filter((p) => !p.usedAt);
  const used = data.purchases.filter((p) => p.usedAt);

  const tryBuy = (r: Reward) => {
    if (balance < r.price) {
      haptic("heavy");
      toast(t("store.notEnough", { n: fmt(r.price - balance) }));
      return;
    }
    setConfirm(r);
  };

  const newReward = (): Reward => ({ id: uid(), title: "", price: 30, icon: "gift", color: COLORS[1], category: "other", note: "", repeatable: true, hidden: false, pinned: false, createdAt: new Date().toISOString() });

  return (
    <>
      <Page title={t("store.title")} right={<IconBtn label={t("store.new")} onClick={() => setEdit(newReward())} className="grad-accent text-white"><Plus size={20} /></IconBtn>}>
        <div className="grad-gold shine relative mb-4 flex items-center justify-between overflow-hidden rounded-3xl p-4 text-[#3d2500]">
          <div>
            <div className="text-sm font-bold opacity-75">{t("store.balance")}</div>
            <div className="flex items-center gap-1.5 text-4xl font-black">{fmt(balance)} <span className="anim-twinkle text-2xl">⭐</span></div>
          </div>
          <ShoppingBag size={44} className="opacity-35" />
        </div>

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "shop", label: t("store.shop") },
            { value: "mine", label: <span>{t("store.mine")}{unused.length > 0 && <b className="ms-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-white">{fmt(unused.length)}</b>}</span> },
          ]}
        />

        {mode === "shop" ? (
          <>
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
              <Chip active={cat === "all"} onClick={() => setCat("all")}>{t("store.all")}</Chip>
              {CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{t(`store.${c}`)}</Chip>)}
              {hiddenCount > 0 && <Chip active={showHidden} onClick={() => setShowHidden(!showHidden)}><EyeOff size={14} />{t("store.showHidden")}</Chip>}
            </div>

            {list.length === 0 ? (
              <Card className="mt-4"><Empty icon="gift" title={t("store.empty")} sub={t("store.emptySub")} action={<Btn onClick={() => setEdit(newReward())}>{t("store.new")}</Btn>} /></Card>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {list.map((r, i) => {
                  const can = balance >= r.price;
                  return (
                    <div
                      key={r.id}
                      className={cx("anim-rise relative flex flex-col overflow-hidden rounded-[26px] bg-card card-shadow", can && "ring-2 ring-gold shadow-[0_10px_30px_-10px_#ffb020]", r.hidden && "opacity-60")}
                      style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                    >
                      <div className="relative">
                        <div className={cx(!can && "saturate-[.35] brightness-95")}><Cover r={r} /></div>
                        {!can && <div className="absolute inset-0 grid place-items-center bg-black/25"><Lock size={26} className="text-white" /></div>}
                        {can && <div className="absolute inset-0 overflow-hidden"><div className="shine absolute inset-0" /></div>}
                        <button aria-label={r.pinned ? t("store.unpin") : t("store.pin")} onClick={() => { haptic("light"); pinReward(r.id); }} className={cx("press absolute top-2 start-2 grid h-9 w-9 place-items-center rounded-full backdrop-blur", r.pinned ? "bg-white text-accent" : "bg-black/25 text-white")}>
                          <Target size={17} />
                        </button>
                        <button aria-label={t("edit")} onClick={() => setEdit(r)} className="press absolute top-2 end-2 grid h-9 w-9 place-items-center rounded-full bg-black/25 text-white backdrop-blur">
                          <Pencil size={15} />
                        </button>
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <div className="flex items-start justify-between gap-1">
                          <div className="line-clamp-2 min-h-10 text-[15px] leading-5 font-extrabold">{r.title}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-sm font-black text-gold-ink">{fmt(r.price)}<StarGlyph size={14} /></span>
                          {r.pinned && <span className="text-[11px] font-bold text-accent">{t("store.pinned")}</span>}
                          {!r.repeatable && <span className="text-[11px] font-bold text-muted">{t("store.oneTime")}</span>}
                        </div>
                        {can ? (
                          <Btn variant="gold" size="sm" className="mt-auto w-full" onClick={() => tryBuy(r)}><Sparkles size={15} />{t("store.buyNow")}</Btn>
                        ) : (
                          <div className="mt-auto">
                            <Bar value={balance / r.price} gold />
                            <div className="mt-1.5 text-[11px] font-bold text-muted">{t("store.have", { a: fmt(balance), b: fmt(r.price) })}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="mt-4 space-y-3">
            {data.purchases.length === 0 ? (
              <Card><Empty icon="gift" title={t("store.noPurchases")} sub={t("store.noPurchasesSub")} action={<Btn variant="soft" onClick={() => setMode("shop")}>{t("store.shop")}</Btn>} /></Card>
            ) : (
              <>
                {unused.map((p) => <PurchaseCard key={p.id} p={p} onUse={() => useReward(p.id)} />)}
                {used.length > 0 && <div className="px-1 pt-3 text-sm font-extrabold text-muted">{t("store.usedList")}</div>}
                {used.map((p) => <PurchaseCard key={p.id} p={p} />)}
              </>
            )}
          </div>
        )}
      </Page>

      <RewardSheet reward={edit} onClose={() => setEdit(null)} />
      <Dialog
        open={!!confirm}
        title={t("store.confirmTitle")}
        message={confirm ? t("store.confirmMsg", { title: confirm.title, price: fmt(confirm.price) }) : ""}
        confirmLabel={t("store.buyNow")}
        icon={confirm && <IconBox icon={confirm.icon} color={confirm.color} size={60} />}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) buyReward(confirm.id);
          setConfirm(null);
          setMode("shop");
        }}
      />
    </>
  );
}

function PurchaseCard({ p, onUse }: { p: Purchase; onUse?: () => void }) {
  const { t, fmt, fmtDate } = useApp();
  return (
    <Card className={cx("flex items-center gap-3 p-3", p.usedAt && "opacity-65")}>
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl"><Cover r={p} size={64} /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-extrabold">{p.title}</div>
        <div className="text-xs font-semibold text-muted">{p.usedAt ? `${t("store.usedOn")} ${fmtDate(isoKey(p.usedAt))}` : `${t("store.boughtOn")} ${fmtDate(isoKey(p.boughtAt))}`}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-gold-ink">{fmt(p.price)}<StarGlyph size={12} /></div>
      </div>
      {onUse ? (
        <Btn variant="success" size="sm" onClick={onUse}><Check size={16} />{t("store.used")}</Btn>
      ) : (
        <Check className="text-ok" />
      )}
    </Card>
  );
}

function RewardSheet({ reward, onClose }: { reward: Reward | null; onClose: () => void }) {
  const { t, fmt, data, saveReward, deleteReward, pinReward, toast } = useApp();
  const [f, setF] = useState<Reward | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  if (reward && last !== reward.id) {
    setLast(reward.id);
    setF({ ...reward });
  }
  if (!reward && last) setLast(null);
  const exists = !!reward && data.rewards.some((r) => r.id === reward.id);
  const cur = f ?? reward;
  const up = (p: Partial<Reward>) => setF((x) => (x ? { ...x, ...p } : x));
  const save = () => {
    if (!f) return;
    if (!f.title.trim()) return toast(t("store.nameReq"));
    if (!(f.price >= 1)) return toast(t("store.priceReq"));
    saveReward({ ...f, title: f.title.trim() });
    haptic("success");
    onClose();
  };

  return (
    <Sheet
      open={!!reward}
      onClose={onClose}
      title={exists ? t("store.edit") : t("store.new")}
      footer={
        <div className="flex gap-3">
          {exists && <Btn variant="danger" aria-label={t("delete")} onClick={() => { deleteReward(reward!.id); onClose(); }}><Trash2 size={18} /></Btn>}
          <Btn className="flex-1" size="lg" onClick={save}>{t("save")}</Btn>
        </div>
      }
    >
      {cur && f && (
        <div className="space-y-5 pt-2">
          <div className="overflow-hidden rounded-3xl"><Cover r={f} size={120} /></div>
          <input value={f.title} onChange={(e) => up({ title: e.target.value })} placeholder={t("store.name")} className={cx(inputCls, "!text-lg font-bold")} maxLength={40} autoFocus={!exists} />
          <Field label={t("store.price")}>
            <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-2">
              <StarGlyph size={22} />
              <input type="number" inputMode="numeric" min={1} value={f.price || ""} onChange={(e) => up({ price: Math.max(0, Math.min(99999, Math.floor(Number(e.target.value)))) })} className="min-h-11 w-full bg-transparent text-2xl font-black outline-none" aria-label={t("store.price")} />
              <div className="flex gap-1.5">
                {[10, 50, 100].map((n) => <button key={n} onClick={() => up({ price: (f.price || 0) + n })} className="press min-h-9 rounded-xl bg-card2 px-3 text-xs font-extrabold">+{fmt(n)}</button>)}
              </div>
            </div>
          </Field>
          <Field label={t("store.note")}>
            <input value={f.note} onChange={(e) => up({ note: e.target.value })} className={inputCls} maxLength={80} />
          </Field>
          <Field>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {CATS.map((c) => <Chip key={c} active={f.category === c} onClick={() => up({ category: c })}>{t(`store.${c}`)}</Chip>)}
            </div>
          </Field>
          <Field label={t("cat.icon")}>
            <div className="grid grid-cols-6 gap-2">
              {REWARD_ICONS.map((ic) => (
                <button key={ic} aria-label={ic} onClick={() => up({ icon: ic })} className={cx("press grid place-items-center rounded-2xl p-1.5 ring-2", f.icon === ic ? "ring-accent" : "ring-transparent")}>
                  <IconBox icon={ic} color={f.color} size={40} />
                </button>
              ))}
            </div>
          </Field>
          <Field label={t("cat.color")}>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {COLORS.map((c) => (
                <button key={c} aria-label={c} onClick={() => up({ color: c })} className="press grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: c }}>
                  {f.color === c && <Check size={18} className="text-white" />}
                </button>
              ))}
            </div>
          </Field>
          <div className="flex gap-2">
            <Btn variant="soft" className="flex-1" onClick={() => fileRef.current?.click()}><ImagePlus size={17} />{t("store.pickImage")}</Btn>
            {f.image && <Btn variant="ghost" onClick={() => up({ image: undefined })}>{t("store.removeImage")}</Btn>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try { up({ image: await compressImage(file) }); } catch { toast(t("err.generic")); }
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex min-h-14 items-center justify-between rounded-2xl bg-card px-4">
            <div className="flex items-center gap-3"><Repeat size={20} className="text-accent" /><div><div className="font-bold">{t("store.repeatable")}</div><div className="text-xs text-muted">{t("store.repeatableSub")}</div></div></div>
            <Toggle on={f.repeatable} onChange={(v) => up({ repeatable: v })} label={t("store.repeatable")} />
          </div>
          {exists && (
            <div className="grid grid-cols-2 gap-3">
              <Btn variant="soft" onClick={() => { pinReward(f.id); up({ pinned: !f.pinned }); }}><Target size={16} />{f.pinned ? t("store.unpin") : t("store.pin")}</Btn>
              <Btn variant="ghost" onClick={() => up({ hidden: !f.hidden })}>{f.hidden ? <Eye size={16} /> : <EyeOff size={16} />}{f.hidden ? t("store.unhide") : t("store.hide")}</Btn>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
