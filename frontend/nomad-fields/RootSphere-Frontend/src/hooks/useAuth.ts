import { useNavigate } from "react-router-dom";
import { storage } from "@/lib/storage";

export function useAuth() {
  const navigate = useNavigate();

  const farmerId = storage.getFarmerId();
  const farmerName = localStorage.getItem("farmer_name") || "Farmer";
  const token = localStorage.getItem("access_token");
  const isAuthenticated = !!(farmerId && token);

  const logout = () => {
    storage.clearAll();
    navigate("/");
  };

  return { farmerId, farmerName, token, isAuthenticated, logout };
}
