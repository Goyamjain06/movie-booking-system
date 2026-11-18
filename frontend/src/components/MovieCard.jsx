import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Poster } from "./Poster";
import { Rating } from "./ui";
import { duration } from "../lib/format";

/** Poster card with a subtle 3D tilt that follows the pointer, and a hover overlay. */
export function MovieCard({ movie, index = 0 }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [7, -7]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(x, [0, 1], [-7, 7]), { stiffness: 220, damping: 18 });

  const onMove = (e) => {
    if (reduce || e.pointerType === "touch") return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width);
    y.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { x.set(0.5); y.set(0.5); };

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.05 }} style={{ perspective: 900 }}>
      <Link to={`/movies/${movie.movie_id}`} className="focus-ring group block rounded-2xl" aria-label={`${movie.title}, rated ${movie.rating}. View showtimes`}>
        <motion.div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="relative">
          <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 shadow-glow transition-shadow duration-300 group-hover:shadow-brand">
            <Poster movie={movie} className="h-full w-full" imgClassName="transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute left-2.5 top-2.5"><Rating value={movie.rating} /></div>
            {movie.certificate && <div className="absolute right-2.5 top-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-200 backdrop-blur">{movie.certificate}</div>}
            {/* hover overlay */}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              <p className="line-clamp-4 text-[11px] leading-relaxed text-zinc-300">{movie.synopsis}</p>
              <span className="mt-3 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-brand-rose to-brand-violet py-2 text-xs font-bold shadow-brand">Book tickets →</span>
            </div>
          </div>
        </motion.div>
        <div className="mt-3 px-0.5">
          <h3 className="line-clamp-1 font-display text-[15px] font-semibold">{movie.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{[movie.genre, movie.language, duration(movie.duration)].filter(Boolean).join(" · ")}</p>
        </div>
      </Link>
    </motion.div>
  );
}
