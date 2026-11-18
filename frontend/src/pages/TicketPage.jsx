import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { QRCodeSVG } from "qrcode.react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Poster } from "../components/Poster";
import { Button, ErrorBox, Skeleton } from "../components/ui";
import { artFor, duration, fmtDate, fmtTime, money } from "../lib/format";
import { useAuth } from "../state/auth";
import { useToast } from "../state/toast";
import { BRAND } from "../config";

function icsFor(b) {
  const pad = (n) => String(n).padStart(2, "0");
  const [y, m, d] = b.show_date.split("-");
  const [hh, mm] = b.start_time.split(":").map(Number);
  const start = `${y}${m}${d}T${pad(hh)}${pad(mm)}00`;
  const endMin = hh * 60 + mm + (b.duration || 150);
  const end = `${y}${m}${d}T${pad(Math.floor(endMin / 60) % 24)}${pad(endMin % 60)}00`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CineVerse//EN", "BEGIN:VEVENT",
    `UID:${b.booking_code}@cineverse`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Kolkata:${start}`, `DTEND;TZID=Asia/Kolkata:${end}`,
    `SUMMARY:${b.movie_title} 🎬`, `LOCATION:${b.theatre_name}\\, ${b.theatre_location}`,
    `DESCRIPTION:Booking ${b.booking_code} · Seats ${b.seats.map((s) => s.label).join(" ")}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function celebrate() {
  const end = Date.now() + 1400;
  const colors = ["#ff3d6e", "#7c5cff", "#ffb547", "#ffffff"];
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, disableForReducedMotion: true });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function TicketPage() {
  const { bookingId } = useParams();
  const [params] = useSearchParams();
  const { user, ready, requireLogin } = useAuth();
  const toast = useToast();
  const [b, setB] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { if (ready && !user) requireLogin(null, "Sign in to view your ticket."); }, [ready, user, requireLogin]);
  useEffect(() => {
    if (!user) return;
    api.booking(bookingId).then(setB).catch((e) => setError(e.message));
  }, [bookingId, user]);
  useEffect(() => { if (b && params.get("new")) { const t = setTimeout(celebrate, 450); return () => clearTimeout(t); } }, [b, params]);

  if (ready && !user) return <div className="py-24 text-center text-zinc-400">Please sign in to view this ticket.</div>;
  if (error) return <ErrorBox message={error} />;
  if (!b) return <Skeleton className="mx-auto h-[36rem] max-w-md" />;
  if (b.status !== "Confirmed") return <ErrorBox message="This booking isn't confirmed." />;

  const art = artFor(b.movie_title);
  const qr = `CINEVERSE|${b.booking_code}|${b.show_date} ${b.start_time}|${b.seats.map((s) => s.label).join(",")}`;
  const isNew = Boolean(params.get("new"));

  const share = async () => {
    const text = `I booked ${b.movie_title} on ${fmtDate(b.show_date)} at ${fmtTime(b.start_time)}! 🎬`;
    try {
      if (navigator.share) await navigator.share({ title: BRAND.name, text });
      else { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }
    } catch { /* cancelled */ }
  };
  const calendar = () => {
    const url = URL.createObjectURL(new Blob([icsFor(b)], { type: "text/calendar" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${b.booking_code}.ics` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-md">
      {isNew && (
        <div className="no-print mb-7 flex flex-col items-center text-center">
          <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }} className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/40">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.5 }} /></svg>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4 font-display text-3xl font-extrabold">Booking confirmed!</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-1 text-sm text-zinc-400">Show this QR at the cinema entrance. Enjoy the movie 🍿</motion.p>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 40, rotateX: 12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ type: "spring", stiffness: 110, damping: 16, delay: isNew ? 0.6 : 0 }} style={{ perspective: 1000 }}>
        <div className="print-ticket ticket-mask relative overflow-hidden rounded-3xl bg-ink-800 shadow-glow" style={{ "--notch": "63%" }}>
          <div className="relative p-6 pb-8" style={{ backgroundImage: `linear-gradient(${art.angle}deg, ${art.a}55, ${art.b}22 70%, transparent)` }}>
            <div className="flex gap-4">
              <Poster movie={{ title: b.movie_title, poster_url: b.poster_url, genre: b.genre }} compact className="h-32 w-[5.2rem] shrink-0 rounded-xl border border-white/20 shadow-lg" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-rose">{BRAND.name}</div>
                <h2 className="mt-1 font-display text-xl font-bold leading-tight">{b.movie_title}</h2>
                <div className="mt-1 text-xs text-zinc-400">{[b.language, b.certificate, duration(b.duration)].filter(Boolean).join(" · ")}</div>
                <div className="mt-3 inline-block rounded-lg bg-black/30 px-2.5 py-1 font-mono text-xs font-bold tracking-widest">{b.booking_code}</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <Info label="Date" value={fmtDate(b.show_date, { weekday: "short", day: "numeric", month: "long" })} />
              <Info label="Time" value={fmtTime(b.start_time)} />
              <Info label="Cinema" value={b.theatre_name} />
              <Info label="Screen" value={b.screen_name} />
              <div className="col-span-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Seats</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {b.seats.map((s) => <span key={s.label} className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 font-display text-sm font-bold">{s.label}<span className="ml-1 text-[10px] font-normal text-zinc-400">{s.type}</span></span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-6 border-t-2 border-dashed border-white/15" />

          <div className="flex items-center justify-between gap-4 p-6 pt-7">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Paid</div>
              <div className="font-display text-2xl font-extrabold">{money(b.total)}</div>
              <div className="mt-1 text-[11px] text-zinc-500">via {b.paid_method}{b.promo_code ? ` · ${b.promo_code}` : ""}</div>
              {b.payment_reference && <div className="font-mono text-[10px] text-zinc-600">{b.payment_reference}</div>}
            </div>
            <div className="rounded-2xl bg-white p-2.5"><QRCodeSVG value={qr} size={104} level="M" /></div>
          </div>
        </div>
      </motion.div>

      <div className="no-print mt-6 grid grid-cols-3 gap-3">
        <Button variant="ghost" onClick={calendar} className="flex-col !gap-1 py-3 text-xs"><span className="text-lg">📅</span>Calendar</Button>
        <Button variant="ghost" onClick={() => window.print()} className="flex-col !gap-1 py-3 text-xs"><span className="text-lg">🖨️</span>Print / PDF</Button>
        <Button variant="ghost" onClick={share} className="flex-col !gap-1 py-3 text-xs"><span className="text-lg">🔗</span>Share</Button>
      </div>
      <div className="no-print mt-5 flex justify-center gap-3">
        <Link to="/"><Button>Book another movie</Button></Link>
        <Link to="/bookings"><Button variant="outline">All bookings</Button></Link>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}
