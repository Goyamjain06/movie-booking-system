import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Poster } from "../components/Poster";
import { Button, ErrorBox, Skeleton } from "../components/ui";
import { fmtDate, fmtTime, isPast, money } from "../lib/format";
import { useAuth } from "../state/auth";

export default function BookingsPage() {
  const { user, ready, openAuth } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    if (!user) return;
    api.bookings().then(setList).catch((e) => setError(e.message));
  }, [user]);

  const { upcoming, past } = useMemo(() => {
    const up = [], pa = [];
    for (const b of list || []) (isPast(b.show_date, b.start_time) ? pa : up).push(b);
    up.sort((a, b) => `${a.show_date} ${a.start_time}`.localeCompare(`${b.show_date} ${b.start_time}`));
    return { upcoming: up, past: pa };
  }, [list]);

  if (!ready) return <Skeleton className="h-64" />;
  if (!user) {
    return (
      <div className="mx-auto max-w-sm py-20 text-center">
        <div className="text-5xl">🎟️</div>
        <h1 className="mt-4 font-display text-2xl font-bold">Your tickets live here</h1>
        <p className="mt-2 text-sm text-zinc-400">Sign in to see your upcoming and past bookings.</p>
        <Button className="mt-6" onClick={() => openAuth("login")}>Sign in</Button>
      </div>
    );
  }
  const shown = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">My bookings</h1>
      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
        {[["upcoming", `Upcoming${list ? ` (${upcoming.length})` : ""}`], ["past", `Past${list ? ` (${past.length})` : ""}`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="focus-ring relative rounded-full px-5 py-1.5 text-sm font-semibold">
            {tab === id && <motion.span layoutId="bk-tab" className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-rose to-brand-violet" />}
            <span className={`relative ${tab === id ? "text-white" : "text-zinc-400"}`}>{label}</span>
          </button>
        ))}
      </div>

      {error ? <ErrorBox message={error} /> : !list ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
          <div className="text-4xl">🍿</div>
          <p className="mt-3 font-display text-lg font-semibold">{tab === "upcoming" ? "No upcoming bookings" : "No past bookings yet"}</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-violet-300 hover:underline">Find a movie →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((b, i) => (
            <motion.div key={b.booking_id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/ticket/${b.booking_id}`} className="focus-ring group flex gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-brand-violet/40 hover:bg-white/[0.07]">
                <Poster movie={{ title: b.movie_title, poster_url: b.poster_url, genre: b.genre }} compact className="h-28 w-[4.7rem] shrink-0 rounded-xl border border-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold leading-snug">{b.movie_title}</h2>
                    <span className="font-mono text-[11px] text-zinc-500">{b.booking_code}</span>
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">{fmtDate(b.show_date)} · {fmtTime(b.start_time)}</div>
                  <div className="text-xs text-zinc-500">{b.theatre_name} · {b.screen_name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">{b.seats.map((s) => <span key={s.label} className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold">{s.label}</span>)}</div>
                    <span className="text-sm font-semibold">{money(b.total)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
