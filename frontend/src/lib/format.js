const IST = "Asia/Kolkata";

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

const dateObj = (d) => new Date(`${d}T12:00:00`);

export function fmtDate(d, opts = { weekday: "short", day: "numeric", month: "short" }) {
  return d ? dateObj(d).toLocaleDateString("en-IN", opts) : "";
}

/** "YYYY-MM-DD" and "HH:MM:SS" for the cinema's local time, whatever the browser's time zone is. */
export function nowIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const o = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { date: `${o.year}-${o.month}-${o.day}`, time: `${o.hour}:${o.minute}:${o.second}` };
}

export function dayLabel(d) {
  const today = nowIST().date;
  const t = new Date(`${today}T12:00:00`);
  const diff = Math.round((dateObj(d) - t) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return fmtDate(d, { weekday: "short" });
}

export const isPast = (date, time) => {
  const n = nowIST();
  return `${date} ${time}` <= `${n.date} ${n.time}`;
};

export const seatLabel = (s) => (s.label ? s.label : `${s.row_num}${s.seat_num}`);

export const duration = (min) => (min ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m` : "");

export function upscale(url) {
  return url ? url.replace("/w342/", "/w500/") : url;
}

/** Deterministic colour pair per title, used for poster art and glows. */
const PALETTES = [
  ["#ff3d6e", "#7c5cff"], ["#00c2ff", "#7c5cff"], ["#ffb547", "#ff3d6e"], ["#22d3a5", "#2563eb"],
  ["#f472b6", "#f59e0b"], ["#a78bfa", "#06b6d4"], ["#fb7185", "#f97316"], ["#34d399", "#a3e635"],
];
export function artFor(title = "") {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return { a, b, angle: 120 + (h % 5) * 20 };
}
