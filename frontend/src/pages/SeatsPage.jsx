import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Badge, Button, ErrorBox, Skeleton } from "../components/ui";
import { AnimatedNumber } from "../components/bits";
import { fmtDate, fmtTime, money } from "../lib/format";
import { useAuth } from "../state/auth";
import { useToast } from "../state/toast";

const MAX = 8;
const TIERS = {
  Regular: { label: "Regular", rows: "A–C", dot: "bg-sky-400/80" },
  Premium: { label: "Premium", rows: "D–F", dot: "bg-violet-400/80" },
  VIP: { label: "VIP Recliner", rows: "G–H", dot: "bg-amber-400/90" },
};
const tierStyle = {
  Regular: "border-sky-300/40 bg-sky-400/15 hover:bg-sky-400/35 text-sky-100",
  Premium: "border-violet-300/40 bg-violet-400/15 hover:bg-violet-400/35 text-violet-100",
  VIP: "border-amber-300/50 bg-amber-400/15 hover:bg-amber-400/35 text-amber-100",
};

/** Picks `n` great seats: same row, side by side, as close to the centre of the best rows as possible. */
function bestSeats(seats, n) {
  const rows = new Map();
  for (const s of seats) {
    if (!rows.has(s.row_num)) rows.set(s.row_num, []);
    rows.get(s.row_num).push(s);
  }
  const rowKeys = [...rows.keys()].sort();
  const mid = (rowKeys.length - 1) * 0.62; // sweet spot: just behind the middle
  let best = null;
  rowKeys.forEach((rk, ri) => {
    const row = rows.get(rk).sort((a, b) => a.seat_num - b.seat_num);
    const centre = (row.length + 1) / 2;
    for (let i = 0; i + n <= row.length; i++) {
      const run = row.slice(i, i + n);
      const contiguous = run.every((s, k) => s.status === "Available" && (k === 0 || s.seat_num === run[k - 1].seat_num + 1));
      if (!contiguous) continue;
      const runCentre = run.reduce((a, s) => a + s.seat_num, 0) / n;
      const crossesAisle = run[0].seat_num <= 6 && run[n - 1].seat_num >= 7; // aisle sits between seat 6 and 7
      const score = Math.abs(ri - mid) * 2 + Math.abs(runCentre - centre) + (crossesAisle && n <= 6 ? 4 : 0);
      if (!best || score < best.score) best = { score, run };
    }
  });
  if (best) return best.run;
  // no block that big: fall back to the best individual seats
  const all = seats.filter((s) => s.status === "Available").map((s) => {
    const ri = rowKeys.indexOf(s.row_num);
    return { s, score: Math.abs(ri - mid) * 2 + Math.abs(s.seat_num - 6.5) };
  });
  return all.sort((a, b) => a.score - b.score).slice(0, n).map((x) => x.s);
}

function Seat({ seat, selected, onToggle }) {
  const booked = seat.status === "Booked";
  const label = `${seat.row_num}${seat.seat_num}`;
  return (
    <motion.button
      type="button"
      disabled={booked}
      onClick={() => onToggle(seat)}
      aria-label={`Seat ${label}, ${seat.type}, ${money(seat.price)}${booked ? ", sold" : selected ? ", selected" : ""}`}
      aria-pressed={selected}
      title={`${label} · ${seat.type} · ${money(seat.price)}`}
      initial={false}
      animate={selected ? { scale: [1, 1.25, 1], y: [0, -4, 0] } : { scale: 1 }}
      transition={{ duration: 0.28 }}
      whileHover={booked ? undefined : { scale: 1.18, y: -2 }}
      whileTap={booked ? undefined : { scale: 0.9 }}
      className={`focus-ring relative aspect-square w-full max-w-[2rem] justify-self-center rounded-t-lg rounded-b-[5px] border text-[9px] font-bold transition-colors sm:text-[10px] ${
        booked ? "cursor-not-allowed border-white/5 bg-white/[0.06] text-transparent"
          : selected ? "border-white/80 bg-gradient-to-b from-brand-rose to-brand-violet text-white shadow-[0_0_18px_rgba(255,61,110,0.7)]"
          : tierStyle[seat.type]
      }`}
    >
      {booked ? <span className="absolute inset-0 flex items-center justify-center text-zinc-600">✕</span> : seat.seat_num}
      <span className={`absolute inset-x-1 -bottom-[3px] h-[3px] rounded-full ${booked ? "bg-white/10" : selected ? "bg-white/70" : "bg-current opacity-40"}`} />
    </motion.button>
  );
}

export default function SeatsPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { requireLogin } = useAuth();
  const toast = useToast();
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState([]); // show_seat_ids
  const [want, setWant] = useState(2);
  const [busy, setBusy] = useState(false);
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  const load = useCallback(async (silent = false) => {
    try {
      const [sh, st] = await Promise.all([show ? Promise.resolve(show) : api.show(showId), api.seats(showId)]);
      setShow(sh);
      setSeats(st.seats);
      // someone else may have taken a seat we picked
      const taken = st.seats.filter((s) => s.status === "Booked" && pickedRef.current.includes(s.show_seat_id));
      if (taken.length) {
        setPicked((p) => p.filter((id) => !taken.some((t) => t.show_seat_id === id)));
        toast.error(`${taken.map((t) => t.row_num + t.seat_num).join(", ")} just got booked by someone else`);
      }
      setError("");
    } catch (e) {
      if (!silent) setError(e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showId]);

  useEffect(() => { load(); }, [load]);
  // live availability: refresh every 12s while the tab is visible
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible" && !busy) load(true); }, 12000);
    return () => clearInterval(id);
  }, [load, busy]);

  const byRow = useMemo(() => {
    const m = new Map();
    for (const s of seats || []) { if (!m.has(s.row_num)) m.set(s.row_num, []); m.get(s.row_num).push(s); }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([r, list]) => [r, list.sort((a, b) => a.seat_num - b.seat_num)]);
  }, [seats]);

  const selected = useMemo(() => (seats || []).filter((s) => picked.includes(s.show_seat_id)), [seats, picked]);
  const subtotal = selected.reduce((a, s) => a + s.price, 0);
  const free = (seats || []).filter((s) => s.status === "Available").length;

  function toggle(seat) {
    setPicked((p) => {
      if (p.includes(seat.show_seat_id)) return p.filter((x) => x !== seat.show_seat_id);
      if (p.length >= MAX) { toast.error(`You can book up to ${MAX} seats at a time`); return p; }
      return [...p, seat.show_seat_id];
    });
  }

  function autoPick() {
    const run = bestSeats(seats, want);
    if (run.length < want) toast.info(`Only ${free} seats left for this show`);
    setPicked(run.map((s) => s.show_seat_id));
  }

  async function proceed() {
    if (!selected.length || busy) return;
    const go = async () => {
      setBusy(true);
      try {
        const r = await api.hold(Number(showId), picked);
        navigate(`/checkout/${r.booking_id}`);
      } catch (e) {
        toast.error(e.message);
        setPicked([]);
        await load(true);
      } finally {
        setBusy(false);
      }
    };
    requireLogin(go, "Sign in to hold your seats. It only takes a moment.");
  }

  if (error) return <ErrorBox message={error} onRetry={() => load()} />;
  if (!seats || !show) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-[28rem]" /></div>;

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="mb-2 text-xs text-zinc-400 hover:text-white">← Back to showtimes</button>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{show.movie_title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="brand">{fmtDate(show.show_date)} · {fmtTime(show.start_time)}</Badge>
            <Badge>{show.theatre_name}</Badge>
            <Badge>{show.screen_name}</Badge>
            <Badge tone={free < 15 ? "danger" : "success"}>{free} seats left</Badge>
          </div>
        </div>

        {/* quick pick */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">How many seats?</div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setWant(n)} aria-pressed={want === n} className={`focus-ring h-8 w-8 rounded-lg text-sm font-bold transition ${want === n ? "bg-white text-ink-900" : "bg-white/[0.06] text-zinc-300 hover:bg-white/10"}`}>{n}</button>
            ))}
            <Button size="sm" className="ml-2" onClick={autoPick}>✨ Best seats</Button>
          </div>
        </div>
      </div>

      {/* seat map */}
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-3 shadow-glow sm:p-8">
        <div>
          <div className="mx-auto max-w-3xl">
            {/* curved screen */}
            <div className="relative mb-12">
              <svg viewBox="0 0 600 70" className="w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#7c5cff" stopOpacity=".1" /></linearGradient>
                  <filter id="blur"><feGaussianBlur stdDeviation="6" /></filter>
                </defs>
                <path d="M20 58 Q300 -8 580 58" fill="none" stroke="#7c5cff" strokeWidth="14" opacity=".55" filter="url(#blur)" />
                <path d="M20 58 Q300 -8 580 58" fill="none" stroke="url(#scr)" strokeWidth="5" strokeLinecap="round" />
              </svg>
              <div className="pointer-events-none absolute inset-x-10 top-6 h-24 bg-gradient-to-b from-brand-violet/25 to-transparent [clip-path:polygon(8%_0,92%_0,100%_100%,0_100%)]" />
              <div className="absolute inset-x-0 top-9 text-center text-[10px] font-semibold uppercase tracking-[0.5em] text-zinc-500">Screen this way</div>
            </div>

            <div className="space-y-2.5">
              {byRow.map(([row, list], ri) => {
                const tier = list[0].type;
                const startOfTier = ri === 0 || byRow[ri - 1][1][0].type !== tier;
                return (
                  <div key={row}>
                    {startOfTier && (
                      <div className={`${ri === 0 ? "" : "mt-6"} mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400`}>
                        <span className={`h-2 w-2 rounded-full ${TIERS[tier].dot}`} />{TIERS[tier].label} · {money(list[0].price)}
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                    )}
                    <div className="grid items-center gap-x-1 sm:gap-x-2" style={{ gridTemplateColumns: "1rem repeat(6, minmax(0, 1fr)) 0.9rem repeat(6, minmax(0, 1fr)) 1rem" }}>
                      <span className="text-center text-xs font-semibold text-zinc-500">{row}</span>
                      {list.slice(0, 6).map((s) => <Seat key={s.show_seat_id} seat={s} selected={picked.includes(s.show_seat_id)} onToggle={toggle} />)}
                      <span aria-hidden="true" />
                      {list.slice(6).map((s) => <Seat key={s.show_seat_id} seat={s} selected={picked.includes(s.show_seat_id)} onToggle={toggle} />)}
                      <span className="text-center text-xs font-semibold text-zinc-500">{row}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-t-md border border-sky-300/40 bg-sky-400/15" />Regular {money(200)}</span>
          <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-t-md border border-violet-300/40 bg-violet-400/15" />Premium {money(320)}</span>
          <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-t-md border border-amber-300/50 bg-amber-400/15" />VIP {money(480)}</span>
          <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-t-md bg-gradient-to-b from-brand-rose to-brand-violet" />Selected</span>
          <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded-t-md bg-white/[0.07]" />Sold</span>
        </div>
      </div>

      {/* sticky checkout bar */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 28 }} className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-900/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <AnimatePresence initial={false}>
                    {selected.map((s) => (
                      <motion.span key={s.show_seat_id} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-bold">{s.row_num}{s.seat_num}</motion.span>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="mt-1 text-xs text-zinc-500">{selected.length} seat{selected.length > 1 ? "s" : ""} · tap a seat again to remove</div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] text-zinc-500">Subtotal</div>
                  <AnimatedNumber value={subtotal} prefix="₹" className="font-display text-xl font-bold" />
                </div>
                <Button size="lg" loading={busy} onClick={proceed}>Proceed →</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
