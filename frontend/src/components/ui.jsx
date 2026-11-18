import { forwardRef } from "react";
import { motion } from "framer-motion";

const cx = (...a) => a.filter(Boolean).join(" ");

export const Button = forwardRef(function Button({ children, className = "", variant = "primary", size = "md", loading, disabled, ...props }, ref) {
  const sizes = { sm: "px-3.5 py-2 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-base" };
  const variants = {
    primary: "bg-gradient-to-r from-brand-rose to-brand-violet text-white shadow-brand hover:brightness-110",
    ghost: "border border-white/10 bg-white/[0.05] text-zinc-100 hover:bg-white/10",
    outline: "border border-white/20 text-zinc-100 hover:border-white/40 hover:bg-white/5",
    danger: "bg-rose-500/90 text-white hover:bg-rose-500",
  };
  return (
    <motion.button
      ref={ref}
      whileHover={disabled || loading ? undefined : { scale: 1.03 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      disabled={disabled || loading}
      className={cx("focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none", sizes[size], variants[variant], className)}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
      {children}
    </motion.button>
  );
});

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "border-white/10 bg-white/10 text-zinc-200",
    brand: "border-brand-violet/30 bg-brand-violet/15 text-violet-200",
    success: "border-emerald-400/25 bg-emerald-500/15 text-emerald-200",
    warn: "border-amber-400/25 bg-amber-500/15 text-amber-200",
    danger: "border-rose-400/25 bg-rose-500/15 text-rose-200",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", tones[tone], className)}>{children}</span>;
}

export function Card({ children, className = "", ...props }) {
  return (
    <div className={cx("rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-glow backdrop-blur-xl", className)} {...props}>
      {children}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return (
    <div className={cx("relative overflow-hidden rounded-2xl bg-white/[0.05]", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
    </div>
  );
}

export function Rating({ value, className = "" }) {
  if (!value) return null;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-amber-300 backdrop-blur", className)}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 18l-6.4 3.7L7 14.5 1.7 9.5l7.2-.9z" /></svg>
      {Number(value).toFixed(1)}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, right }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-rose">{eyebrow}</div>}
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-5 text-center">
      <div className="text-sm font-medium text-rose-100">⚠️ {message}</div>
      {onRetry && <Button variant="ghost" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
