import { useEffect } from "react";
import { useNavigate } from "react-router";
import { getSession } from "../Utils/sessionManager";

export default function MteamProtectedRoute({ children }) {
  const navigate = useNavigate();
  const session  = getSession();

  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  if (!session) return null;
  return children;
}
