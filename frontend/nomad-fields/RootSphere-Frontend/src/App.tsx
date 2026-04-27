import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/" element={<Login />} />
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
