import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useBooking } from "../state/booking";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

const PRICE_BY_TYPE = { Regular: 280, Premium: 420, VIP: 520 };
const METHODS = [
  { id: "UPI", icon: "📱", desc: "PhonePe, GPay, Paytm" },
  { id: "Card", icon: "💳", desc: "Debit / Credit card" },
  { id: "Wallet", icon: "👛", desc: "Paytm, Amazon Pay" },
];

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short"
  });
}

function TicketCard({ bookingId, show, selectedSeats, movie, total, onReset }) {
  const navigate = useNavigate();
  const seats = selectedSeats
    .slice()
    .sort((a, b) => String(a.row_num).localeCompare(String(b.row_num)) || a.seat_num - b.seat_num)
    .map((s) => `${s.row_num}${s.seat_num}`)
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto max-w-md"
    >
      {/* Success banner */}
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/30 text-3xl"
        >
          ✓
        </motion.div>
        <h2 className="text-2xl font-bold text-white">Booking Confirmed!</h2>
        <p className="text-sm text-zinc-400">Your tickets are booked. Enjoy the show!</p>
      </div>

      {/* Ticket */}
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.07] to-white/[0.02] shadow-glow">
        {/* Top glow */}
        <div className="pointer-events-none absolute -top-10 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-2xl" />

        {/* Header */}
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-indigo-400">District Movies</div>
              <div className="mt-1 text-xl font-bold text-white">{movie?.title || "Movie"}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">Booking ID</div>
              <div className="font-mono text-lg font-bold text-white">#{bookingId}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-2 gap-px bg-white/[0.06] px-0">
          <InfoCell label="Date" value={fmtDate(show?.show_date)} />
          <InfoCell label="Time" value={fmtTime(show?.start_time)} />
          <InfoCell label="Theatre" value={show?.theatre_name || "—"} />
          <InfoCell label="Screen" value={show?.screen_name || "—"} />
          <InfoCell label="Seats" value={seats} className="col-span-2" />
        </div>

        {/* Divider with notches */}
        <div className="relative flex items-center px-4 py-0">
          <div className="-ml-5 h-5 w-5 rounded-full bg-ink-950" />
          <div className="mx-2 flex-1 border-t border-dashed border-white/15" />
          <div className="-mr-5 h-5 w-5 rounded-full bg-ink-950" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <div className="text-xs text-zinc-500">Total Paid</div>
            <div className="text-2xl font-bold text-white">₹{total}</div>
          </div>
          {/* Fake QR placeholder */}
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-2xl">
            🎫
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => { onReset(); navigate("/"); }}
          className="flex-1"
        >
          Book Another Movie
        </Button>
        <Button
          variant="ghost"
          onClick={() => { onReset(); navigate("/"); }}
          className="flex-1"
        >
          Go Home
        </Button>
      </div>
    </motion.div>
  );
}

function InfoCell({ label, value, className = "" }) {
  return (
    <div className={`bg-white/[0.02] px-6 py-4 ${className}`}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-zinc-100">{value || "—"}</div>
    </div>
  );
}

export function PaymentPage() {
  const navigate = useNavigate();
  const { bookingId, selectedSeats, show, movie, reset } = useBooking();
  const [method, setMethod] = useState("UPI");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const total = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + (PRICE_BY_TYPE[s.type] || 280), 0),
    [selectedSeats]
  );

  async function payNow() {
    try {
      setLoading(true);
      setError("");
      const resp = await api.pay({ booking_id: bookingId, amount: total, method });
      setResult(resp);
    } catch (e) {
      setError(e.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  if (!bookingId) {
    return (
      <Card>
        <div className="text-sm text-zinc-200">No booking found. Please start from the home page.</div>
        <div className="mt-3">
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </Card>
    );
  }

  // Show ticket on success
  if (result?.payment_status === "Successful") {
    return (
      <TicketCard
        bookingId={bookingId}
        show={show}
        movie={movie}
        selectedSeats={selectedSeats}
        total={total}
        onReset={reset}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Complete Payment</h2>
          <p className="text-sm text-zinc-400">Choose a method to confirm your booking.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Booking #{bookingId}</Badge>
            <Badge tone="success">₹{total} due</Badge>
          </div>

          {/* Payment methods */}
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Payment Method
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    method === m.id
                      ? "border-indigo-400/30 bg-indigo-500/10 ring-1 ring-indigo-400/20"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <div className="mb-1 text-xl">{m.icon}</div>
                  <div className="text-sm font-semibold">{m.id}</div>
                  <div className="text-xs text-zinc-500">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              ⚠ {error}
            </div>
          )}

          <Button onClick={payNow} disabled={loading} className="w-full py-3 text-base">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Processing…
              </span>
            ) : (
              `Pay ₹${total} via ${method}`
            )}
          </Button>
        </Card>

        {/* Price breakdown */}
        <Card className="space-y-3 h-fit">
          <div className="text-sm font-semibold">Order Summary</div>
          <div className="space-y-2">
            {selectedSeats
              .slice()
              .sort((a, b) => String(a.row_num).localeCompare(String(b.row_num)) || a.seat_num - b.seat_num)
              .map((s) => (
                <div key={s.show_seat_id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">
                    Seat {s.row_num}{s.seat_num}
                    <span className="ml-1 text-xs text-zinc-500">({s.type})</span>
                  </span>
                  <span className="font-medium text-zinc-100">₹{PRICE_BY_TYPE[s.type] || 280}</span>
                </div>
              ))}
          </div>
          <div className="border-t border-white/10 pt-3 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Total</span>
            <span className="text-xl font-bold">₹{total}</span>
          </div>
          {show && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-zinc-500 space-y-1">
              <div>📅 {fmtDate(show.show_date)} · 🕐 {fmtTime(show.start_time)}</div>
              <div>🏛 {show.theatre_name}</div>
              <div>🎭 {show.screen_name}</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

