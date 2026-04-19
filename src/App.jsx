import Home from "./Pages/Home";
import { Login } from "./Auth/Login";
import { Signup } from "./Auth/Signup";
import ProtectedRoute from "./Auth/ProtectedR";
import { Routes, Route } from "react-router";
import { Forgetpin } from "./Auth/ForgetPin";
import Layout from "./Layout";
import CompaniesHome from "./Pages/companies/CompaniesHome";
import AddCompanies from "./Pages/companies/Forms/AddCompanies";
import EditCompanies from "./Pages/companies/Forms/EditCompanies";
import AddTemplate from "./Pages/Templates/Forms/AddTemplate";
import EditTemplate from "./Pages/Templates/Forms/EditTemplate";
import TemplateHome from "./Pages/Templates/TemplateHome";
import TempHome from "./Pages/Templates/TempHome";
import GraphiHome from "./Pages/Graphics/GraphiHome";
import AddGraphics from "./Pages/Graphics/Form/AddGraphics";
import EditGraphics from "./Pages/Graphics/Form/EditGraphics";
import Marketingteam from "./Pages/Mteam/Marketingteam";
import CouponCodeManager from "./Pages/Mteam/Couponcodemanager";
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
              <Home />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <TemplateHome />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <Layout>
              <CompaniesHome />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies/add"
        element={
          <ProtectedRoute>
            <Layout>
              <AddCompanies />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditCompanies />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates"
        element={
          <ProtectedRoute>
            <Layout>
              <TemplateHome />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates/add"
        element={
          <ProtectedRoute>
            <Layout>
              <AddTemplate />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/templates/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditTemplate />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/graphics"
        element={
          <ProtectedRoute>
            <Layout>
              <GraphiHome />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/graphics/add"
        element={
          <ProtectedRoute>
            <Layout>
              <AddGraphics />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/graphics/edit/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <EditGraphics />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/marketing"
        element={
          <ProtectedRoute>
            <Layout>
              <MainTeam />
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
