import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { artFor, dayLabel, fmtTime } from "../lib/format";
import { useChat } from "../state/chat";
import { BRAND } from "../config";

const STORE = "cineverse_chat_v1";
const SUGGESTIONS = ["🎬 Best movies right now", "🍿 What's playing tonight?", "💸 Any offers?", "💺 Which seats are best?"];
const GREETING = { role: "assistant", content: `Hi! I'm **${BRAND.bot}** ✦ your movie buddy. Ask me for recommendations, showtimes, seat tips or offers. Hinglish bhi chalegi 😄`, cards: [], id: "hello" };

function RichText({ text }) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith("**") ? <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong> : <Fragment key={j}>{part}</Fragment>))}
    </Fragment>
  ));
}

/** Reveals assistant text word by word, like it is being typed. */
function Typed({ text, animate, onTick }) {
  const reduce = useReducedMotion();
  const words = text.split(/(\s+)/);
  const [n, setN] = useState(animate && !reduce ? 0 : words.length);
  useEffect(() => {
    if (n >= words.length) return;
    const id = setTimeout(() => { setN((x) => Math.min(x + 3, words.length)); onTick?.(); }, 28);
    return () => clearTimeout(id);
  }, [n, words.length, onTick]);
  return <RichText text={words.slice(0, n).join("")} />;
}

function Cards({ cards, go }) {
  if (!cards?.length) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {cards.map((c, i) => {
        if (c.type === "movie") {
          const art = artFor(c.title);
          return (
            <motion.button key={`m${c.movie_id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }} whileHover={{ y: -3 }} onClick={() => go(`/movies/${c.movie_id}`)} className="focus-ring w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] text-left">
              <div className="flex h-20 items-end p-2" style={{ backgroundImage: `linear-gradient(${art.angle}deg, ${art.a}, ${art.b})` }}>
                <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">★ {c.rating}</span>
              </div>
              <div className="p-2">
                <div className="line-clamp-2 text-xs font-semibold leading-tight">{c.title}</div>
                <div className="mt-0.5 text-[10px] text-zinc-500">{c.genre} · {c.language}</div>
              </div>
            </motion.button>
          );
        }
        return (
          <motion.button key={`s${c.show_id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }} whileHover={{ y: -3 }} onClick={() => go(`/shows/${c.show_id}/seats`)} className="focus-ring w-40 shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] p-2.5 text-left">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-rose">{dayLabel(c.date)} · {fmtTime(c.time)}</div>
            <div className="mt-1 line-clamp-1 text-xs font-semibold">{c.movie}</div>
            <div className="line-clamp-1 text-[10px] text-zinc-500">{c.theatre}</div>
            <div className={`mt-1 text-[10px] ${c.seats_left < 15 ? "text-rose-300" : "text-emerald-300"}`}>{c.seats_left} seats left →</div>
          </motion.button>
        );
      })}
    </div>
  );
}

export function ChatWidget() {
  const { open, setOpen, seed } = useChat();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [messages, setMessages] = useState(() => {
    try { const s = JSON.parse(sessionStorage.getItem(STORE)); if (Array.isArray(s) && s.length) return s; } catch { /* ignore */ }
    return [GREETING];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(null);
  const [unread, setUnread] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const lastSeed = useRef(null);
  const sticky = /^\/shows\/\d+\/seats/.test(pathname); // keep the bubble above the seat-selection bar

  const scroll = useCallback(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, []);
  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-30).map((m) => ({ ...m, fresh: false })))); } catch { /* ignore */ } }, [messages]);
  useEffect(() => { scroll(); }, [messages, busy, open, scroll]);
  useEffect(() => { if (open) { setUnread(false); setTimeout(() => inputRef.current?.focus(), 250); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
  useEffect(() => { if (open && ai === null) api.config().then((c) => setAi(c.ai_powered)).catch(() => setAi(false)); }, [open, ai]);

  const send = useCallback(async (text) => {
    const msg = (text ?? "").trim();
    if (!msg || busy) return;
    setInput("");
    const history = messages.filter((m) => m.id !== "hello").map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: msg, id: crypto.randomUUID?.() || String(Math.random()) }]);
    setBusy(true);
    try {
      const r = await api.chat(msg, history);
      setMessages((m) => [...m, { role: "assistant", content: r.reply, cards: r.cards || [], fresh: true, id: crypto.randomUUID?.() || String(Math.random()) }]);
      if (!open) setUnread(true);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `😕 ${e.message}`, cards: [], id: crypto.randomUUID?.() || String(Math.random()) }]);
    } finally {
      setBusy(false);
    }
  }, [busy, messages, open]);

  // other pages can open the chat with a ready-made question
  useEffect(() => {
    if (seed && seed.n !== lastSeed.current) { lastSeed.current = seed.n; send(seed.text); }
  }, [seed, send]);

  const go = (path) => { navigate(path); if (window.innerWidth < 640) setOpen(false); };
  const clear = () => setMessages([GREETING]);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }} onClick={() => setOpen(true)} aria-label={`Open ${BRAND.bot} assistant`} className={`no-print focus-ring fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose to-brand-violet text-2xl shadow-brand transition-[bottom] sm:right-6 ${sticky ? "bottom-24" : "bottom-5 sm:bottom-6"}`}>
            <span className="absolute inset-0 animate-ping2 rounded-full bg-brand-violet/60" />
            <span className="relative">✦</span>
            {unread && <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-ink-950 bg-emerald-400" />}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section role="dialog" aria-label={`${BRAND.bot} chat`} initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 28 }} style={{ transformOrigin: "bottom right" }} className="no-print fixed inset-x-0 bottom-0 z-[60] flex h-[85dvh] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-900/95 shadow-glow backdrop-blur-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[36rem] sm:w-[24rem] sm:rounded-3xl">
            <header className="relative flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-rose/15 to-brand-violet/15" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose to-brand-violet text-lg">✦</div>
              <div className="relative flex-1">
                <div className="font-display text-sm font-bold">{BRAND.bot}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{ai ? "AI assistant · online" : "Movie assistant · online"}</div>
              </div>
              <button onClick={clear} className="relative rounded-full px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Clear conversation">Clear</button>
              <button onClick={() => setOpen(false)} className="focus-ring relative rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Close chat">✕</button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] ${m.role === "user" ? "" : "w-full"}`}>
                    <div className={`inline-block rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-md bg-gradient-to-br from-brand-rose to-brand-violet text-white" : "rounded-bl-md border border-white/10 bg-white/[0.06] text-zinc-200"}`}>
                      {m.role === "assistant" ? <Typed text={m.content} animate={m.fresh} onTick={scroll} /> : m.content}
                    </div>
                    {m.role === "assistant" && <Cards cards={m.cards} go={go} />}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <div className="flex" aria-label="Cinebot is typing">
                  <div className="flex gap-1 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3.5">
                    {[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-zinc-400" animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />)}
                  </div>
                </div>
              )}
              {messages.length <= 1 && !busy && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }} onClick={() => send(s.replace(/^\S+\s/, ""))} className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 transition hover:border-brand-violet/60 hover:bg-brand-violet/10">{s}</motion.button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-white/10 p-3">
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about movies, shows, offers…" maxLength={500} className="input !rounded-full !py-2.5" aria-label="Message" />
              <button type="submit" disabled={busy || !input.trim()} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-rose to-brand-violet transition disabled:opacity-40" aria-label="Send">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
