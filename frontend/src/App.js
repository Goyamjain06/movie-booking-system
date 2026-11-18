import { lazy, Suspense } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./state/auth";
import { ChatProvider } from "./state/chat";
import { ToastProvider } from "./state/toast";
import { AppShell } from "./components/AppShell";
import { AuthModal } from "./components/AuthModal";
import { ChatWidget } from "./components/ChatWidget";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Splash } from "./components/Splash";
import { Skeleton } from "./components/ui";
import HomePage from "./pages/HomePage";

// Heavier pages are loaded on demand so the first paint stays fast.
const MoviePage = lazy(() => import("./pages/MoviePage"));
const SeatsPage = lazy(() => import("./pages/SeatsPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const TicketPage = lazy(() => import("./pages/TicketPage"));
const BookingsPage = lazy(() => import("./pages/BookingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

/**
 * Page transitions. `location` is passed to <Routes> explicitly so the page that is animating out
 * keeps rendering its own route; without it the new page would mount twice (once inside the old
 * wrapper, once in the new one) and lose its state.
 */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies/:movieId" element={<MoviePage />} />
            <Route path="/shows/:showId/seats" element={<SeatsPage />} />
            <Route path="/checkout/:bookingId" element={<CheckoutPage />} />
            <Route path="/ticket/:bookingId" element={<TicketPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <ChatProvider>
              <Splash />
              <AppShell>
                <AnimatedRoutes />
              </AppShell>
              <AuthModal />
              <ChatWidget />
            </ChatProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
    </ErrorBoundary>
  );
}
