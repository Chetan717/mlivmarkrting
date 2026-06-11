import { useState, useEffect } from "react";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../../../Firebase";

// ── Date helper ──────────────────────────────────────────────
const MONTHS_MAP = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function parseDMY(str) {
  if (!str || typeof str !== "string") return null;
  str = str.trim();
  const mname = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (mname) {
    const d = Number(mname[1]); const m = MONTHS_MAP[mname[2].toLowerCase().slice(0,3)]; const y = Number(mname[3]);
    if (d && m !== undefined && y) return new Date(y, m, d);
  }
  const slash = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) return new Date(Number(slash[3]), Number(slash[2])-1, Number(slash[1]));
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2])-1, Number(iso[3]));
  return null;
}

// ── SVG Icons ──────────────────────────────────────────────
const IcMoney = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);
const IcTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
);
const IcCheckCir = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IcClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const IcPhone = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.14-1.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.6z"/></svg>
);
const IcAlertLg = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IcSearchLg = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const IcTicket = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
);
const IcChevDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const IcRefresh = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.9"/></svg>
);
const IcEye = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);

const ITEMS_PER_PAGE = 10;

const planColor = (plan) => {
  const map = {
    Basic: "#f59e0b",
    Pro: "#6366f1",
    Premium: "#10b981",
    Enterprise: "#ec4899",
  };
  return map[plan] ?? "#94a3b8";
};

const statusBadge = (sub) => {
  if (sub.Active && !sub.Expire)
    return { label: "Active", color: "#10b981", bg: "#d1fae522" };
  if (sub.Expire)
    return { label: "Expired", color: "#ef4444", bg: "#fee2e222" };
  return { label: "Inactive", color: "#f59e0b", bg: "#fef3c722" };
};

const fmtINR = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

// ── main component ─────────────────────────────────────────────────────────
export default function MarketingDashboard({ mteamSession } = {}) {
  const [mlmUser, setMlmUser] = useState(null);
  const [mteamDoc, setMteamDoc] = useState(null);
  const [couponDoc, setCouponDoc] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // ── 1. read logged-in user from localStorage ───────────────────────────
  useEffect(() => {
    try {
      if (mteamSession) {
        setMlmUser({ mobileNo: mteamSession.mobile, name: mteamSession.name, _mteamId: mteamSession.mteamId });
        return;
      }
      const raw = localStorage.getItem("usermlm");
      if (!raw) throw new Error("No user session found. Please log in.");
      setMlmUser(JSON.parse(raw));
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }, [mteamSession]);

  // ── 2. fetch mteam → couponcode → subscriptions ───────────────────────
  useEffect(() => {
    if (!mlmUser) return;

    const run = async () => {
      setLoading(true);
      try {
        // step A: find mteam record — use id directly (sub-users) or query by mobile (members)
        let mt;
        if (mlmUser._mteamId) {
          const snap = await getDoc(doc(db, "mteam", mlmUser._mteamId));
          if (!snap.exists()) throw new Error("Marketing team record not found.");
          mt = { documentId: snap.id, ...snap.data() };
        } else {
          const mteamSnap = await getDocs(
            query(collection(db, "mteam"), where("mobile", "==", mlmUser.mobileNo))
          );
          if (mteamSnap.empty)
            throw new Error("No marketing team record found for this account.");
          mt = { documentId: mteamSnap.docs[0].id, ...mteamSnap.docs[0].data() };
        }
        setMteamDoc(mt);

        // step B: fetch couponcode doc
        let coupon = null;
        try {
          const snap = await getDoc(doc(db, "couponcode", mt.assign_coupon_id));
          if (snap.exists()) coupon = { documentId: snap.id, ...snap.data() };
        } catch (_) {}

        if (!coupon) {
          const cSnap = await getDocs(
            query(collection(db, "couponcode"), where("assigned_user.id", "==", mt.documentId))
          );
          if (!cSnap.empty)
            coupon = { documentId: cSnap.docs[0].id, ...cSnap.docs[0].data() };
        }

        if (!coupon) throw new Error("No coupon assigned to this marketing member.");
        setCouponDoc(coupon);

        const couponCode = coupon.code;

        // step C: only SUCCESSFUL subscriptions with this coupon
        const subSnap = await getDocs(
          query(
            collection(db, "subscription"),
            where("couponApplied", "==", couponCode),
            where("payment", "==", "Success")
          )
        );

        // step D: enrich each subscription with user profile
        const subs = await Promise.all(
          subSnap.docs.map(async (d) => {
            const sub = { documentId: d.id, ...d.data() };
            try {
              const uSnap = await getDocs(
                query(collection(db, "users"), where("mobileNo", "==", sub.mobileNo))
              );
              if (!uSnap.empty)
                sub._user = { documentId: uSnap.docs[0].id, ...uSnap.docs[0].data() };
            } catch (_) {}
            return sub;
          })
        );

        setSubscribers(subs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [mlmUser]);

  // reset page on filter/search/sort change
  useEffect(() => { setPage(1); }, [search, filterStatus, sortBy]);

  // ── derived stats ──────────────────────────────────────────────────────
  const commPct         = couponDoc?.marketing_member_percentage ?? 0;
  const discountPct     = couponDoc?.user_discount ?? 0;
  const totalRevenue    = subscribers.reduce((a, s) => a + (s.PaymentAmount ?? 0), 0);
  const totalCommission = Math.round(totalRevenue * (commPct / 100));
  const activeSubs      = subscribers.filter((s) => s.Active && !s.Expire).length;
  const expiredSubs     = subscribers.filter((s) => s.Expire).length;
  const renewalSubs     = subscribers.filter((s) => {
    if (!s.Active || s.Expire) return false;
    const exp = parseDMY(s.expirydate);
    if (!exp) return false;
    const now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.ceil((exp - now) / (1000*60*60*24));
    return diff >= 0 && diff <= 30;
  }).length;

  // ── filtered / sorted list ─────────────────────────────────────────────
  const filtered = subscribers
    .filter((s) => {
      const name   = (s.UserName ?? s._user?.name ?? "").toLowerCase();
      const mobile = (s.mobileNo ?? "").toLowerCase();
      const q      = search.toLowerCase();
      const matchSearch = !q || name.includes(q) || mobile.includes(q);
      const badge  = statusBadge(s).label.toLowerCase();
      const matchStatus = filterStatus === "all" || badge === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "date")   return new Date(b.PurchaseAt) - new Date(a.PurchaseAt);
      if (sortBy === "amount") return (b.PaymentAmount ?? 0) - (a.PaymentAmount ?? 0);
      if (sortBy === "name")   return (a.UserName ?? "").localeCompare(b.UserName ?? "");
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const visible    = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const goTo = (p) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── render ─────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;

  return (
    <div style={s.root}>
      <div style={s.bgGrid} />

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerTag}>MARKETING TEAM PORTAL</span>
          <h1 style={s.headerTitle}>Commission Dashboard</h1>
          <p style={s.headerSub}>
            {mteamDoc?.name ?? mlmUser?.name}&nbsp;·&nbsp;
            {mteamDoc?.mobile ?? mlmUser?.mobileNo}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ ...s.pill, borderColor: mteamDoc?.active ? "#10b98155" : "#ef444455" }}>
            <span style={{ ...s.dot, background: mteamDoc?.active ? "#10b981" : "#ef4444" }} />
            {mteamDoc?.active ? "Active Agent" : "Inactive"}
          </div>
          {couponDoc && (
            <div style={{ ...s.pill, borderColor: couponDoc.active ? "#6366f155" : "#ef444455" }}>
              <span style={{ ...s.dot, background: couponDoc.active ? "#6366f1" : "#ef4444" }} />
              Coupon {couponDoc.active ? "Live" : "Disabled"}
            </div>
          )}
        </div>
      </header>

      {/* ── STAT CARDS ───────────────────────────────────────────────── */}
      <section style={s.statsGrid}>
        <StatCard icon={<IcMoney />} accent="#f59e0b" big
          label="Your Commission"
          value={fmtINR(totalCommission)}
          sub={`${commPct}% of ${fmtINR(totalRevenue)} total revenue`}
        />
        <StatCard icon={<IcTag />} accent="#6366f1"
          label="Total Sales"
          value={subscribers.length}
          sub="successful via coupon"
        />
        <StatCard icon={<IcCheckCir />} accent="#10b981"
          label="Active Now"
          value={activeSubs}
          sub="live subscriptions"
        />
        <StatCard icon={<IcRefresh />} accent="#f59e0b"
          label="On Renewal"
          value={renewalSubs}
          sub="expiring within 30 days"
        />
        <StatCard icon={<IcClock />} accent="#ef4444"
          label="Expired"
          value={expiredSubs}
          sub="need renewal"
        />
      </section>

      {/* ── COUPON CARD ──────────────────────────────────────────────── */}
      {couponDoc && (
        <div style={s.couponCard}>
          <div style={s.couponGlow} />
          <div style={s.couponLeft}>
            <span style={s.couponTag}><IcTicket /> YOUR COUPON CODE</span>
            <span style={s.couponCode}>{couponDoc.code}</span>
            <span style={s.couponId}>ID: {couponDoc.documentId}</span>
          </div>
          <div style={s.couponDivider} />
          <div style={s.couponRight}>
            <CouponStat label="Your Commission" value={`${commPct}%`}    accent="#f59e0b" />
            <CouponStat label="User Discount"   value={`${discountPct}%`} accent="#10b981" />
            <CouponStat
              label="Status"
              value={couponDoc.active ? "Active" : "Inactive"}
              accent={couponDoc.active ? "#10b981" : "#ef4444"}
            />
            <CouponStat
              label="Created"
              value={
                couponDoc.created_at?.toDate
                  ? couponDoc.created_at.toDate().toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })
                  : "—"
              }
              accent="#94a3b8"
            />
          </div>
        </div>
      )}

      {/* ── CONTROLS ─────────────────────────────────────────────────── */}
      <div style={s.controls}>
        <div style={s.searchWrap}>
          <span style={{ flexShrink: 0, color: "var(--p-text-3)", display:"flex" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            style={s.searchInput}
            placeholder="Search by name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button style={s.clearBtn} onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div style={s.filterRow}>
          {["all", "active", "expired", "inactive"].map((f) => (
            <button
              key={f}
              style={{ ...s.filterBtn, ...(filterStatus === f ? s.filterBtnOn : {}) }}
              onClick={() => setFilterStatus(f)}
            >
              {f === "all" ? `All (${filtered.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select style={s.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">↓ Latest first</option>
          <option value="amount">↓ Highest amount</option>
          <option value="name">A–Z Name</option>
        </select>
      </div>

      {/* ── SUBSCRIBER TABLE ─────────────────────────────────────────── */}
      <section style={{ position:"relative", zIndex:1 }}>
        {visible.length === 0 ? <EmptyState /> : (
          <div style={{ overflowX:"auto", borderRadius:14, border:"1px solid var(--p-border)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
              <thead>
                <tr style={{ background:"var(--p-card2)" }}>
                  {["#","Name / Mobile","Plan","Status","Amount","Commission","Purchase Date","Action"].map((h,i) => (
                    <th key={h} style={{ padding:"11px 14px", fontSize:11, fontWeight:700, color:"var(--p-text-4)", textTransform:"uppercase", letterSpacing:"0.06em", textAlign: i >= 4 && i <= 6 ? "right" : i === 7 ? "center" : "left", borderBottom:"2px solid var(--p-border)", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((sub, i) => {
                  const badge      = statusBadge(sub);
                  const commission = Math.round((sub.PaymentAmount ?? 0) * (commPct / 100));
                  const user       = sub._user;
                  const name       = sub.UserName ?? user?.name ?? "—";
                  const date       = sub.PurchaseAt
                    ? new Date(sub.PurchaseAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
                    : "—";
                  return (
                    <tr key={sub.documentId} style={{ background: i%2===1 ? "var(--p-bg)" : "transparent", transition:"background 0.15s" }}>
                      <td style={{ padding:"11px 14px", fontSize:12, color:"var(--p-text-4)", width:36 }}>{(safePage-1)*ITEMS_PER_PAGE+i+1}</td>
                      <td style={{ padding:"11px 14px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:14, flexShrink:0 }}>
                            {(name||"?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p style={{ margin:0, fontWeight:700, fontSize:13, color:"var(--p-text)" }}>{name}</p>
                            <p style={{ margin:0, fontSize:11, color:"var(--p-text-3)", display:"flex", alignItems:"center", gap:3 }}><IcPhone /> {sub.mobileNo}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <span style={{ padding:"2px 10px", borderRadius:6, background:planColor(sub.plan)+"22", color:planColor(sub.plan), fontSize:11, fontWeight:700 }}>{sub.plan ?? "—"}</span>
                      </td>
                      <td style={{ padding:"11px 14px" }}>
                        <span style={{ padding:"2px 9px", borderRadius:6, background:badge.bg, color:badge.color, fontSize:11, fontWeight:700 }}>{badge.label}</span>
                      </td>
                      <td style={{ padding:"11px 14px", textAlign:"right", fontWeight:700, fontSize:13, color:"var(--p-text)" }}>{fmtINR(sub.PaymentAmount)}</td>
                      <td style={{ padding:"11px 14px", textAlign:"right", fontWeight:700, fontSize:13, color:"#10b981" }}>+{fmtINR(commission)}</td>
                      <td style={{ padding:"11px 14px", textAlign:"right", fontSize:12, color:"var(--p-text-3)" }}>{date}</td>
                      <td style={{ padding:"11px 14px", textAlign:"center" }}>
                        <button
                          onClick={() => { setSelectedSub(sub); setModalOpen(true); }}
                          style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:"1.5px solid #6366f160", background:"#6366f115", color:"#a5b4fc", fontSize:12, fontWeight:700, cursor:"pointer" }}
                        >
                          <IcEye /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── PAGINATION ───────────────────────────────────────────────── */}
      {filtered.length > ITEMS_PER_PAGE && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          perPage={ITEMS_PER_PAGE}
          goTo={goTo}
        />
      )}

      <p style={s.footer}>
        {filtered.length} successful subscriber{filtered.length !== 1 ? "s" : ""} total
      </p>

      {/* ── SUBSCRIBER DETAIL MODAL ──────────────────────────────────── */}
      {modalOpen && selectedSub && (() => {
        const sub  = selectedSub;
        const user = sub._user;
        const badge = statusBadge(sub);
        const commission = Math.round((sub.PaymentAmount ?? 0) * (commPct / 100));
        const closeModal = () => { setModalOpen(false); setSelectedSub(null); };
        return (
          <div style={{ position:"fixed", inset:0, zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}
               onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)" }} onClick={closeModal} />
            <div style={{ position:"relative", zIndex:1, background:"var(--p-card)", borderRadius:20, boxShadow:"0 24px 80px #0008", width:"100%", maxWidth:640, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {/* Header */}
              <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--p-border)", display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:46, height:46, borderRadius:14, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:20, flexShrink:0 }}>
                  {(sub.UserName ?? user?.name ?? "?")[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:800, fontSize:16, color:"var(--p-text)" }}>{sub.UserName ?? user?.name ?? "—"}</p>
                  <p style={{ margin:0, fontSize:12, color:"var(--p-text-3)" }}>{sub.mobileNo}</p>
                </div>
                <button onClick={closeModal} style={{ width:32, height:32, borderRadius:8, border:"none", background:"var(--p-card2)", color:"var(--p-text-3)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>
              {/* Body */}
              <div style={{ overflowY:"auto", padding:"20px 24px", flex:1 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"10px 14px" }}>
                  {[
                    { label:"Plan",         value: sub.plan ?? "—" },
                    { label:"Plan Type",    value: sub.planType ?? "—" },
                    { label:"Duration",     value: sub.duration ? `${sub.duration} days` : "—" },
                    { label:"Start Date",   value: sub.startdate ?? "—" },
                    { label:"Expiry Date",  value: sub.expirydate ?? "—" },
                    { label:"Amount Paid",  value: fmtINR(sub.PaymentAmount), highlight: true },
                    { label:"Commission",   value: `+${fmtINR(commission)} (${commPct}%)`, green: true },
                    { label:"Discount",     value: `${sub.discountPercent ?? 0}%` },
                    { label:"Status",       value: badge.label, badgeObj: badge },
                    { label:"Coupon Used",  value: sub.couponApplied ?? "None" },
                    { label:"Company",      value: sub.company ?? "—" },
                    { label:"Purchased On", value: sub.PurchaseAt ? new Date(sub.PurchaseAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—" },
                  ].map(({ label, value, highlight, green, badgeObj }) => (
                    <div key={label} style={{ background:"var(--p-bg)", borderRadius:10, padding:"10px 14px" }}>
                      <p style={{ margin:0, fontSize:10, fontWeight:700, color:"var(--p-text-4)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</p>
                      {badgeObj ? (
                        <span style={{ display:"inline-block", marginTop:4, padding:"2px 8px", borderRadius:6, background:badgeObj.bg, color:badgeObj.color, fontSize:12, fontWeight:700 }}>{value}</span>
                      ) : (
                        <p style={{ margin:"4px 0 0", fontSize:13, fontWeight:600, color: highlight ? "#f59e0b" : green ? "#10b981" : "var(--p-text)" }}>{value}</p>
                      )}
                    </div>
                  ))}
                </div>
                {user && (
                  <div style={{ marginTop:18 }}>
                    <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:700, color:"#6366f1", textTransform:"uppercase", letterSpacing:"0.12em" }}>User Profile</p>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"10px 14px" }}>
                      {[
                        { label:"Registered Name", value: user.name },
                        { label:"Verified",        value: user.isverified ? "Yes" : "No" },
                        { label:"Joined",          value: user.createdAt ? new Date(user.createdAt?.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—" },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background:"var(--p-bg)", borderRadius:10, padding:"10px 14px" }}>
                          <p style={{ margin:0, fontSize:10, fontWeight:700, color:"var(--p-text-4)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</p>
                          <p style={{ margin:"4px 0 0", fontSize:13, fontWeight:600, color:"var(--p-text)" }}>{value ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div style={{ padding:"14px 24px", borderTop:"1px solid var(--p-border)", display:"flex", justifyContent:"flex-end" }}>
                <button onClick={closeModal} style={{ padding:"9px 22px", borderRadius:10, border:"1.5px solid var(--p-border)", background:"transparent", color:"var(--p-text-3)", fontSize:13, fontWeight:600, cursor:"pointer" }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, perPage, goTo }) {
  const start = (page - 1) * perPage + 1;
  const end   = Math.min(page * perPage, total);

  // build page number buttons — show up to 5 around current
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    }
  }
  // insert ellipsis markers
  const withEllipsis = [];
  let prev = null;
  for (const p of pages) {
    if (prev !== null && p - prev > 1) withEllipsis.push("…");
    withEllipsis.push(p);
    prev = p;
  }

  return (
    <div style={s.paginationWrap}>
      <span style={s.pageInfo}>
        Showing <strong style={{ color: "#a5b4fc" }}>{start}–{end}</strong> of{" "}
        <strong style={{ color: "#a5b4fc" }}>{total}</strong>
      </span>

      <div style={s.pageButtons}>
        {/* prev */}
        <button
          style={{ ...s.pageBtn, ...(page === 1 ? s.pageBtnDisabled : {}) }}
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          ‹
        </button>

        {withEllipsis.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} style={s.pageEllipsis}>…</span>
          ) : (
            <button
              key={p}
              style={{ ...s.pageBtn, ...(p === page ? s.pageBtnActive : {}) }}
              onClick={() => goTo(p)}
            >
              {p}
            </button>
          )
        )}

        {/* next */}
        <button
          style={{ ...s.pageBtn, ...(page === totalPages ? s.pageBtnDisabled : {}) }}
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ── CouponStat ─────────────────────────────────────────────────────────────
function CouponStat({ label, value, accent }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: accent, fontFamily: "'Space Mono', monospace" }}>
        {value}
      </p>
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, big }) {
  return (
    <div style={{ ...s.statCard, borderTop: `3px solid ${accent}` }}>
      <div style={{ ...s.statIcon, background: accent + "18", color: accent }}>{icon}</div>
      <div>
        <p style={s.statLabel}>{label}</p>
        <p style={{ ...s.statValue, color: accent, fontSize: big ? "1.9rem" : "1.45rem" }}>{value}</p>
        <p style={s.statSub}>{sub}</p>
      </div>
    </div>
  );
}

// ── SubscriberCard ─────────────────────────────────────────────────────────
function SubscriberCard({ sub, index, commPct }) {
  const [open, setOpen] = useState(false);
  const badge      = statusBadge(sub);
  const commission = Math.round((sub.PaymentAmount ?? 0) * (commPct / 100));
  const user       = sub._user;

  return (
    <div style={{ ...s.subCard, animationDelay: `${index * 35}ms` }} className="sub-card">

      {/* ── collapsed row ─────────────────────────────────────── */}
      <div style={s.subTop} onClick={() => setOpen((v) => !v)}>
        <div style={s.avatar}>
          {(sub.UserName ?? user?.name ?? "?")[0].toUpperCase()}
        </div>

        <div style={s.subInfo}>
          <span style={s.subName}>{sub.UserName ?? user?.name ?? "—"}</span>
          <span style={{ ...s.subMobile, display:"flex", alignItems:"center", gap:4 }}><IcPhone /> {sub.mobileNo}</span>
          {sub.company && <span style={s.subCompanyInline}>{sub.company}</span>}
        </div>

        <div style={s.subMeta}>
          <span style={{ ...s.planPill, background: planColor(sub.plan) + "22", color: planColor(sub.plan) }}>
            {sub.plan ?? "—"}
          </span>
          <span style={s.subDate}>
            {sub.startdate} → {sub.expirydate}
          </span>
        </div>

        <div style={s.subRight}>
          <span style={{ ...s.statusBadge, background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
          <span style={s.subAmount}>{fmtINR(sub.PaymentAmount)}</span>
          <span style={s.commTag}>+{fmtINR(commission)} ({commPct}%)</span>
        </div>

        <span style={{ ...s.chevron, transform: open ? "rotate(180deg)" : "rotate(0)" }}><IcChevDown /></span>
      </div>

      {/* ── expanded details ──────────────────────────────────── */}
      {open && (
        <div style={s.subDetails}>
          <SectionTitle>Subscription Details</SectionTitle>
          <div style={s.detailGrid}>
            <DItem label="Plan Type"      value={sub.planType} />
            <DItem label="Duration"       value={`${sub.duration} days`} />
            <DItem label="Start Date"     value={sub.startdate} />
            <DItem label="Expiry Date"    value={sub.expirydate} />
            <DItem label="Amount Paid"    value={fmtINR(sub.PaymentAmount)} highlight />
            <DItem label="Discount"       value={`${sub.discountPercent ?? 0}%`} />
            {/* <DItem label="Downloads"      value={sub.download ?? 0} /> */}
            <DItem label="Coupon Applied" value={sub.couponApplied ?? "None"} highlight={!!sub.couponApplied} />
            <DItem label="Company"        value={sub.company} />
            <DItem label="Purchased On"   value={
              sub.PurchaseAt
                ? new Date(sub.PurchaseAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })
                : "—"
            } />
          </div>

          {user && (
            <>
              <SectionTitle style={{ marginTop: 16 }}>User Profile</SectionTitle>
              <div style={s.detailGrid}>
                <DItem label="Registered Name" value={user.name} />
                {/* <DItem label="Refer Code"      value={user.referCode} /> */}
                {/* <DItem label="Refer Credit"    value={user.referCredit ?? 0} /> */}
                {/* <DItem label="Referred By"     value={user.referredBy ?? "Direct"} /> */}
                <DItem label="Verified"        value={user.isverified ? "Yes" : "No"} highlight={user.isverified} />
                <DItem
                  label="Joined"
                  value={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      : "—"
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── tiny helpers ───────────────────────────────────────────────────────────
function SectionTitle({ children, style }) {
  return <p style={{ ...s.sectionTitle, ...style }}>{children}</p>;
}

function DItem({ label, value, highlight }) {
  return (
    <div style={s.dItem}>
      <span style={s.dLabel}>{label}</span>
      <span style={{ ...s.dValue, color: highlight ? "#10b981" : "#e2e8f0" }}>{value ?? "—"}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={s.empty}>
      <span style={{ color: "var(--p-text-4)" }}><IcSearchLg /></span>
      <p style={{ margin: "10px 0 0", color: "var(--p-text-3)" }}>No subscribers match your filter.</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={s.centerScreen}>
      <div style={s.spinner} />
      <p style={{ color: "var(--p-text-3)", marginTop: 16, fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
        Loading dashboard…
      </p>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={s.centerScreen}>
      <div style={s.errorBox}>
        <span style={{ color: "#ef4444" }}><IcAlertLg /></span>
        <p style={{ color: "#ef4444", marginTop: 10, fontFamily: "'DM Sans',sans-serif" }}>{message}</p>
      </div>
    </div>
  );
}

// ── styles ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    background: "var(--p-bg)",
    color: "var(--p-text)",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    padding: "24px 20px 72px",
    position: "relative",
    maxWidth: "100%",
    margin: "0 auto",
  },
  bgGrid: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage:
      "radial-gradient(ellipse 80% 50% at 50% -10%, #6366f112, transparent)," +
      "linear-gradient(rgba(99,102,241,0.03) 1px,transparent 1px)," +
      "linear-gradient(90deg,rgba(99,102,241,0.03) 1px,transparent 1px)",
    backgroundSize: "100% 100%, 44px 44px, 44px 44px",
  },

  // header
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    gap: 16, marginBottom: 28, position: "relative", zIndex: 1, flexWrap: "wrap",
  },
  headerLeft: { display: "flex", flexDirection: "column", gap: 3 },
  headerTag: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.22em",
    color: "#6366f1", fontFamily: "'Space Mono',monospace",
  },
  headerTitle: {
    margin: 0, fontSize: "clamp(1.5rem,4vw,2.2rem)", fontWeight: 800,
    color: "var(--p-text)", lineHeight: 1.1,
  },
  headerSub: { margin: 0, color: "var(--p-text-3)", fontSize: 13 },
  pill: {
    display: "flex", alignItems: "center", gap: 6, background: "var(--p-card)",
    border: "1px solid", borderRadius: 999, padding: "5px 13px",
    fontSize: 12, fontWeight: 600, color: "var(--p-text-2)", flexShrink: 0,
  },
  dot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  // stats
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
    gap: 14, marginBottom: 18, position: "relative", zIndex: 1,
  },
  statCard: {
    background: "var(--p-card2)", border: "1px solid var(--p-border)",
    borderRadius: 14, padding: "18px 20px", display: "flex", gap: 14, alignItems: "center",
  },
  statIcon: { borderRadius: 10, padding: "8px 9px", flexShrink: 0, display:"flex", alignItems:"center", justifyContent:"center" },
  statLabel: { margin: 0, fontSize: 10, fontWeight: 700, color: "var(--p-text-3)", letterSpacing: "0.1em", textTransform: "uppercase" },
  statValue: { margin: "3px 0 2px", fontWeight: 800, lineHeight: 1 },
  statSub: { margin: 0, fontSize: 11, color: "var(--p-text-4)" },

  // coupon
  couponCard: {
    background: "var(--p-card2)", border: "1px solid var(--p-border)", borderRadius: 18,
    padding: "22px 28px", display: "flex", gap: 28, alignItems: "center",
    flexWrap: "wrap", marginBottom: 22, position: "relative", zIndex: 1, overflow: "hidden",
  },
  couponGlow: {
    position: "absolute", left: -40, top: -40, width: 200, height: 200,
    background: "radial-gradient(circle,#6366f130,transparent 70%)", pointerEvents: "none",
  },
  couponLeft: { display: "flex", flexDirection: "column", gap: 4, flex: "0 0 auto" },
  couponTag: { fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#6366f1", fontFamily: "'Space Mono',monospace", display:"flex", alignItems:"center", gap:5 },
  couponCode: { fontFamily: "'Space Mono',monospace", fontSize: 32, fontWeight: 800, color: "#c7d2fe", letterSpacing: "0.05em", lineHeight: 1.1 },
  couponId: { fontSize: 11, color: "var(--p-text-4)", fontFamily: "'Space Mono',monospace" },
  couponDivider: { width: 1, height: 60, background: "var(--p-border)", flexShrink: 0, alignSelf: "center" },
  couponRight: { display: "flex", gap: 28, flexWrap: "wrap", flex: 1, justifyContent: "space-around" },

  // controls
  controls: {
    display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18,
    position: "relative", zIndex: 1, alignItems: "center",
  },
  searchWrap: {
    display: "flex", alignItems: "center", gap: 8, background: "var(--p-card)",
    border: "1px solid var(--p-border)", borderRadius: 10, padding: "8px 14px", flex: "1 1 180px",
  },
  searchInput: { background: "transparent", border: "none", outline: "none", color: "var(--p-text)", fontSize: 13, width: "100%", fontFamily:"inherit" },
  clearBtn: { background: "none", border: "none", color: "var(--p-text-3)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 },
  filterRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  filterBtn: {
    background: "var(--p-card)", border: "1px solid var(--p-border)", borderRadius: 8,
    color: "var(--p-text-3)", padding: "6px 13px", fontSize: 12, cursor: "pointer",
    transition: "all 0.15s", fontWeight: 500,
  },
  filterBtnOn: { background: "#1a1f3a", border: "1px solid #6366f1", color: "#a5b4fc" },
  sortSelect: {
    background: "var(--p-card)", border: "1px solid var(--p-border)", borderRadius: 10,
    color: "var(--p-text-2)", padding: "7px 12px", fontSize: 12, cursor: "pointer", outline: "none",
  },

  // list
  listSection: { display: "flex", flexDirection: "column", gap: 10, position: "relative", zIndex: 1 },
  subCard: {
    background: "var(--p-card2)", border: "1px solid var(--p-border)", borderRadius: 14,
    overflow: "hidden", animation: "fadeUp 0.3s ease both", transition: "border-color 0.2s",
  },
  subTop: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 18px", cursor: "pointer", flexWrap: "wrap",
  },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 17, color: "#fff", flexShrink: 0,
  },
  subInfo: { display: "flex", flexDirection: "column", gap: 2, flex: "1 1 130px" },
  subName: { fontWeight: 700, fontSize: 14, color: "var(--p-text)" },
  subMobile: { fontSize: 12, color: "var(--p-text-3)" },
  subCompanyInline: { fontSize: 11, color: "var(--p-text-4)" },
  subMeta: { display: "flex", flexDirection: "column", gap: 4, flex: "0 0 auto" },
  planPill: { borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, textAlign: "center" },
  subDate: { fontSize: 10, color: "var(--p-text-4)", textAlign: "center", fontFamily: "'Space Mono',monospace" },
  subRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginLeft: "auto" },
  statusBadge: { borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700 },
  subAmount: { fontWeight: 800, fontSize: 15, color: "var(--p-text)" },
  commTag: { fontSize: 11, color: "#10b981", fontWeight: 700 },
  chevron: { color: "var(--p-text-4)", transition: "transform 0.2s", flexShrink: 0, display:"flex" },

  // expanded
  subDetails: { borderTop: "1px solid var(--p-border)", padding: "16px 18px", background: "var(--p-bg2)" },
  sectionTitle: {
    margin: "0 0 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
    color: "#6366f1", fontFamily: "'Space Mono',monospace", textTransform: "uppercase",
  },
  detailGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))",
    gap: "10px 18px", marginBottom: 4,
  },
  dItem: { display: "flex", flexDirection: "column", gap: 2 },
  dLabel: { fontSize: 10, fontWeight: 700, color: "var(--p-text-4)", letterSpacing: "0.08em", textTransform: "uppercase" },
  dValue: { fontSize: 13, fontWeight: 500, color: "var(--p-text)" },

  // pagination
  paginationWrap: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12, marginTop: 24,
    position: "relative", zIndex: 1,
  },
  pageInfo: { fontSize: 13, color: "var(--p-text-3)" },
  pageButtons: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  pageBtn: {
    minWidth: 36, height: 36, borderRadius: 9,
    background: "var(--p-card)", border: "1px solid var(--p-border)",
    color: "var(--p-text-3)", fontSize: 14, fontWeight: 600,
    cursor: "pointer", transition: "all 0.15s",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 10px",
  },
  pageBtnActive: {
    background: "#1a1f3a", border: "1px solid #6366f1",
    color: "#a5b4fc",
  },
  pageBtnDisabled: {
    opacity: 0.3, cursor: "not-allowed",
  },
  pageEllipsis: { color: "var(--p-text-4)", fontSize: 14, padding: "0 4px", userSelect: "none" },

  footer: { textAlign: "center", color: "var(--p-text-4)", fontSize: 12, marginTop: 20, position: "relative", zIndex: 1 },
  empty: { textAlign: "center", padding: "52px 20px", display: "flex", flexDirection: "column", alignItems: "center" },
  centerScreen: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "var(--p-bg)",
  },
  spinner: {
    width: 38, height: 38, border: "3px solid var(--p-border)",
    borderTop: "3px solid #6366f1", borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
  },
  errorBox: {
    background: "var(--p-card)", border: "1px solid #7f1d1d",
    borderRadius: 14, padding: "32px 40px", textAlign: "center",
  },
};

// ── inject global keyframes once ───────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("mkt-kf")) {
  const el = document.createElement("style");
  el.id = "mkt-kf";
  el.textContent = `
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .sub-card:hover   { border-color: var(--p-border) !important; }
    * { box-sizing: border-box; }
    input::placeholder { color: var(--p-text-4); }
    select option { background: var(--p-card2); color: var(--p-text); }
  `;
  document.head.appendChild(el);
}