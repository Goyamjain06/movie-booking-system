// All showtimes are stored as local cinema time (India). The server may run in UTC, so we
// always compute "now" explicitly in IST instead of trusting the host time zone.
const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

function parts(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const o = {};
  for (const p of fmt.formatToParts(date)) o[p.type] = p.value;
  return o;
}

export function nowLocal(date = new Date()) {
  const o = parts(date);
  const day = `${o.year}-${o.month}-${o.day}`;
  const time = `${o.hour}:${o.minute}:${o.second}`;
  return { date: day, time, ts: `${day} ${time}` };
}

/** YYYY-MM-DD for today + n days (local cinema calendar). */
export function dateOffset(n) {
  const base = nowLocal().date; // already local
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Local "now" + minutes, formatted for MySQL DATETIME. */
export function localPlusMinutes(min) {
  return nowLocal(new Date(Date.now() + min * 60_000)).ts;
}
