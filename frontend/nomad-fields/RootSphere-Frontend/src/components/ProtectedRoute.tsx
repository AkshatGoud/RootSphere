import { Navigate, Outlet } from "react-router-dom";
import { storage } from "@/lib/storage";

/** Decode a JWT and return its `exp` claim (seconds since epoch), or null if
 *  the token is malformed. We don't verify the signature — that's the API's
 *  job. We only use this to skip the protected-page render for a token we
 *  know will be rejected. */
function getTokenExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

export default function ProtectedRoute() {
  const farmerId = storage.getFarmerId();
  const token = localStorage.getItem("access_token");

  if (!farmerId || !token) {
    return <Navigate to="/" replace />;
  }

  const exp = getTokenExp(token);
  if (exp !== null && exp * 1000 <= Date.now()) {
    storage.clearAll();
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
