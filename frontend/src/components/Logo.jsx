import { BRAND } from "../config";

export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff3d6e" /><stop offset="1" stopColor="#7c5cff" /></linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#12121f" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="url(#lg)" strokeWidth="5" />
      <path d="M27 23l15 9-15 9z" fill="url(#lg)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap sm:gap-2.5">
      <LogoMark size={28} />
      <span className="font-display text-lg font-extrabold tracking-tight">
        Cine<span className="gradient-text inline-block pr-0.5">Verse</span>
      </span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
