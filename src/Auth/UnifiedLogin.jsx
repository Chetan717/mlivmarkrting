import { useState } from "react";
import { useNavigate } from "react-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../Firebase";
import logo from "../../public/mlmboo2.ico";

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
  padding: "12px 14px",
  background: "#0f172a",
  border: "1.5px solid #334155",
  borderRadius: 10,
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export function UnifiedLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPw, setShowPw]     = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!password) {
      setError("Password / PIN is required.");
      return;
    }

    setLoading(true);
    try {
      // ── 1. Check mteam member ──────────────────────────────
      const memberSnap = await getDocs(
        query(collection(db, "mteam"), where("mobile", "==", mobile))
      );

      if (!memberSnap.empty) {
        const docData = memberSnap.docs[0].data();
        const docId   = memberSnap.docs[0].id;

        if (docData.password !== password) {
          setError("Incorrect password. Please try again.");
          return;
        }
        if (!docData.active) {
          setError("Your account is inactive. Contact admin.");
          return;
        }

        localStorage.setItem("mteamUser", JSON.stringify({
          role: "member",
          mteamId: docId,
          name: docData.name,
          mobile: docData.mobile,
          assign_coupon_id: docData.assign_coupon_id,
          tabs: ["dashboard", "team"],
        }));
        navigate("/mportal");
        return;
      }

      // ── 2. Check mteam subuser ─────────────────────────────
      const allMteamSnap = await getDocs(collection(db, "mteam"));
      for (const docSnap of allMteamSnap.docs) {
        const team  = docSnap.data().team ?? [];
        const found = team.find((u) => u.mobile === mobile && u.password === password);
        if (found) {
          if (!found.active) {
            setError("Your account is inactive. Contact your manager.");
            return;
          }
          localStorage.setItem("mteamUser", JSON.stringify({
            role: "subuser",
            mteamId: docSnap.id,
            name: found.name,
            mobile: found.mobile,
            parentMobile: docSnap.data().mobile,
            tabs: found.tabs ?? ["dashboard"],
          }));
          navigate("/mportal");
          return;
        }
      }

      // ── 3. Check regular users ─────────────────────────────
      const userSnap = await getDocs(
        query(collection(db, "users"), where("mobileNo", "==", mobile))
      );

      if (!userSnap.empty) {
        const userDoc  = userSnap.docs[0];
        const userData = userDoc.data();

        if (!userData.isverified) {
          setError("Account not verified. Please signup again.");
          return;
        }
        if (userData.password !== password) {
          setError("Incorrect PIN. Please try again.");
          return;
        }

        localStorage.setItem("usermlm", JSON.stringify({
          id: userDoc.id,
          name: userData.name,
          mobileNo: userData.mobileNo,
          isverified: userData.isverified,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() ?? "",
        }));
        navigate("/");
        return;
      }

      setError("No account found with this mobile number.");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{
        background: "rgba(30,41,59,0.95)",
        border: "1px solid #334155",
        borderRadius: 22,
        padding: "44px 40px",
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
      }}>
        <div  className={`flex flex-col justify-center items-center gap-2 `} style={{ textAlign:"center", marginBottom:36 }}>
          <img src={logo} alt="MLM Booster" style={{ width:84, height:84, marginBottom:16, borderRadius:18, boxShadow:"0 8px 24px rgba(99,102,241,0.4)" }} />
          <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:"#a5b4fc", letterSpacing:"-0.5px" }}>
            MLM Booster
          </h1>
          <p style={{ margin:"8px 0 0", fontSize:13, color:"#64748b" }}>
            Members &amp; sub-users — sign in below
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div>
            <label style={labelStyle}>Mobile Number</label>
            <input
              type="tel"
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g,"").slice(0,10))}
              placeholder="10-digit mobile number"
              style={inputStyle}
              autoComplete="tel"
            />
          </div>

          <div>
            <label style={labelStyle}>Password / PIN</label>
            <div style={{ position:"relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password or 4-digit PIN"
                style={{ ...inputStyle, paddingRight:44 }}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:13, padding:4 }}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background:"#ef444410",
              border:"1px solid #ef444450",
              borderRadius:10,
              padding:"11px 14px",
              color:"#f87171",
              fontSize:13,
              display:"flex",
              alignItems:"flex-start",
              gap:8,
            }}>
              <span style={{ flexShrink:0 }}>⚠</span> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop:2,
            padding:"14px",
            background: loading ? "#4338ca60" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border:"none",
            borderRadius:12,
            color:"#fff",
            fontWeight:700,
            fontSize:15,
            cursor: loading ? "not-allowed" : "pointer",
            transition:"all 0.2s",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            gap:8,
            letterSpacing:"0.01em",
          }}>
            {loading ? (
              <>
                <span style={{ width:16, height:16, border:"2px solid #ffffff40", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite", display:"inline-block", flexShrink:0 }} />
                Signing in…
              </>
            ) : "Sign In →"}
          </button>
        </form>

        <p style={{ textAlign:"center", marginTop:24, fontSize:11, color:"#475569", lineHeight:1.6 }}>
          Marketing members, sub-users &amp; app users all use this login.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
