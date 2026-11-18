// End-to-end smoke tests. Run with the API + a seeded MySQL up:  npm test
//   API_URL=http://localhost:3000 npm test
import test from "node:test";
import assert from "node:assert/strict";

const API = process.env.API_URL || "http://localhost:3000";
const j = async (path, { token, method = "GET", body } = {}) => {
  const res = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};

const login = async (email = "aarav.mehta@example.com") => (await j("/auth/login", { method: "POST", body: { email, password: "cine1234" } })).data;

async function pickFreeSeats(n, tier = "Premium") {
  const { data: shows } = await j("/shows");
  for (const show of shows) {
    const { data } = await j(`/seats/${show.show_id}`);
    const free = data.seats.filter((s) => s.status === "Available" && s.type === tier);
    if (free.length >= n) return { show, ids: free.slice(0, n).map((s) => s.show_seat_id) };
  }
  throw new Error("no show with free seats");
}

test("catalog: movies and upcoming shows", async () => {
  const movies = (await j("/movies")).data;
  assert.ok(movies.length >= 12);
  assert.ok(movies[0].rating >= movies.at(-1).rating, "sorted by rating");
  const shows = (await j("/shows")).data;
  assert.ok(shows.length > 50);
  assert.match(shows[0].show_date, /^\d{4}-\d{2}-\d{2}$/);
});

test("auth: wrong password rejected, register + login work", async () => {
  assert.equal((await j("/auth/login", { method: "POST", body: { email: "aarav.mehta@example.com", password: "nope" } })).status, 401);
  const email = `t${Date.now()}@example.com`;
  const reg = await j("/auth/register", { method: "POST", body: { name: "Test User", email, password: "secret12" } });
  assert.equal(reg.status, 201);
  assert.equal((await j("/auth/me", { token: reg.data.token })).data.user.email, email);
  assert.equal((await j("/auth/register", { method: "POST", body: { name: "X Y", email, password: "secret12" } })).status, 409);
});

test("booking requires auth", async () => {
  assert.equal((await j("/book", { method: "POST", body: { show_id: 1, show_seat_ids: [1] } })).status, 401);
});

test("full flow: hold -> promo quote -> pay -> ticket; server prices the order", async () => {
  const { token } = await login();
  const { show, ids } = await pickFreeSeats(2, "Premium");
  const book = await j("/book", { token, method: "POST", body: { show_id: show.show_id, show_seat_ids: ids } });
  assert.equal(book.status, 201);
  const id = book.data.booking_id;
  assert.equal(book.data.quote.subtotal, 640); // 2 x Premium 320

  const q = await j("/quote", { token, method: "POST", body: { booking_id: id, promo_code: "cine20" } });
  assert.equal(q.data.discount, 128);
  assert.equal(q.data.total, 640 + 40 - 128);
  assert.ok((await j("/quote", { token, method: "POST", body: { booking_id: id, promo_code: "NOPE" } })).data.promoError);

  // validation errors do not consume the hold
  const bad = await j("/payment", { token, method: "POST", body: { booking_id: id, method: "UPI", details: { upi_id: "bad" }, amount: 1 } });
  assert.equal(bad.status, 400);

  const pay = await j("/payment", { token, method: "POST", body: { booking_id: id, method: "UPI", promo_code: "CINE20", amount: 1, details: { upi_id: "aarav@okhdfc" } } });
  assert.equal(pay.status, 201);
  assert.equal(pay.data.booking.status, "Confirmed");
  assert.equal(pay.data.booking.total, 552, "client amount is ignored");
  assert.equal(pay.data.booking.seats.length, 2);

  // seats are now sold
  const seats = (await j(`/seats/${show.show_id}`)).data.seats;
  assert.ok(ids.every((sid) => seats.find((s) => s.show_seat_id === sid).status === "Booked"));
  // can't pay twice
  assert.equal((await j("/payment", { token, method: "POST", body: { booking_id: id, method: "UPI", details: { upi_id: "a@okhdfc" } } })).status, 409);
  // shows up in my bookings, and other users can't read it
  assert.ok((await j("/bookings", { token })).data.some((b) => b.booking_id === id));
  const other = await login("isha.sharma@example.com");
  assert.equal((await j(`/bookings/${id}`, { token: other.token })).status, 404);
});

test("double booking is impossible", async () => {
  const a = await login("isha.sharma@example.com");
  const b = await login("kabir.singh@example.com");
  const { show, ids } = await pickFreeSeats(1, "Regular");
  const [r1, r2] = await Promise.all([
    j("/book", { token: a.token, method: "POST", body: { show_id: show.show_id, show_seat_ids: ids } }),
    j("/book", { token: b.token, method: "POST", body: { show_id: show.show_id, show_seat_ids: ids } }),
  ]);
  assert.deepEqual([r1.status, r2.status].sort(), [201, 409]);
  const winner = r1.status === 201 ? { t: a.token, id: r1.data.booking_id } : { t: b.token, id: r2.data.booking_id };
  assert.equal((await j(`/bookings/${winner.id}`, { token: winner.t, method: "DELETE" })).data.released, true);
  // released seat can be booked again
  assert.equal((await j("/book", { token: b.token, method: "POST", body: { show_id: show.show_id, show_seat_ids: ids } })).status, 201);
});

test("declined card releases the seats", async () => {
  const { token } = await login("meera.iyer@example.com");
  const { show, ids } = await pickFreeSeats(1, "VIP");
  const { data } = await j("/book", { token, method: "POST", body: { show_id: show.show_id, show_seat_ids: ids } });
  const pay = await j("/payment", { token, method: "POST", body: { booking_id: data.booking_id, method: "Card", details: { number: "4000 0000 0000 0002", expiry: "12/34", cvv: "123" } } });
  assert.equal(pay.status, 402);
  const seats = (await j(`/seats/${show.show_id}`)).data.seats;
  assert.equal(seats.find((s) => s.show_seat_id === ids[0]).status, "Available");
});

test("limits: max 8 seats", async () => {
  const { token } = await login();
  const { show, ids } = await pickFreeSeats(9, "Regular").catch(() => pickFreeSeats(9, "Premium"));
  assert.equal((await j("/book", { token, method: "POST", body: { show_id: show.show_id, show_seat_ids: ids } })).status, 400);
});

test("chatbot (built-in mode) answers with cards", async () => {
  const r = await j("/chat", { method: "POST", body: { message: "best action movies" } });
  assert.equal(r.status, 200);
  assert.ok(r.data.reply.length > 10);
  assert.ok(r.data.cards.some((c) => c.type === "movie" && c.genre === "Action"));
  const h = await j("/chat", { method: "POST", body: { message: "aaj kya dekhu?" } });
  assert.equal(h.status, 200);
  assert.equal((await j("/chat", { method: "POST", body: { message: "" } })).status, 400);
});
