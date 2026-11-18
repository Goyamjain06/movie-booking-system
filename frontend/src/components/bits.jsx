import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/** Number that counts up (or tweens to a new value). */
export function AnimatedNumber({ value, prefix = "", duration = 0.8, className = "" }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (reduce) { setShown(value); prev.current = value; return; }
    const c = animate(prev.current, value, { duration, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value, duration, reduce]);
  return <span className={className}>{prefix}{Number(shown).toLocaleString("en-IN")}</span>;
}

export function CountUp({ to, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setN(to); return; }
    const c = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, to, reduce]);
  return <span ref={ref}>{n.toLocaleString("en-IN")}{suffix}</span>;
}

/** Circular countdown for the seat hold. `seconds` is the time left when the component mounts. */
export function HoldTimer({ seconds, total = 360, onExpire }) {
  const [left, setLeft] = useState(seconds);
  const expired = useRef(false);
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && !expired.current) { expired.current = true; onExpire?.(); }
    }, 250);
    return () => clearInterval(id);
  }, [seconds, onExpire]);
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, left / total);
  const urgent = left <= 60;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="flex items-center gap-3" role="timer" aria-label={`Seats held for ${mm} minutes ${ss} seconds`}>
      <svg width="54" height="54" viewBox="0 0 54 54" className="-rotate-90">
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle cx="27" cy="27" r={r} fill="none" stroke={urgent ? "#fb7185" : "#7c5cff"} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset 0.3s linear, stroke 0.3s" }} />
      </svg>
      <div>
        <div className={`font-display text-xl font-bold tabular-nums ${urgent ? "text-rose-300" : ""}`}>{mm}:{ss}</div>
        <div className="text-[11px] text-zinc-500">seats held for you</div>
      </div>
    </div>
  );
}
