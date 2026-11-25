import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ToastProvider } from './hooks/useToast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Navigation } from './components/Navigation';
import { EDITORIAL_EASE } from './components/MotionPrimitives';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Customers } from './pages/Customers';
import { Login } from './pages/Login';

const EditorialLoader: React.FC = () => (
  <div className="min-h-screen bg-[var(--color-cream)] flex flex-col items-center justify-center gap-3">
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EDITORIAL_EASE }}
      className="w-11 h-11 rounded-xl bg-[#1E3B2F] text-[#F5F0E6] border border-[#C8B48A]/40 flex items-center justify-center font-serif text-base font-semibold shadow-[0_6px_18px_rgba(30,59,47,0.24)]"
    >
      M
    </motion.div>
    <p className="text-xs text-[var(--color-ink-muted)] tracking-wide">
      Verifying ledger session...
    </p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading) return <EditorialLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading) return <EditorialLoader />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const PageTransition: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
      transition={{ duration: 0.34, ease: EDITORIAL_EASE }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const showNavigation = !loading && Boolean(user) && location.pathname !== '/login';

  return (
    <>
      {showNavigation ? <Navigation /> : null}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <PageTransition>
                  <Login />
                </PageTransition>
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Products />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Orders />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Customers />
                </PageTransition>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  );
}

export default App;
