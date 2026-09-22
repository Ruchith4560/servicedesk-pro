import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store.js';
import { Navbar } from './components/common/Navbar.js';
import { LoginPage } from './pages/LoginPage.js';
import { TicketsListPage } from './pages/TicketsListPage.js';
import { LoadingSpinner } from './components/common/LoadingSpinner.js';

// Route-based dynamic code-splitting for high-complexity secondary pages
const TechnicianWorkspacePage = lazy(() =>
  import('./pages/TechnicianWorkspacePage.js').then((m) => ({ default: m.TechnicianWorkspacePage }))
);
const AnalyticsDashboardPage = lazy(() =>
  import('./pages/AnalyticsDashboardPage.js').then((m) => ({ default: m.AnalyticsDashboardPage }))
);
const AuditTrailPage = lazy(() =>
  import('./pages/AuditTrailPage.js').then((m) => ({ default: m.AuditTrailPage }))
);

export default function App() {
  const { initAuth, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner message="Initializing ServiceDesk Pro..." size="lg" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar />

        <main className="flex-1 flex flex-col min-h-0">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center py-24">
                <LoadingSpinner message="Loading module view..." size="md" />
              </div>
            }
          >
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/tickets"
                element={isAuthenticated ? <TicketsListPage /> : <Navigate to="/login" replace />}
              />
              <Route
                path="/tickets/:id"
                element={
                  isAuthenticated ? <TechnicianWorkspacePage /> : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/analytics"
                element={
                  isAuthenticated ? <AnalyticsDashboardPage /> : <Navigate to="/login" replace />
                }
              />
              <Route
                path="/audit"
                element={
                  isAuthenticated ? <AuditTrailPage /> : <Navigate to="/login" replace />
                }
              />
              {/* Default root route */}
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    <Navigate to="/tickets" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
