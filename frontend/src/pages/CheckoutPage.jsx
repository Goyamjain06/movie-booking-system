import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Poster } from "../components/Poster";
import { AnimatedNumber, HoldTimer } from "../components/bits";
import { Badge, Button, Card, ErrorBox, Skeleton } from "../components/ui";
import { fmtDate, fmtTime, money } from "../lib/format";
import { useAuth } from "../state/auth";
import { useToast } from "../state/toast";

const METHODS = [
  { id: "UPI", icon: "📲", title: "UPI", hint: "GPay, PhonePe, Paytm" },
  { id: "Card", icon: "💳", title: "Card", hint: "Credit / Debit" },
  { id: "Wallet", icon: "👛", title: "Wallet", hint: "Paytm, PhonePe, Amazon Pay" },
];
const WALLETS = ["Paytm", "PhonePe", "Amazon Pay"];
const STEPS = ["Contacting your bank…", "Confirming your seats…", "Generating your ticket…"];

const cardBrand = (n) => (/^4/.test(n) ? "Visa" : /^(5[1-5]|2[2-7])/.test(n) ? "Mastercard" : /^3[47]/.test(n) ? "Amex" : /^(60|65|81|82)/.test(n) ? "RuPay" : "");
const groupCard = (v) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const fmtExpiry = (v) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, ready, requireLogin } = useAuth();
  const toast = useToast();

  const [b, setB] = useState(null);
  const [error, setError] = useState("");
  const [totals, setTotals] = useState(null);
  const [offers, setOffers] = useState([]);
  const [method, setMethod] = useState("UPI");
  const [upi, setUpi] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [wallet, setWallet] = useState("Paytm");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState("");
  const [promoMsg, setPromoMsg] = useState(null);
  const [paying, setPaying] = useState(false);
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState("");
  const [failed, setFailed] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => { if (ready && !user) requireLogin(null, "Sign in to view your booking."); }, [ready, user, requireLogin]);

  const load = useCallback(() => {
    if (!user) return;
    api.booking(bookingId).then((x) => { setB(x); return api.quote(bookingId, null).then(setTotals); }).catch((e) => setError(e.message));
    api.config().then((c) => setOffers(c.promos || [])).catch(() => {});
  }, [bookingId, user]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!paying) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 900);
    return () => clearInterval(id);
  }, [paying]);

  const applyPromo = useCallback(async (code) => {
    const c = (code ?? promoInput).trim().toUpperCase();
    if (!c) return;
    try {
      const t = await api.quote(bookingId, c);
      if (t.promoError) { setPromoMsg({ ok: false, text: t.promoError }); return; }
      setTotals(t); setPromo(c); setPromoInput(c);
      setPromoMsg({ ok: true, text: `${c} applied. You saved ${money(t.discount)}` });
    } catch (e) { setPromoMsg({ ok: false, text: e.message }); }
  }, [bookingId, promoInput]);

  const removePromo = async () => {
    setPromo(""); setPromoInput(""); setPromoMsg(null);
    setTotals(await api.quote(bookingId, null));
  };

  const onExpire = useCallback(() => setExpired(true), []);

  async function leave() {
    try { await api.release(bookingId); } catch { /* already gone */ }
    navigate(b ? `/shows/${b.show_id}/seats` : "/");
  }

  async function pay() {
    setFormError("");
    const details = method === "UPI" ? { upi_id: upi } : method === "Card" ? { ...card, number: card.number.replace(/\s/g, "") } : { wallet };
    setStep(0); setPaying(true);
    try {
      const r = await api.pay({ booking_id: Number(bookingId), method, promo_code: promo || undefined, details });
      setStep(STEPS.length - 1);
      await new Promise((res) => setTimeout(res, 500));
      navigate(`/ticket/${r.booking.booking_id}?new=1`, { replace: true });
    } catch (e) {
      setPaying(false);
      if (e.status === 402) setFailed(e.message);
      else if (e.status === 410) setExpired(true);
      else { setFormError(e.message); toast.error(e.message); }
    }
  }

  if (ready && !user) return <div className="py-24 text-center text-zinc-400">Please sign in to continue.</div>;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!b || !totals) return <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" /></div>;
  if (b.status === "Confirmed") return <Navigate to={`/ticket/${b.booking_id}`} replace />;
  if (b.status === "Cancelled" && !failed) return <HoldLost onBack={() => navigate(`/shows/${b.show_id}/seats`)} />;

  const brand = cardBrand(card.number.replace(/\s/g, ""));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button onClick={leave} className="mb-2 text-xs text-zinc-400 hover:text-white">← Change seats</button>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Review & pay</h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5">
          <HoldTimer seconds={b.hold_seconds_left ?? 0} onExpire={onExpire} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-5">
          {/* method */}
          <Card>
            <h2 className="mb-4 font-display text-lg font-semibold">Payment method</h2>
            <div className="grid grid-cols-3 gap-3" role="tablist">
              {METHODS.map((m) => (
                <button key={m.id} role="tab" aria-selected={method === m.id} onClick={() => { setMethod(m.id); setFormError(""); }} className={`focus-ring relative rounded-2xl border p-3 text-left transition sm:p-4 ${method === m.id ? "border-brand-violet/60 bg-brand-violet/10" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>
                  {method === m.id && <motion.span layoutId="method-ring" className="absolute inset-0 rounded-2xl ring-2 ring-brand-violet/70" />}
                  <div className="relative text-xl sm:text-2xl">{m.icon}</div>
                  <div className="relative mt-1 text-sm font-semibold">{m.title}</div>
                  <div className="relative hidden text-[11px] text-zinc-500 sm:block">{m.hint}</div>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <AnimatePresence mode="wait">
                <motion.div key={method} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-3">
                  {method === "UPI" && (
                    <>
                      <label className="block text-xs font-medium text-zinc-400">UPI ID</label>
                      <input className="input" placeholder="yourname@okhdfcbank" value={upi} onChange={(e) => setUpi(e.target.value)} autoComplete="off" inputMode="email" />
                      <button type="button" onClick={() => setUpi("demo@okhdfc")} className="text-xs text-violet-300 hover:underline">Use demo UPI ID</button>
                    </>
                  )}
                  {method === "Card" && (
                    <>
                      <div className="relative">
                        <input className="input pr-24 font-mono tracking-wider" placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: groupCard(e.target.value) })} />
                        {brand && <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold">{brand}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input className="input font-mono" placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: fmtExpiry(e.target.value) })} />
                        <input className="input font-mono" placeholder="CVV" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
                      </div>
                      <input className="input" placeholder="Name on card" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                      <button type="button" onClick={() => setCard({ number: "4242 4242 4242 4242", expiry: "12/34", cvv: "123", name: "Demo User" })} className="text-xs text-violet-300 hover:underline">Fill test card (no real charge)</button>
                    </>
                  )}
                  {method === "Wallet" && (
                    <div className="grid grid-cols-3 gap-3">
                      {WALLETS.map((w) => (
                        <button key={w} onClick={() => setWallet(w)} className={`focus-ring rounded-xl border px-3 py-3 text-sm font-semibold transition ${wallet === w ? "border-brand-violet/60 bg-brand-violet/15" : "border-white/10 bg-white/[0.03] hover:border-white/25"}`}>{w}</button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              {formError && <div role="alert" className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{formError}</div>}
            </div>
          </Card>

          {/* promo */}
          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold">Offers & promo codes</h2>
            {promo ? (
              <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                <div className="text-sm"><span className="font-mono font-bold">{promo}</span> <span className="text-emerald-200">· saved {money(totals.discount)}</span></div>
                <button onClick={removePromo} className="text-xs text-zinc-400 hover:text-white">Remove</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input className="input font-mono uppercase tracking-widest" placeholder="Enter code" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && applyPromo()} />
                  <Button variant="ghost" onClick={() => applyPromo()}>Apply</Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {offers.map((o) => (
                    <button key={o.code} onClick={() => applyPromo(o.code)} className="rounded-full border border-dashed border-white/20 px-3 py-1 text-xs text-zinc-300 transition hover:border-brand-violet/60 hover:bg-brand-violet/10"><b className="font-mono">{o.code}</b> · {o.label}</button>
                  ))}
                </div>
              </>
            )}
            {promoMsg && <div className={`mt-3 text-xs ${promoMsg.ok ? "text-emerald-300" : "text-rose-300"}`}>{promoMsg.text}</div>}
          </Card>
        </div>

        {/* summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-5">
            <div className="flex gap-4">
              <Poster movie={{ title: b.movie_title, poster_url: b.poster_url, genre: b.genre }} compact className="h-28 w-[4.5rem] shrink-0 rounded-xl border border-white/10" />
              <div className="min-w-0">
                <div className="font-display font-semibold leading-snug">{b.movie_title}</div>
                <div className="mt-1 text-xs text-zinc-400">{fmtDate(b.show_date)} · {fmtTime(b.start_time)}</div>
                <div className="text-xs text-zinc-500">{b.theatre_name} · {b.screen_name}</div>
                <div className="mt-2 flex flex-wrap gap-1">{b.seats.map((s) => <Badge key={s.label} tone="brand">{s.label}</Badge>)}</div>
              </div>
            </div>
            <div className="space-y-2.5 border-t border-white/10 pt-4 text-sm">
              {Object.entries(b.seats.reduce((a, s) => ({ ...a, [s.type]: [...(a[s.type] || []), s] }), {})).map(([type, list]) => (
                <div key={type} className="flex justify-between text-zinc-300"><span>{type} × {list.length}</span><span>{money(list.reduce((x, s) => x + s.price, 0))}</span></div>
              ))}
              <div className="flex justify-between text-zinc-400"><span>Convenience fee</span><span>{money(totals.fee)}</span></div>
              <AnimatePresence>
                {totals.discount > 0 && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-emerald-300"><span>Discount ({totals.promo?.code})</span><span>− {money(totals.discount)}</span></motion.div>}
              </AnimatePresence>
            </div>
            <div className="flex items-end justify-between border-t border-white/10 pt-4">
              <span className="text-sm text-zinc-400">Total</span>
              <AnimatedNumber value={totals.total} prefix="₹" className="font-display text-3xl font-extrabold" />
            </div>
            <Button size="lg" className="w-full" onClick={pay} disabled={expired || paying}>🔒 Pay {money(totals.total)}</Button>
            <p className="text-center text-[11px] text-zinc-500">Demo payment · no real money is charged. Card details are never stored.</p>
          </Card>
        </div>
      </div>

      {/* processing overlay */}
      <AnimatePresence>
        {paying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex flex-col items-center justify-center gap-6 bg-ink-950/90 backdrop-blur-md">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 animate-ping2 rounded-full bg-brand-violet/40" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-white/10 border-t-brand-rose" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="font-display text-lg font-semibold">{STEPS[step]}</motion.div>
            </AnimatePresence>
            <p className="text-xs text-zinc-500">Please don’t close this page</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* hold expired */}
      <AnimatePresence>
        {expired && !paying && (
          <Overlay icon="⏰" title="Your seat hold expired" text="We released the seats so others can book them. Pick your seats again, it only takes a moment." action="Choose seats again" onAction={() => navigate(`/shows/${b.show_id}/seats`)} />
        )}
        {failed && (
          <Overlay icon="😕" title="Payment didn’t go through" text={`${failed}. Your seats were released, so please select them again.`} action="Choose seats again" onAction={() => navigate(`/shows/${b.show_id}/seats`)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Overlay({ icon, title, text, action, onAction }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[115] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true">
      <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="max-w-sm rounded-3xl border border-white/10 bg-ink-800 p-7 text-center shadow-glow">
        <div className="text-5xl">{icon}</div>
        <h2 className="mt-4 font-display text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{text}</p>
        <Button className="mt-6 w-full" onClick={onAction}>{action}</Button>
      </motion.div>
    </motion.div>
  );
}

function HoldLost({ onBack }) {
  return (
    <div className="mx-auto max-w-sm py-20 text-center">
      <div className="text-5xl">⏰</div>
      <h1 className="mt-4 font-display text-2xl font-bold">This booking is no longer active</h1>
      <p className="mt-2 text-sm text-zinc-400">The seat hold ended. You can pick seats again.</p>
      <Button className="mt-6" onClick={onBack}>Choose seats</Button>
    </div>
  );
}
