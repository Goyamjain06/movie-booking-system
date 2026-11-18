import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l.slice(-3), { id, message, tone }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3800);
  }, []);
  const api = useMemo(() => ({ info: (m) => push(m, "info"), success: (m) => push(m, "success"), error: (m) => push(m, "error") }), [push]);
  const tones = { info: "border-white/15", success: "border-emerald-400/40", error: "border-rose-400/50" };
  const icons = { info: "ℹ️", success: "✅", error: "⚠️" };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border bg-ink-800/95 px-4 py-3 text-sm shadow-glow backdrop-blur-xl ${tones[t.tone]}`}
            >
              <span>{icons[t.tone]}</span>
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
