import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { storage } from "@/lib/storage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import FieldsList from "./pages/FieldsList";
import CreateField from "./pages/CreateField";
import FieldDetail from "./pages/FieldDetail";
import RecommendationResult from "./pages/RecommendationResult";
import RecommendationHistory from "./pages/RecommendationHistory";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";
import SensorRegistry from "./pages/SensorRegistry";
import AddSensor from "./pages/AddSensor";
import SensorDetail from "./pages/SensorDetail";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import { Profile } from "./pages/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min — avoids refetch flicker on every page mount
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Send already-logged-in users straight to the dashboard instead of the
 *  login form when they hit "/". */
const LoginRoute = () => {
  const isLoggedIn = !!storage.getFarmerId() && !!localStorage.getItem("access_token");
  return isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />;
};

/** Listens for `auth:unauthorized` events dispatched by lib/api.ts on 401
 *  responses and navigates to the login screen via react-router (no page
 *  reload). Lives inside <BrowserRouter> so it can use useNavigate(). */
const AuthEventBridge = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = () => navigate("/", { replace: true });
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [navigate]);
  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <AuthEventBridge />
          <Routes>
            {/* Auth routes */}
            <Route path="/" element={<LoginRoute />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected app routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/fields" element={<FieldsList />} />
              <Route path="/fields/new" element={<CreateField />} />
              <Route path="/field/:fieldId" element={<FieldDetail />} />
              <Route path="/field/:fieldId/recommend" element={<RecommendationResult />} />
              <Route path="/field/:fieldId/history" element={<RecommendationHistory />} />
              <Route path="/field/:fieldId/feedback/:recommendationId" element={<Feedback />} />
              <Route path="/sensors" element={<SensorRegistry />} />
              <Route path="/sensors/new" element={<AddSensor />} />
              <Route path="/sensors/:id" element={<SensorDetail />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
