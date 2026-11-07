const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000";

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message = typeof data === "string" ? data : data?.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

export const api = {
  getMovies() {
    return request("/movies");
  },
  getShows(movieId) {
    const q = movieId ? `?movie_id=${encodeURIComponent(movieId)}` : "";
    return request(`/shows${q}`);
  },
  getSeats(showId) {
    return request(`/seats/${encodeURIComponent(showId)}`);
  },
  createBooking({ user_id, show_id, show_seat_ids }) {
    return request("/book", {
      method: "POST",
      body: JSON.stringify({ user_id, show_id, show_seat_ids })
    });
  },
  pay({ booking_id, amount, method }) {
    return request("/payment", { method: "POST", body: JSON.stringify({ booking_id, amount, method }) });
  }
};

