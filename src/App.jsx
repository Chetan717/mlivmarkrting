import Home from "./Pages/Home";
import { Login } from "./Auth/Login";
import { Signup } from "./Auth/Signup";
import ProtectedRoute from "./Auth/ProtectedR";
import { Routes, Route } from "react-router";
import { Forgetpin } from "./Auth/ForgetPin";
import Layout from "./Layout";
import Marketingteam from "./Pages/Mteam/Marketingteam";
import CouponCodeManager from "./Pages/Mteam/CouponCodeManager";
import MainTeam from "./Pages/Mteam/MainTeam";


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

      {/* ── Auth routes (no Layout) ── */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgetpin" element={<Forgetpin />} />
    </Routes>
  );
}

export default App;
