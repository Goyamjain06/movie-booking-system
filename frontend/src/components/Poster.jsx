import { useState } from "react";
import { artFor, upscale } from "../lib/format";

/**
 * Movie poster with generated "poster art" underneath. If the remote image is slow, blocked or
 * missing, the art (gradient + big title) is what people see - it never shows a broken-image icon.
 */
export function Poster({ movie, className = "", imgClassName = "", compact = false }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const art = artFor(movie?.title);
  const title = movie?.title || "";
  const initial = title.replace(/^(the|a)\s+/i, "").charAt(0).toUpperCase();

  return (
    <div
      className={`relative overflow-hidden bg-ink-800 ${className}`}
      style={{ backgroundImage: `linear-gradient(${art.angle}deg, ${art.a}, ${art.b})` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="pointer-events-none absolute -right-3 -top-6 select-none font-display text-[9rem] font-extrabold leading-none text-white/15">{initial}</span>
      {!compact && (
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="line-clamp-3 font-display text-lg font-bold leading-tight text-white drop-shadow">{title}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/70">{movie?.genre}</div>
        </div>
      )}
      <div className="film-grain pointer-events-none absolute inset-0" />
      {movie?.poster_url && !failed && (
        <img
          src={upscale(movie.poster_url)}
          alt={`${title} poster`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
        />
      )}
    </div>
  );
}
