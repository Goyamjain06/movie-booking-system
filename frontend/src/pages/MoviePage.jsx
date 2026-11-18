import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Poster } from "../components/Poster";
import { Badge, Button, ErrorBox, Skeleton } from "../components/ui";
import { dayLabel, duration, fmtDate, fmtTime, artFor } from "../lib/format";
import { useChat } from "../state/chat";
import { BRAND } from "../config";

function availability(show) {
  const pct = show.seats_total ? show.seats_available / show.seats_total : 0;
  if (show.seats_available === 0) return { tone: "sold", label: "Sold out", cls: "border-white/10 bg-white/[0.03] text-zinc-600 line-through" };
  if (pct < 0.2) return { tone: "red", label: "Almost full", cls: "border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20" };
  if (pct < 0.5) return { tone: "amber", label: "Filling fast", cls: "border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20" };
  return { tone: "green", label: "Available", cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" };
}

export default function MoviePage() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { openChat } = useChat();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState(null);
  const [error, setError] = useState("");
  const [day, setDay] = useState(null);

  const load = useCallback(() => {
    setError("");
    Promise.all([api.movie(movieId), api.shows({ movieId })])
      .then(([m, s]) => { setMovie(m); setShows(s); setDay((d) => d || s[0]?.show_date || null); })
      .catch((e) => setError(e.message));
  }, [movieId]);
  useEffect(load, [load]);

  const days = useMemo(() => Array.from(new Set((shows || []).map((s) => s.show_date))).sort(), [shows]);
  const byTheatre = useMemo(() => {
    const map = new Map();
    for (const s of (shows || []).filter((x) => x.show_date === day)) {
      if (!map.has(s.theatre_id)) map.set(s.theatre_id, { theatre: s, list: [] });
      map.get(s.theatre_id).list.push(s);
    }
    return Array.from(map.values());
  }, [shows, day]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!movie) return <div className="space-y-6"><Skeleton className="h-80 rounded-[2rem]" /><Skeleton className="h-40" /></div>;
  const art = artFor(movie.title);
  const cast = (movie.cast_names || "").split(",").map((c) => c.trim()).filter(Boolean);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-glow">
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${art.angle}deg, ${art.a}66, ${art.b}33 55%, #07070d)` }} />
        <div className="absolute inset-0 opacity-30 blur-3xl"><Poster movie={movie} compact className="h-full w-full scale-125" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        <div className="relative grid gap-8 p-6 sm:p-10 md:grid-cols-[15rem_1fr]">
          <motion.div initial={{ opacity: 0, scale: 0.92, rotate: -3 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 120, damping: 16 }} className="mx-auto w-48 md:w-full">
            <Poster movie={movie} className="aspect-[2/3] rounded-2xl border border-white/20 shadow-2xl" />
          </motion.div>
          <div className="flex flex-col justify-end">
            <Link to="/" className="mb-3 text-xs text-zinc-400 hover:text-white">← All movies</Link>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{movie.title}</motion.h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="warn">★ {Number(movie.rating).toFixed(1)} / 10</Badge>
              {movie.certificate && <Badge>{movie.certificate}</Badge>}
              <Badge tone="brand">{movie.genre}</Badge>
              <Badge>{movie.language}</Badge>
              <Badge>{duration(movie.duration)}</Badge>
              {movie.release_year && <Badge>{movie.release_year}</Badge>}
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">{movie.synopsis}</p>
            {cast.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {cast.map((c) => (
                  <span key={c} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 py-1 pl-1 pr-3 text-xs backdrop-blur">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose/70 to-brand-violet/70 text-[10px] font-bold">{c[0]}</span>{c}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-6"><Button variant="ghost" size="sm" onClick={() => openChat(`Is ${movie.title} worth watching? Which show is best?`)}><span className="gradient-text">✦</span> Ask {BRAND.bot} about this movie</Button></div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Showtimes</h2>
        {!shows ? <Skeleton className="mt-5 h-40" /> : days.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] py-14 text-center text-zinc-400">No upcoming shows for this movie right now. Check back soon.</div>
        ) : (
          <>
            <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Choose a date">
              {days.map((d) => (
                <button key={d} role="tab" aria-selected={d === day} onClick={() => setDay(d)} className="focus-ring relative min-w-[4.6rem] shrink-0 rounded-2xl border border-white/10 px-4 py-3 text-center">
                  {d === day && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-rose to-brand-violet shadow-brand" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                  <span className="relative block text-[11px] font-semibold uppercase tracking-wider text-white/70">{dayLabel(d)}</span>
                  <span className="relative block font-display text-xl font-bold">{fmtDate(d, { day: "numeric" })}</span>
                  <span className="relative block text-[11px] text-white/60">{fmtDate(d, { month: "short" })}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-400" />Available</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-400" />Filling fast</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-400" />Almost full</span>
              <span className="ml-auto">Tickets from ₹200</span>
            </div>

            <div className="mt-4 space-y-4">
              {byTheatre.map(({ theatre, list }, i) => (
                <motion.div key={theatre.theatre_id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:grid-cols-[16rem_1fr]">
                  <div>
                    <div className="font-display text-base font-semibold">{theatre.theatre_name}</div>
                    <div className="mt-1 text-xs text-zinc-500">📍 {theatre.theatre_location}</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {list.map((s) => {
                      const a = availability(s);
                      return (
                        <motion.button key={s.show_id} whileHover={a.tone === "sold" ? undefined : { y: -3 }} whileTap={a.tone === "sold" ? undefined : { scale: 0.96 }} disabled={a.tone === "sold"} onClick={() => navigate(`/shows/${s.show_id}/seats`)} className={`focus-ring rounded-xl border px-4 py-2 text-center transition ${a.cls}`} title={`${s.screen_name} · ${s.seats_available} seats left`}>
                          <span className="block text-sm font-bold">{fmtTime(s.start_time)}</span>
                          <span className="block text-[10px] opacity-80">{a.tone === "sold" ? "Sold out" : `${s.seats_available} left`}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
