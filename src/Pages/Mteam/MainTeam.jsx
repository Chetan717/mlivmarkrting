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
export default function MarketingDashboard() {
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

  // ── 1. read logged-in user from localStorage ───────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("usermlm");
      if (!raw) throw new Error("No user session found. Please log in.");
      setMlmUser(JSON.parse(raw));
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  // ── 2. fetch mteam → couponcode → subscriptions ───────────────────────
  useEffect(() => {
    if (!mlmUser) return;

    const run = async () => {
      setLoading(true);
      try {
        // step A: find mteam record by mobile
        const mteamSnap = await getDocs(
          query(collection(db, "mteam"), where("mobile", "==", mlmUser.mobileNo))
        );
        if (mteamSnap.empty)
          throw new Error("No marketing team record found for this account.");

        const mt = { documentId: mteamSnap.docs[0].id, ...mteamSnap.docs[0].data() };
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
        <StatCard icon="💰" accent="#f59e0b" big
          label="Your Commission"
          value={fmtINR(totalCommission)}
          sub={`${commPct}% of ${fmtINR(totalRevenue)} total revenue`}
        />
        <StatCard icon="🏷️" accent="#6366f1"
          label="Total Sales"
          value={subscribers.length}
          sub="successful via coupon"
        />
        <StatCard icon="✅" accent="#10b981"
          label="Active Now"
          value={activeSubs}
          sub="live subscriptions"
        />
        <StatCard icon="⏰" accent="#ef4444"
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
            <span style={s.couponTag}>🎟️ YOUR COUPON CODE</span>
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#64748b" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
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

      {/* ── SUBSCRIBER LIST ──────────────────────────────────────────── */}
      <section style={s.listSection}>
        {visible.length === 0
          ? <EmptyState />
          : visible.map((sub, i) => (
              <SubscriberCard
                key={sub.documentId}
                sub={sub}
                index={i}
                commPct={commPct}
              />
            ))
        }
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
          <span style={s.subMobile}>📱 {sub.mobileNo}</span>
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

        <span style={{ ...s.chevron, transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
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
                <DItem label="Verified"        value={user.isverified ? "✅ Yes" : "❌ No"} />
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
      <span style={{ fontSize: 36 }}>🔍</span>
      <p style={{ margin: "8px 0 0", color: "#475569" }}>No subscribers match your filter.</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={s.centerScreen}>
      <div style={s.spinner} />
      <p style={{ color: "#64748b", marginTop: 16, fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
        Loading dashboard…
      </p>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={s.centerScreen}>
      <div style={s.errorBox}>
        <span style={{ fontSize: 36 }}>⚠️</span>
        <p style={{ color: "#ef4444", marginTop: 10, fontFamily: "'DM Sans',sans-serif" }}>{message}</p>
      </div>
    </div>
  );
}

// ── styles ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    minHeight: "100vh",
    background: "#000000",
    color: "#e2e8f0",
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
      "linear-gradient(rgba(99,102,241,0.035) 1px,transparent 1px)," +
      "linear-gradient(90deg,rgba(99,102,241,0.035) 1px,transparent 1px)",
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
    background: "linear-gradient(130deg,#f1f5f9 35%,#818cf8)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.1,
  },
  headerSub: { margin: 0, color: "#475569", fontSize: 13 },
  pill: {
    display: "flex", alignItems: "center", gap: 6, background: "#111827",
    border: "1px solid", borderRadius: 999, padding: "5px 13px",
    fontSize: 12, fontWeight: 600, color: "#94a3b8", flexShrink: 0,
  },
  dot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  // stats
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(195px,1fr))",
    gap: 14, marginBottom: 18, position: "relative", zIndex: 1,
  },
  statCard: {
    background: "#0e1422", border: "1px solid #1a2235",
    borderRadius: 14, padding: "18px 20px", display: "flex", gap: 14, alignItems: "center",
  },
  statIcon: { fontSize: 20, borderRadius: 10, padding: "8px 9px", flexShrink: 0 },
  statLabel: { margin: 0, fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" },
  statValue: { margin: "3px 0 2px", fontWeight: 800, lineHeight: 1 },
  statSub: { margin: 0, fontSize: 11, color: "#334155" },

  // coupon
  couponCard: {
    background: "#0e1422", border: "1px solid #1e293b", borderRadius: 18,
    padding: "22px 28px", display: "flex", gap: 28, alignItems: "center",
    flexWrap: "wrap", marginBottom: 22, position: "relative", zIndex: 1, overflow: "hidden",
  },
  couponGlow: {
    position: "absolute", left: -40, top: -40, width: 200, height: 200,
    background: "radial-gradient(circle,#6366f130,transparent 70%)", pointerEvents: "none",
  },
  couponLeft: { display: "flex", flexDirection: "column", gap: 4, flex: "0 0 auto" },
  couponTag: { fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#6366f1", fontFamily: "'Space Mono',monospace" },
  couponCode: { fontFamily: "'Space Mono',monospace", fontSize: 32, fontWeight: 800, color: "#c7d2fe", letterSpacing: "0.05em", lineHeight: 1.1 },
  couponId: { fontSize: 11, color: "#334155", fontFamily: "'Space Mono',monospace" },
  couponDivider: { width: 1, height: 60, background: "#1e293b", flexShrink: 0, alignSelf: "center" },
  couponRight: { display: "flex", gap: 28, flexWrap: "wrap", flex: 1, justifyContent: "space-around" },

  // controls
  controls: {
    display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18,
    position: "relative", zIndex: 1, alignItems: "center",
  },
  searchWrap: {
    display: "flex", alignItems: "center", gap: 8, background: "#0e1422",
    border: "1px solid #1a2235", borderRadius: 10, padding: "8px 14px", flex: "1 1 180px",
  },
  searchInput: { background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: 13, width: "100%" },
  clearBtn: { background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 },
  filterRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  filterBtn: {
    background: "#0e1422", border: "1px solid #1a2235", borderRadius: 8,
    color: "#475569", padding: "6px 13px", fontSize: 12, cursor: "pointer",
    transition: "all 0.15s", fontWeight: 500,
  },
  filterBtnOn: { background: "#1a1f3a", border: "1px solid #6366f1", color: "#a5b4fc" },
  sortSelect: {
    background: "#0e1422", border: "1px solid #1a2235", borderRadius: 10,
    color: "#64748b", padding: "7px 12px", fontSize: 12, cursor: "pointer", outline: "none",
  },

  // list
  listSection: { display: "flex", flexDirection: "column", gap: 10, position: "relative", zIndex: 1 },
  subCard: {
    background: "#0e1422", border: "1px solid #1a2235", borderRadius: 14,
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
  subName: { fontWeight: 700, fontSize: 14, color: "#f1f5f9" },
  subMobile: { fontSize: 12, color: "#475569" },
  subCompanyInline: { fontSize: 11, color: "#334155" },
  subMeta: { display: "flex", flexDirection: "column", gap: 4, flex: "0 0 auto" },
  planPill: { borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, textAlign: "center" },
  subDate: { fontSize: 10, color: "#334155", textAlign: "center", fontFamily: "'Space Mono',monospace" },
  subRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginLeft: "auto" },
  statusBadge: { borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700 },
  subAmount: { fontWeight: 800, fontSize: 15, color: "#f1f5f9" },
  commTag: { fontSize: 11, color: "#10b981", fontWeight: 700 },
  chevron: { color: "#334155", fontSize: 17, transition: "transform 0.2s", flexShrink: 0 },

  // expanded
  subDetails: { borderTop: "1px solid #131c2e", padding: "16px 18px", background: "#080c14" },
  sectionTitle: {
    margin: "0 0 10px", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
    color: "#6366f1", fontFamily: "'Space Mono',monospace", textTransform: "uppercase",
  },
  detailGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))",
    gap: "10px 18px", marginBottom: 4,
  },
  dItem: { display: "flex", flexDirection: "column", gap: 2 },
  dLabel: { fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase" },
  dValue: { fontSize: 13, fontWeight: 500 },

  // pagination
  paginationWrap: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12, marginTop: 24,
    position: "relative", zIndex: 1,
  },
  pageInfo: { fontSize: 13, color: "#475569" },
  pageButtons: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  pageBtn: {
    minWidth: 36, height: 36, borderRadius: 9,
    background: "#0e1422", border: "1px solid #1a2235",
    color: "#64748b", fontSize: 14, fontWeight: 600,
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
  pageEllipsis: { color: "#334155", fontSize: 14, padding: "0 4px", userSelect: "none" },

  footer: { textAlign: "center", color: "#1e293b", fontSize: 12, marginTop: 20, position: "relative", zIndex: 1 },
  empty: { textAlign: "center", padding: "52px 20px", display: "flex", flexDirection: "column", alignItems: "center" },
  centerScreen: {
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#07090f",
  },
  spinner: {
    width: 38, height: 38, border: "3px solid #1a2235",
    borderTop: "3px solid #6366f1", borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
  },
  errorBox: {
    background: "#120808", border: "1px solid #7f1d1d",
    borderRadius: 14, padding: "32px 40px", textAlign: "center",
  },
};

// ── inject global keyframes once ───────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("mkt-kf")) {
  const el = document.createElement("style");
  el.id = "mkt-kf";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=Space+Mono:wght@400;700&display=swap');
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .sub-card:hover   { border-color: #252f46 !important; }
    * { box-sizing: border-box; }
    input::placeholder { color: #334155; }
    select option { background: #0e1422; }
  `;
  document.head.appendChild(el);
}