import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useBooking } from "../state/booking";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = Number(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

const PRICE_BY_TYPE = {
  Regular: 280,
  Premium: 420,
  VIP: 520
};

function seatLabel(seat) {
  return `${seat.row_num}${seat.seat_num}`;
}

export function BookingPage() {
  const navigate = useNavigate();
  const { show, selectedSeats, userId, setBookingId } = useBooking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = useMemo(
    () => selectedSeats.reduce((sum, s) => sum + (PRICE_BY_TYPE[s.type] || 280), 0),
    [selectedSeats]
  );

  async function confirm() {
    try {
      setLoading(true);
      setError("");
      const resp = await api.createBooking({
        user_id: Number(userId),
        show_id: Number(show?.show_id),
        show_seat_ids: selectedSeats.map((s) => s.show_seat_id)
      });
      setBookingId(resp.booking_id);
      navigate("/payment");
    } catch (e) {
      setError(e.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  if (!show?.show_id || selectedSeats.length === 0) {
    return (
      <Card>
        <div className="text-sm text-zinc-200">No seats selected.</div>
        <div className="mt-3">
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Booking Summary</h2>
          <p className="text-sm text-zinc-400">Confirm your booking before payment.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{fmtDate(show.show_date)}</Badge>
            <Badge tone="neutral">🕐 {fmtTime(show.start_time)}</Badge>
            <Badge>{show.screen_name}</Badge>
            <Badge>{show.theatre_name}</Badge>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-zinc-300">Selected seats</div>
            <div className="flex flex-wrap gap-2">
              {selectedSeats.map((s) => (
                <Badge key={s.show_seat_id}>{seatLabel(s)} · {s.type}</Badge>
              ))}
            </div>
          </div>

          {error ? <div className="text-sm text-rose-200">Error: {error}</div> : null}
        </Card>

        <Card className="space-y-4">
          <div className="text-sm font-semibold">Total</div>
          <div className="text-3xl font-semibold tracking-tight">₹{total}</div>

          <Button onClick={confirm} disabled={loading} className="w-full">
            {loading ? "Creating..." : "Confirm Booking"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

