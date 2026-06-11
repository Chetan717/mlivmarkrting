import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function MteamProtectedRoute({ children }) {
  const navigate = useNavigate();
  const raw = localStorage.getItem("mteamUser");

  useEffect(() => {
    if (!raw) {
      navigate("/login", { replace: true });
    }
  }, [raw, navigate]);

  if (!raw) return null;

  return children;
}
