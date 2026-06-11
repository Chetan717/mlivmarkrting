import { useState } from "react";
import { useNavigate } from "react-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../Firebase";
import logo from "../../public/mlmboo2.ico";

export function MteamLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "mteam"), where("mobile", "==", mobile))
      );

      if (!snap.empty) {
        const docData = snap.docs[0].data();
        const docId = snap.docs[0].id;

        if (docData.password !== password) {
          setError("Incorrect password");
          return;
        }
        if (!docData.active) {
          setError("Your account is inactive. Contact admin.");
          return;
        }

        const session = {
          role: "member",
          mteamId: docId,
          name: docData.name,
          mobile: docData.mobile,
          assign_coupon_id: docData.assign_coupon_id,
          tabs: ["dashboard", "team"],
        };
        localStorage.setItem("mteamUser", JSON.stringify(session));
        navigate("/mportal");
        return;
      }

      const allSnap = await getDocs(collection(db, "mteam"));
      for (const docSnap of allSnap.docs) {
        const docData = docSnap.data();
        const team = docData.team ?? [];
        const found = team.find(
          (u) => u.mobile === mobile && u.password === password
        );
        if (found) {
          if (!found.active) {
            setError("Your account is inactive. Contact your manager.");
            return;
          }
          const session = {
            role: "subuser",
            mteamId: docSnap.id,
            name: found.name,
            mobile: found.mobile,
            tabs: found.tabs ?? ["dashboard"],
          };
          localStorage.setItem("mteamUser", JSON.stringify(session));
          navigate("/mportal");
          return;
        }
      }

      setError("No account found with this mobile number");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}
    >
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 20,
          padding: "40px 36px",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src={logo} alt="logo" style={{ width: 72, height: 72, marginBottom: 12 }} />
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#a5b4fc",
              letterSpacing: "-0.5px",
            }}
          >
            Marketing Portal
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
            Sign in with your team credentials
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Mobile Number</label>
            <input
              type="tel"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                background: "#fee2e215",
                border: "1px solid #ef444450",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#f87171",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "13px",
              background: loading ? "#4338ca80" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  background: "#0f172a",
  border: "1.5px solid #334155",
  borderRadius: 10,
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
