import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import MainTeam from "./MainTeam";
import TeamUserManagement from "./TeamUserManagement";
import MonthWiseReport from "./MonthWiseReport";
import LeadManagement from "./LeadManagement";
import { useTheme } from "../../Context/ThemeContext";
import logo from "../../../public/mlmboo2.ico";

const IcGrid = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IcReport = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);
const IcLeads = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcTeam = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IcSun = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IcMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const ALL_TABS = [
  { id: "dashboard", label: "Dashboard",      memberOnly: false, icon: <IcGrid /> },
  { id: "reports",   label: "Monthly Report", memberOnly: true,  icon: <IcReport /> },
  { id: "leads",     label: "Leads",          memberOnly: true,  icon: <IcLeads /> },
  { id: "team",      label: "My Team",        memberOnly: true,  icon: <IcTeam /> },
];

export default function MteamPortal() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [session, setSession]       = useState(null);
  const [activeTab, setActiveTab]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mteamUser");
      if (!raw) { navigate("/mlogin", { replace: true }); return; }
      const user = JSON.parse(raw);
      setSession(user);
      const allowed = user.tabs ?? ["dashboard"];
      setActiveTab(allowed[0] ?? "dashboard");
    } catch {
      navigate("/mlogin", { replace: true });
    }
  }, [navigate]);

  if (!session) return null;

  const isMember = session.role === "member";
  // mobile to use for data queries — members use own mobile, sub-users use parent member's mobile
  const dataMobile = isMember ? session.mobile : (session.parentMobile ?? session.mobile);

  const allowedTabs = ALL_TABS.filter((t) => {
    // "My Team" is strictly member-only — sub-users can never manage team
    if (t.id === "team") return isMember;
    // members see all other tabs
    if (isMember) return true;
    // sub-users see only tabs explicitly assigned to them
    return (session.tabs ?? ["dashboard"]).includes(t.id);
  });

  const handleLogout = () => {
    localStorage.removeItem("mteamUser");
    navigate("/login");
  };

  const renderContent = () => {
    if (activeTab === "dashboard") return <MainTeam mteamSession={session} />;
    if (activeTab === "reports")
      return <MonthWiseReport mteamId={session.mteamId} mobile={dataMobile} />;
    if (activeTab === "leads")
      return <LeadManagement mteamId={session.mteamId} mobile={dataMobile} name={session.name} />;
    if (activeTab === "team" && isMember)
      return <TeamUserManagement mteamId={session.mteamId} />;
    return (
      <div style={{ padding: 40, color: "var(--p-text-3)", textAlign: "center" }}>
        You don't have access to this section.
      </div>
    );
  };

  const isDark = theme === "dark";

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"var(--p-bg)", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      {sidebarOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:40 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <aside style={{
        width: 240, flexShrink: 0,
        background: "var(--p-card)",
        borderRight: "1px solid var(--p-border)",
        display: "flex", flexDirection: "column",
        position: "fixed", top:0, left:0, bottom:0, zIndex:50,
        transform: sidebarOpen ? "translateX(0)" : undefined,
        transition: "transform 0.3s ease",
      }} className="mteam-sidebar">

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 16px", borderBottom:"1px solid var(--p-border)" }}>
          <img src={logo} alt="logo" style={{ width:34, height:34, borderRadius:8 }} />
          <span style={{ fontWeight:800, fontSize:16, color:"#6366f1", letterSpacing:"-0.3px" }}>MLMLIVE</span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderBottom:"1px solid var(--p-border)" }}>
          <div style={{
            width:38, height:38, borderRadius:"50%",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontWeight:800, fontSize:16, flexShrink:0,
          }}>{session.name?.[0]?.toUpperCase() ?? "M"}</div>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--p-text)" }}>{session.name}</p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"#6366f1", fontWeight:600 }}>
              {session.role === "member" ? "Marketing Member" : "Team Member"}
            </p>
          </div>
        </div>

        <p style={{ margin:"14px 16px 6px", fontSize:10, fontWeight:700, color:"var(--p-text-4)", textTransform:"uppercase", letterSpacing:"0.1em" }}>
          Menu
        </p>

        <nav style={{ flex:1, display:"flex", flexDirection:"column", gap:2, padding:"0 8px", overflowY:"auto" }}>
          {allowedTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:600,
                textAlign:"left", transition:"all 0.15s", width:"100%",
                background: isActive ? "#6366f115" : "transparent",
                color: isActive ? (isDark ? "#a5b4fc" : "#6366f1") : "var(--p-text-3)",
                borderLeft: isActive ? "3px solid #6366f1" : "3px solid transparent",
              }} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}>
                <span style={{ color: isActive ? "#6366f1" : "var(--p-text-4)" }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding:"12px 8px", borderTop:"1px solid var(--p-border)" }}>
          <button style={{
            display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
            borderRadius:10, border:"none", cursor:"pointer", fontSize:14, fontWeight:600,
            color:"#ef4444", background:"transparent", width:"100%", transition:"background 0.15s",
          }} onClick={handleLogout}>
            <IcLogout /> Logout
          </button>
        </div>
      </aside>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", marginLeft:0 }} className="mteam-main">
        <header style={{
          display:"flex", alignItems:"center", gap:14, padding:"14px 20px",
          borderBottom:"1px solid var(--p-border)",
          background:"var(--p-card)", flexShrink:0,
        }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--p-text-3)", padding:4, display:"flex" }}
            className="mteam-hamburger" onClick={() => setSidebarOpen(true)}>
            <IcMenu />
          </button>
          <span style={{ fontWeight:700, fontSize:16, color:"var(--p-text)", flex:1 }}>
            {ALL_TABS.find((t) => t.id === activeTab)?.label ?? "Portal"}
          </span>

          <button onClick={toggle} title="Toggle theme" style={{
            display:"flex", alignItems:"center", gap:6, padding:"7px 12px",
            borderRadius:20, border:"1px solid var(--p-border)",
            background:"var(--p-card2)", color:"var(--p-text-2)",
            cursor:"pointer", fontSize:12, fontWeight:600, transition:"all 0.2s",
          }}>
            {isDark ? <IcSun /> : <IcMoon />}
            {isDark ? "Light" : "Dark"}
          </button>

          <span style={{ fontSize:12, color:"var(--p-text-3)" }}>{session.mobile}</span>
        </header>

        <div style={{ flex:1, overflowY:"auto", background:"var(--p-bg)" }}>
          {renderContent()}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mteam-sidebar  { transform: translateX(0) !important; position: relative !important; flex-shrink: 0; }
          .mteam-main     { margin-left: 0 !important; }
          .mteam-hamburger{ display: none !important; }
        }
      `}</style>
    </div>
  );
}
