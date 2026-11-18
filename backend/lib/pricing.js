// Single source of truth for money. The client only ever *displays* these numbers.
export const SEAT_PRICES = { Regular: 200, Premium: 320, VIP: 480 };
export const CONVENIENCE_FEE_PER_TICKET = 20;
export const MAX_SEATS_PER_BOOKING = 8;
export const HOLD_MINUTES = 6;

export const PROMOS = {
  CINE20: {
    label: "20% off, up to ₹150",
    min: 400,
    apply: (subtotal) => Math.min(Math.round(subtotal * 0.2), 150),
  },
  WELCOME50: {
    label: "Flat ₹50 off",
    min: 300,
    apply: () => 50,
  },
  VIPNIGHT: {
    label: "₹100 off on 4+ tickets",
    min: 800,
    minSeats: 4,
    apply: () => 100,
  },
};

export function priceFor(type) {
  return SEAT_PRICES[type] ?? SEAT_PRICES.Regular;
}

export function checkPromo(code, subtotal, seatCount) {
  if (!code) return { ok: true, discount: 0, code: null };
  const key = String(code).trim().toUpperCase();
  const promo = PROMOS[key];
  if (!promo) return { ok: false, error: "That promo code isn't valid", discount: 0 };
  if (subtotal < promo.min) {
    return { ok: false, error: `${key} needs a minimum order of ₹${promo.min}`, discount: 0 };
  }
  if (promo.minSeats && seatCount < promo.minSeats) {
    return { ok: false, error: `${key} needs at least ${promo.minSeats} tickets`, discount: 0 };
  }
  return { ok: true, code: key, label: promo.label, discount: promo.apply(subtotal) };
}

export function computeTotals(seatTypes, promoCode) {
  const subtotal = seatTypes.reduce((s, t) => s + priceFor(t), 0);
  const fee = CONVENIENCE_FEE_PER_TICKET * seatTypes.length;
  const promo = checkPromo(promoCode, subtotal, seatTypes.length);
  const discount = promo.ok ? promo.discount : 0;
  return {
    subtotal,
    fee,
    discount,
    total: Math.max(subtotal + fee - discount, 0),
    promo: promo.ok ? (promo.code ? { code: promo.code, label: promo.label } : null) : null,
    promoError: promo.ok ? null : promo.error,
  };
}
