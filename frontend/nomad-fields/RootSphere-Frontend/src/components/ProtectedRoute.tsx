import { Navigate, Outlet } from "react-router-dom";
import { storage } from "@/lib/storage";

export default function ProtectedRoute() {
  const farmerId = storage.getFarmerId();
  const token = localStorage.getItem("access_token");

  if (!farmerId || !token) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
