import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <motion.div initial={{ scale: 0.6, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring" }} className="text-7xl">🎬</motion.div>
      <h1 className="mt-5 font-display text-4xl font-extrabold"><span className="gradient-text">404</span> · Scene missing</h1>
      <p className="mt-2 text-zinc-400">That page isn't playing here.</p>
      <Link to="/"><Button className="mt-6">Back to movies</Button></Link>
    </div>
  );
}
