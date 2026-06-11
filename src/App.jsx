import Home from "./Pages/Home";
import { UnifiedLogin } from "./Auth/UnifiedLogin";
import { Signup } from "./Auth/Signup";
import ProtectedRoute from "./Auth/ProtectedR";
import { Routes, Route, Navigate } from "react-router";
import { Forgetpin } from "./Auth/ForgetPin";
import Layout from "./Layout";
import Marketingteam from "./Pages/Mteam/Marketingteam";
import CouponCodeManager from "./Pages/Mteam/CouponCodeManager";
import MainTeam from "./Pages/Mteam/MainTeam";
import MteamProtectedRoute from "./Auth/MteamProtectedRoute";
import MteamPortal from "./Pages/Mteam/MteamPortal";


function App() {
  return (
    <Routes>
      {/* ── Protected routes (with Sidebar + Header) ── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <MainTeam />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/marketing"
        element={
          <ProtectedRoute>
            <Layout>
             
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Marketing Team Portal ── */}
      <Route
        path="/mportal"
        element={
          <MteamProtectedRoute>
            <MteamPortal />
          </MteamProtectedRoute>
        }
      />

      {/* ── Auth routes (no Layout) ── */}
      <Route path="/login"   element={<UnifiedLogin />} />
      <Route path="/mlogin"  element={<Navigate to="/login" replace />} />
      <Route path="/signup"  element={<Signup />} />
      <Route path="/forgetpin" element={<Forgetpin />} />
    </Routes>
  );
}

export default App;
