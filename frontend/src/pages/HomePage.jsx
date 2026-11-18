import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api";
import { Hero } from "../components/Hero";
import { MovieCard } from "../components/MovieCard";
import { CountUp } from "../components/bits";
import { ErrorBox, SectionTitle, Skeleton } from "../components/ui";
import { useToast } from "../state/toast";

const SORTS = [
  { id: "rating", label: "Top rated" },
  { id: "shows", label: "Most shows" },
  { id: "az", label: "A – Z" },
  { id: "short", label: "Shortest first" },
];

function Offers({ promos }) {
  const toast = useToast();
  if (!promos?.length) return null;
  const copy = (code) => {
    navigator.clipboard?.writeText(code).then(() => toast.success(`${code} copied. Apply it at checkout`)).catch(() => toast.info(`Use code ${code} at checkout`));
  };
  return (
    <section>
      <SectionTitle eyebrow="Save more" title="Offers for you" />
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {promos.map((p, i) => (
          <motion.button key={p.code} onClick={() => copy(p.code)} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }} className="focus-ring group relative min-w-[16rem] flex-1 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 text-left">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-brand-rose/40 to-brand-violet/40 blur-2xl transition group-hover:scale-125" />
            <div className="relative">
              <div className="font-display text-lg font-bold">{p.label}</div>
              <div className="mt-1 text-xs text-zinc-500">Min. order ₹{p.min}</div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-white/25 px-3 py-1.5 font-mono text-sm font-bold tracking-widest">{p.code}<span className="text-[10px] font-sans font-medium text-zinc-400">tap to copy</span></div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [movies, setMovies] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [language, setLanguage] = useState("All");
  const [sort, setSort] = useState("rating");
  const searchRef = useRef(null);

  const load = useCallback(() => {
    setError("");
    setMovies(null);
    api.movies().then(setMovies).catch((e) => setError(e.message));
    api.config().then(setConfig).catch(() => {});
  }, []);
  useEffect(load, [load]);

  // "/" focuses search, like the apps people already know
  useEffect(() => {
    const on = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, []);

  const genres = useMemo(() => ["All", ...Array.from(new Set((movies || []).map((m) => m.genre).filter(Boolean))).sort()], [movies]);
  const languages = useMemo(() => ["All", ...Array.from(new Set((movies || []).map((m) => m.language).filter(Boolean))).sort()], [movies]);

  const featured = useMemo(() => (movies || []).filter((m) => m.upcoming_shows > 0).slice(0, 5), [movies]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = (movies || []).filter(
      (m) =>
        (genre === "All" || m.genre === genre) &&
        (language === "All" || m.language === language) &&
        (!q || `${m.title} ${m.genre} ${m.language} ${m.cast_names || ""}`.toLowerCase().includes(q))
    );
    const by = {
      rating: (a, b) => b.rating - a.rating,
      shows: (a, b) => b.upcoming_shows - a.upcoming_shows,
      az: (a, b) => a.title.localeCompare(b.title),
      short: (a, b) => a.duration - b.duration,
    }[sort];
    return out.sort(by);
  }, [movies, query, genre, language, sort]);

  const totalShows = (movies || []).reduce((s, m) => s + m.upcoming_shows, 0);

  return (
    <div className="space-y-14">
      {error ? <ErrorBox message={error} onRetry={load} /> : !movies ? <Skeleton className="h-[34rem] rounded-[2rem]" /> : <Hero movies={featured} />}

      {movies && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: movies.length, s: "", l: "Movies playing" },
            { n: totalShows, s: "+", l: "Shows this week" },
            { n: 4, s: "", l: "Cinemas" },
            { n: 3, s: "", l: "Seat tiers" },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
              <div className="font-display text-2xl font-bold sm:text-3xl"><CountUp to={x.n} suffix={x.s} /></div>
              <div className="text-xs text-zinc-500">{x.l}</div>
            </div>
          ))}
        </div>
      )}

      <section id="movies" className="scroll-mt-24">
        <SectionTitle eyebrow="Book now" title="All movies" right={movies && <span className="hidden text-sm text-zinc-500 sm:block">{list.length} of {movies.length}</span>} />

        {/* filter bar */}
        <div className="sticky top-16 z-30 -mx-4 mb-6 space-y-3 border-b border-white/[0.06] bg-ink-950/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:border-white/10 sm:px-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search movies, cast, genre…" className="input pl-10 pr-10" aria-label="Search movies" />
              {query ? <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white" aria-label="Clear search">✕</button> : <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 px-1.5 text-[10px] text-zinc-500 sm:block">/</kbd>}
            </div>
            <div className="flex gap-2">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input w-auto" aria-label="Language">
                {languages.map((l) => <option key={l} value={l} className="bg-ink-800">{l === "All" ? "All languages" : l}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto" aria-label="Sort by">
                {SORTS.map((s) => <option key={s.id} value={s.id} className="bg-ink-800">{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto" role="tablist" aria-label="Genres">
            {genres.map((g) => (
              <button key={g} role="tab" aria-selected={genre === g} onClick={() => setGenre(g)} className="focus-ring relative shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold">
                {genre === g && <motion.span layoutId="genre-pill" className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-rose to-brand-violet" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <span className={`relative ${genre === g ? "text-white" : "text-zinc-400 hover:text-zinc-100"}`}>{g}</span>
              </button>
            ))}
          </div>
        </div>

        {!movies && !error ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-[2/3]" />)}</div>
        ) : movies && list.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
            <div className="text-4xl">🍿</div>
            <p className="mt-3 font-display text-lg font-semibold">No movies match that</p>
            <p className="text-sm text-zinc-500">Try a different search or clear the filters.</p>
            <button onClick={() => { setQuery(""); setGenre("All"); setLanguage("All"); }} className="mt-4 text-sm font-semibold text-violet-300 hover:underline">Reset filters</button>
          </div>
        ) : movies ? (
          <motion.div layout className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {list.map((m, idx) => (
                <motion.div key={m.movie_id} layout exit={{ opacity: 0, scale: 0.9 }}>
                  <MovieCard movie={m} index={idx} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </section>

      <Offers promos={config?.promos} />
    </div>
  );
}
