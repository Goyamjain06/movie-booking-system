import { API_BASE } from "./config";

const TOKEN_KEY = "cineverse_token";
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
};

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(path, { method = "GET", body, signal } = {}) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      signal,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("cineverse:unauthorized"));
    throw new ApiError((isJson && data?.error) || "Something went wrong", res.status);
  }
  return data;
}

export const api = {
  config: () => request("/config"),
  movies: () => request("/movies"),
  movie: (id) => request(`/movies/${id}`),
  shows: ({ movieId, date } = {}) => {
    const q = new URLSearchParams();
    if (movieId) q.set("movie_id", movieId);
    if (date) q.set("date", date);
    return request(`/shows${q.toString() ? `?${q}` : ""}`);
  },
  show: (id) => request(`/shows/${id}`),
  seats: (showId, signal) => request(`/seats/${showId}`, { signal }),

  register: (body) => request("/auth/register", { method: "POST", body }),
  login: (body) => request("/auth/login", { method: "POST", body }),
  me: () => request("/auth/me"),

  hold: (show_id, show_seat_ids) => request("/book", { method: "POST", body: { show_id, show_seat_ids } }),
  quote: (booking_id, promo_code) => request("/quote", { method: "POST", body: { booking_id, promo_code } }),
  pay: (body) => request("/payment", { method: "POST", body }),
  booking: (id) => request(`/bookings/${id}`),
  bookings: () => request("/bookings"),
  release: (id) => request(`/bookings/${id}`, { method: "DELETE" }),

  chat: (message, history) => request("/chat", { method: "POST", body: { message, history } }),
};
