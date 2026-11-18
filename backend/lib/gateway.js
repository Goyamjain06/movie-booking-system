// A small *simulated* payment gateway. No real money moves and no card data is stored.
// Test inputs (documented in the README) let you demo both success and failure paths.
const luhn = (num) => {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
};

const WALLETS = ["Paytm", "PhonePe", "Amazon Pay"];

/** Returns { error } for malformed input (HTTP 400), else { ok, reason? } for the simulated outcome. */
export function chargeSimulated(method, details = {}) {
  if (method === "UPI") {
    const id = String(details.upi_id || "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,}@[a-z]{2,}$/.test(id)) return { error: "Enter a valid UPI ID, e.g. name@okhdfc" };
    if (id.startsWith("fail@")) return { ok: false, reason: "Your bank declined this UPI request" };
    return { ok: true, ref: `UPI${Date.now().toString().slice(-9)}` };
  }
  if (method === "Card") {
    const number = String(details.number || "").replace(/\s+/g, "");
    const expiry = String(details.expiry || "");
    const cvv = String(details.cvv || "");
    if (!/^\d{13,19}$/.test(number) || !luhn(number)) return { error: "That card number doesn't look right" };
    const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return { error: "Enter expiry as MM/YY" };
    const exp = new Date(2000 + Number(m[2]), Number(m[1]), 1); // first day after expiry month
    if (exp <= new Date()) return { error: "This card has expired" };
    if (!/^\d{3,4}$/.test(cvv)) return { error: "Enter the 3-digit CVV" };
    if (number === "4000000000000002") return { ok: false, reason: "Card declined by the issuing bank" };
    if (number === "4000000000009995") return { ok: false, reason: "Insufficient funds on this card" };
    return { ok: true, ref: `CRD${Date.now().toString().slice(-9)}` };
  }
  if (method === "Wallet") {
    if (!WALLETS.includes(details.wallet)) return { error: "Choose a wallet" };
    return { ok: true, ref: `WAL${Date.now().toString().slice(-9)}` };
  }
  return { error: "Unsupported payment method" };
}
