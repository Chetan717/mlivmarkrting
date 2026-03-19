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
              <Home />
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

      {/* ── Auth routes (no Layout) ── */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgetpin" element={<Forgetpin />} />
    </Routes>
  );
}

export default App;
