import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection, getDocs, query, where, doc, getDoc,
  setDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../Firebase";
import Paginator from "./Paginator";

const PER_PAGE = 15;

// ── Date helpers ─────────────────────────────────────────────
const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function parseDMY(str) {
  if (!str || typeof str !== "string") return null;
  str = str.trim();

  // "09 Jun 2026" or "9 June 2026"
  const mname = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (mname) {
    const d = Number(mname[1]);
    const m = MONTHS[mname[2].toLowerCase().slice(0, 3)];
    const y = Number(mname[3]);
    if (d && m !== undefined && y) return new Date(y, m, d);
  }

  // "09/06/2026"  or  "09-06-2026"
  const slash = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slash) {
    const d = Number(slash[1]);
    const m = Number(slash[2]) - 1;
    const y = Number(slash[3]);
    if (d && y) return new Date(y, m, d);
  }

  // ISO "2026-06-09"
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  return null;
}
function today0() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function isoToday() { return new Date().toISOString().slice(0, 10); }
function daysFromToday(dateObj) {
  if (!dateObj) return null;
  return Math.ceil((dateObj - today0()) / (1000 * 60 * 60 * 24));
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function exportCSV(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function followUpDaysDiff(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate); d.setHours(0,0,0,0);
  return Math.ceil((d - today0()) / (1000 * 60 * 60 * 24));
}
function parseAnyDate(val) {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (typeof val === "number") return new Date(val);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
function fmtDateShort(d) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

const STATUS_COLORS = {
  pending:   { bg:"#33415540", color:"#94a3b8", label:"Pending" },
  done:      { bg:"#10b98120", color:"#10b981", label:"Done" },
  not_done:  { bg:"#ef444420", color:"#ef4444", label:"Not Reachable" },
  follow_up: { bg:"#f59e0b20", color:"#f59e0b", label:"Follow-up Set" },
  completed: { bg:"#6366f120", color:"#6366f1", label:"Completed" },
};
const LEAD_TYPE_LABELS = {
  new:     { label:"New User",     color:"#6366f1" },
  renewal: { label:"Renewal",      color:"#f59e0b" },
  early:   { label:"Early Expiry", color:"#ef4444" },
};
const newLeadId     = (mob)   => `new__${mob}`;
const renewalLeadId = (subId) => `renewal__${subId}`;
const earlyLeadId   = (subId) => `early__${subId}`;
function parseleadType(leadId) {
  if (leadId?.startsWith("new__"))     return "new";
  if (leadId?.startsWith("renewal__")) return "renewal";
  if (leadId?.startsWith("early__"))   return "early";
  return "new";
}

// ── SVG Icon Components ──────────────────────────────────────
const IcCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const IcX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const IcCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const IcStar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const IcNote = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
const IcPhone = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l1.14-1.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 15.6z"/></svg>
);
const IcAlert = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);
const IcInboxLg = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
);
const IcCheckCircleLg = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IcCheckCircleSm = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IcRotate = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.9"/></svg>
);
const IcSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const IcTarget = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const IcUsers = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IcRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);
const IcDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

// ════════════════════════════════════════════════════════════
//  LeadManagement
// ════════════════════════════════════════════════════════════
export default function LeadManagement({ mteamId, mobile, name }) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [coupon, setCoupon]     = useState(null);
  const [newUsers, setNewUsers] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [earlyExp, setEarlyExp] = useState([]);
  const [leadMap, setLeadMap]   = useState({});
  const [activeTab, setActiveTab]             = useState("new");
  const [saving, setSaving]                   = useState({});
  const [expandedCard, setExpandedCard]       = useState(null);
  const [followUpInput, setFollowUpInput]     = useState({});
  const [notesInput, setNotesInput]           = useState({});
  const [followupView, setFollowupView]       = useState("active"); // "active" | "completed"
  const [pages, setPages] = useState({ new:1, renewal:1, early:1, followup:1, completed:1 });
  const [tabSearch, setTabSearch] = useState({ new:"", renewal:"", early:"", followup:"", completed:"" });
  const [earlyDays, setEarlyDays]             = useState(7);   // days-ahead window for Early Expiry tab
  const [subHistory, setSubHistory]           = useState({});  // { [mobile]: { loading, data:[] } }
  const [leadFromDate, setLeadFromDate]       = useState(isoToday());
  const [leadToDate, setLeadToDate]           = useState(isoToday());

  const setPage   = (tab, p) => setPages((prev) => ({ ...prev, [tab]: p }));
  const setSearch = (tab, v) => setTabSearch((p) => ({ ...p, [tab]: v }));

  // ── Fetch ──────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const mteamSnap = await getDocs(query(collection(db, "mteam"), where("mobile", "==", mobile)));
      if (mteamSnap.empty) throw new Error("Marketing member not found.");
      const mt = { id: mteamSnap.docs[0].id, ...mteamSnap.docs[0].data() };

      let couponDoc = null;
      try {
        const snap = await getDoc(doc(db, "couponcode", mt.assign_coupon_id));
        if (snap.exists()) couponDoc = { id: snap.id, ...snap.data() };
      } catch (_) {}
      if (!couponDoc) {
        const cSnap = await getDocs(query(collection(db, "couponcode"), where("assigned_user.id", "==", mt.id)));
        if (!cSnap.empty) couponDoc = { id: cSnap.docs[0].id, ...cSnap.docs[0].data() };
      }
      if (!couponDoc) throw new Error("No coupon assigned to this account.");
      setCoupon(couponDoc);

      const [mySubsSnap, allSubsSnap, usersSnap, leadsSnap] = await Promise.all([
        getDocs(query(collection(db, "subscription"), where("couponApplied", "==", couponDoc.code), where("payment", "==", "Success"))),
        getDocs(query(collection(db, "subscription"), where("payment", "==", "Success"))),
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "leadBysubuserMarketingMember"), where("mteamId", "==", mteamId))),
      ]);

      const mySubs         = mySubsSnap.docs.map((d) => ({ documentId: d.id, ...d.data() }));
      const subscribedMobi = new Set(allSubsSnap.docs.map((d) => d.data().mobileNo).filter(Boolean));
      const allUsers       = usersSnap.docs.map((d) => ({ documentId: d.id, ...d.data() }));

      setNewUsers(allUsers.filter((u) => u.mobileNo && !subscribedMobi.has(u.mobileNo)));
      const now = today0();
      setRenewals(mySubs.filter((s) => {
        const exp = parseDMY(s.expirydate);
        return s.Expire === true || (exp && exp < now);
      }));
      setEarlyExp(mySubs.filter((s) => {
        const exp = parseDMY(s.expirydate);
        if (!exp) return false;
        const days = daysFromToday(exp);
        return days !== null && days >= 0 && days <= 30 && s.Expire !== true;
      }));

      const map = {};
      leadsSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.leadId) map[data.leadId] = { docId: d.id, ...data };
      });
      setLeadMap(map);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mobile, mteamId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fetch subscription history for a mobile (lazy) ─────────
  const fetchSubHistory = useCallback(async (mobile) => {
    if (!mobile || mobile === "—") return;
    if (subHistory[mobile]) return; // already fetched or loading
    setSubHistory((p) => ({ ...p, [mobile]: { loading: true, data: [] } }));
    try {
      const snap = await getDocs(
        query(collection(db, "subscription"), where("mobileNo", "==", mobile))
      );
      const subs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.payment === "Success")
        .sort((a, b) => new Date(b.PurchaseAt || 0) - new Date(a.PurchaseAt || 0));
      setSubHistory((p) => ({ ...p, [mobile]: { loading: false, data: subs } }));
    } catch (e) {
      setSubHistory((p) => ({ ...p, [mobile]: { loading: false, data: [] } }));
    }
  }, [subHistory]);

  // ── Derived values ─────────────────────────────────────────
  const followUpLeads = useMemo(() =>
    Object.values(leadMap)
      .filter((r) => r.followUpDate && r.status !== "completed")
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)),
    [leadMap]
  );

  const completedLeads = useMemo(() =>
    Object.values(leadMap)
      .filter((r) => r.status === "completed")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [leadMap]
  );

  const overdueFollowUps = useMemo(
    () => followUpLeads.filter((r) => followUpDaysDiff(r.followUpDate) < 0).length,
    [followUpLeads]
  );

  const resolveItem = useCallback((leadId) => {
    if (!leadId) return { type: "new", item: null };
    const type = parseleadType(leadId);
    if (type === "new") {
      const mob = leadId.replace("new__", "");
      return { type, item: newUsers.find((u) => u.mobileNo === mob) ?? null };
    }
    if (type === "renewal") {
      const sid = leadId.replace("renewal__", "");
      return { type, item: renewals.find((s) => s.documentId === sid) ?? null };
    }
    const sid = leadId.replace("early__", "");
    return { type:"early", item: earlyExp.find((s) => s.documentId === sid) ?? null };
  }, [newUsers, renewals, earlyExp]);

  // ── Save / Actions ─────────────────────────────────────────
  const saveLead = useCallback(async (leadId, patch) => {
    setSaving((p) => ({ ...p, [leadId]: true }));
    try {
      const existing = leadMap[leadId];
      const docRef = existing?.docId
        ? doc(db, "leadBysubuserMarketingMember", existing.docId)
        : doc(collection(db, "leadBysubuserMarketingMember"));
      const payload = {
        mteamId, memberMobile: mobile, memberName: name, leadId,
        updatedAt: serverTimestamp(),
        ...(existing ?? { createdAt: serverTimestamp() }),
        ...patch,
      };
      await setDoc(docRef, payload, { merge: true });
      setLeadMap((prev) => ({ ...prev, [leadId]: { ...prev[leadId], docId: docRef.id, ...patch } }));
    } catch (err) {
      console.error("Save lead error:", err);
    } finally {
      setSaving((p) => ({ ...p, [leadId]: false }));
    }
  }, [leadMap, mteamId, mobile, name]);

  const markStatus   = (leadId, status, extra = {}) => saveLead(leadId, { status, ...extra });
  const saveNotes    = (leadId) => saveLead(leadId, { notes: notesInput[leadId] ?? "" });
  const markComplete = (leadId, userMobile, userName) =>
    saveLead(leadId, { status:"completed", completedAt: new Date().toISOString(), userMobile, userName });
  const reopenLead   = (leadId) =>
    saveLead(leadId, { status:"pending", completedAt: null });
  const setFollowUp  = (leadId, userMobile, userName) => {
    const date = followUpInput[leadId];
    if (!date) return;
    saveLead(leadId, { status:"follow_up", followUpDate: date, userMobile, userName });
    setFollowUpInput((p) => ({ ...p, [leadId]: "" }));
  };

  // ── Tab counts ─────────────────────────────────────────────
  const pendingCount = (leads, getId) =>
    leads.filter((l) => {
      const st = leadMap[getId(l)]?.status;
      return !st || st === "pending" || st === "not_done" || st === "follow_up";
    }).length;

  const TAB_DEFS = [
    { id:"new",      icon:<IcUsers />,    label:"New Users",    count: pendingCount(newUsers,  (u) => newLeadId(u.mobileNo)) },
    { id:"renewal",  icon:<IcRefresh />,  label:"Renewal",      count: pendingCount(renewals,  (s) => renewalLeadId(s.documentId)) },
    { id:"early",    icon:<IcAlert />,    label:"Early Expiry", count: pendingCount(earlyExp,  (s) => earlyLeadId(s.documentId)) },
    { id:"followup", icon:<IcCalendar />, label:"Follow-ups",   count: overdueFollowUps, accentOverdue: overdueFollowUps > 0 },
  ];

  // ── Loading / Error ────────────────────────────────────────
  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px" }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid var(--p-border)", borderTopColor:"#6366f1", animation:"spin 0.8s linear infinite" }} />
      <p style={{ color:"var(--p-text-3)", marginTop:14, fontSize:14 }}>Loading leads…</p>
    </div>
  );
  if (error) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 20px", gap:10 }}>
      <span style={{ color:"#ef4444" }}><IcAlert /></span>
      <p style={{ color:"#ef4444", fontSize:14, margin:0 }}>{error}</p>
    </div>
  );

  // ── Lead Card ──────────────────────────────────────────────
  const renderLeadCard = (leadId, userMobile, userName, itemType, item, isCompletedView = false) => {
    const record   = leadMap[leadId] ?? {};
    const status   = record.status ?? "pending";
    const sc       = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
    const isOpen   = expandedCard === leadId;
    const isSaving = saving[leadId];
    const expDate  = item ? parseDMY(item.expirydate) : null;
    const daysLeft = expDate ? daysFromToday(expDate) : null;
    const fuDate   = record.followUpDate;
    const fuDiff   = fuDate ? followUpDaysDiff(fuDate) : null;
    const isOverdue = fuDiff !== null && fuDiff < 0;
    const typeInfo = LEAD_TYPE_LABELS[itemType];

    return (
      <div key={leadId} style={{
        background:"var(--p-card)", border:"1px solid var(--p-border)",
        borderLeft:`4px solid ${sc.color}`, borderRadius:14,
        overflow:"hidden", transition:"box-shadow 0.2s",
        opacity: status === "completed" ? 0.88 : 1,
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"16px 18px", flexWrap:"wrap" }}>
          {/* Avatar */}
          <div style={{
            width:44, height:44, borderRadius:"50%",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontWeight:800, fontSize:18, flexShrink:0,
          }}>{(userName || "?")[0].toUpperCase()}</div>

          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontWeight:700, fontSize:15, color:"var(--p-text)" }}>{userName}</span>
              <span style={{ padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color }}>{sc.label}</span>
              {typeInfo && (
                <span style={{ padding:"2px 8px", borderRadius:6, border:`1px solid ${typeInfo.color}40`, fontSize:10, fontWeight:700, color:typeInfo.color }}>
                  {typeInfo.label}
                </span>
              )}
            </div>

            <span style={{ fontSize:12, color:"var(--p-text-3)", display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
              <IcPhone /> {userMobile}
            </span>

            {item && (item.plan || item.expirydate) && (
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:5 }}>
                {item.plan && (
                  <span style={{ padding:"2px 8px", borderRadius:6, background:"#6366f115", color:"#a5b4fc", fontSize:11, fontWeight:700 }}>{item.plan}</span>
                )}
                {expDate && (
                  <span style={{
                    fontSize:12, fontWeight:600,
                    color: daysLeft !== null && daysLeft <= 0 ? "#ef4444" : daysLeft !== null && daysLeft <= 2 ? "#f59e0b" : "var(--p-text-2)",
                  }}>
                    {itemType === "renewal"
                      ? `Expired: ${item.expirydate}`
                      : `Expires: ${item.expirydate} (${daysLeft === 0 ? "today!" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`})`
                    }
                  </span>
                )}
              </div>
            )}

            {fuDate && !isCompletedView && (
              <div style={{
                display:"inline-flex", alignItems:"center", gap:5, marginTop:6,
                padding:"3px 10px", borderRadius:8, border:"1px solid", fontSize:11, fontWeight:700,
                color: isOverdue ? "#ef4444" : fuDiff === 0 ? "#f59e0b" : "#10b981",
                borderColor: isOverdue ? "#ef444440" : fuDiff === 0 ? "#f59e0b40" : "#10b98140",
              }}>
                <IcCalendar />
                Follow-up: {fmtDate(fuDate)}
                {isOverdue && " · Overdue"}
                {fuDiff === 0 && !isOverdue && " · Today"}
              </div>
            )}

            {record.completedAt && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:6, padding:"3px 10px", borderRadius:8, border:"1px solid #6366f140", fontSize:11, fontWeight:700, color:"#6366f1" }}>
                <IcCheck /> Completed: {fmtDate(record.completedAt)}
              </div>
            )}

            {record.notes && (
              <p style={{ margin:"5px 0 0", fontSize:12, color:"var(--p-text-3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:420 }}>
                {record.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-start", marginLeft:"auto" }}>
            {isCompletedView ? (
              <ActionBtn label="Reopen" icon={<IcRotate />} color="#f59e0b"
                active={false} disabled={isSaving}
                onClick={() => reopenLead(leadId)} />
            ) : (
              <>
                <ActionBtn label="Done" icon={<IcCheck />} color="#10b981"
                  active={status === "done"} disabled={isSaving || status === "completed"}
                  onClick={() => markStatus(leadId, "done", { userMobile, userName })} />
                <ActionBtn label="Not Reachable" icon={<IcX />} color="#ef4444"
                  active={status === "not_done"} disabled={isSaving || status === "completed"}
                  onClick={() => markStatus(leadId, "not_done", { userMobile, userName })} />
              </>
            )}
            <ActionBtn label="Details" icon={<IcNote />} color="#6366f1"
              active={isOpen} disabled={false}
              onClick={() => {
                const next = isOpen ? null : leadId;
                setExpandedCard(next);
                if (next && (itemType === "early" || itemType === "renewal")) {
                  fetchSubHistory(userMobile);
                }
              }} />
          </div>
        </div>

        {/* Expanded panel */}
        {isOpen && (
          <div style={{ borderTop:"1px solid var(--p-border)", background:"var(--p-card2)", padding:"20px 18px", display:"flex", flexDirection:"column", gap:18 }}>

            {!isCompletedView && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:5 }}>
                  <IcCalendar /> Set Next Follow-up Date
                </p>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
                  <input type="date"
                    value={followUpInput[leadId] ?? record.followUpDate ?? ""}
                    min={isoToday()}
                    onChange={(e) => setFollowUpInput((p) => ({ ...p, [leadId]: e.target.value }))}
                    style={{ padding:"9px 12px", background:"var(--p-input)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text)", fontSize:14, outline:"none", colorScheme:"var(--p-cs, dark)" }}
                  />
                  <button style={{
                    display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
                    background:"#f59e0b20", border:"1.5px solid #f59e0b60",
                    borderRadius:8, color:"#f59e0b", fontSize:13, fontWeight:700,
                    cursor: !followUpInput[leadId] || isSaving ? "not-allowed" : "pointer",
                    opacity: !followUpInput[leadId] || isSaving ? 0.5 : 1,
                  }} disabled={!followUpInput[leadId] || isSaving}
                    onClick={() => setFollowUp(leadId, userMobile, userName)}>
                    <IcCalendar /> Set Follow-up
                  </button>
                </div>
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:5 }}>
                <IcNote /> Notes
              </p>
              <textarea
                value={notesInput[leadId] ?? record.notes ?? ""}
                onChange={(e) => setNotesInput((p) => ({ ...p, [leadId]: e.target.value }))}
                placeholder="Add call notes, conversation summary…"
                rows={3}
                style={{ width:"100%", padding:"10px 12px", background:"var(--p-input)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text)", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}
              />
              <button style={{
                display:"flex", alignItems:"center", gap:6, padding:"9px 14px",
                background:"var(--p-card)", border:"1.5px solid var(--p-border)",
                borderRadius:8, color:"var(--p-text-2)", fontSize:13, fontWeight:700,
                cursor: isSaving ? "not-allowed" : "pointer", alignSelf:"flex-start",
              }} onClick={() => saveNotes(leadId)} disabled={isSaving}>
                Save Notes
              </button>
            </div>

            {status !== "completed" && !isCompletedView && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:5 }}>
                  <IcStar /> Close Lead
                </p>
                <button style={{
                  display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
                  background:"#6366f120", border:"1.5px solid #6366f160",
                  borderRadius:8, color:"#6366f1", fontSize:13, fontWeight:700,
                  cursor: isSaving ? "not-allowed" : "pointer", alignSelf:"flex-start",
                }} onClick={() => markComplete(leadId, userMobile, userName)} disabled={isSaving}>
                  <IcStar /> Mark as Successfully Completed
                </button>
              </div>
            )}

            {isCompletedView && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Undo / Reopen this lead</p>
                <p style={{ margin:0, fontSize:12, color:"var(--p-text-3)" }}>
                  If this was marked completed accidentally, you can reopen it to continue follow-up.
                </p>
                <button style={{
                  display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
                  background:"#f59e0b20", border:"1.5px solid #f59e0b60",
                  borderRadius:8, color:"#f59e0b", fontSize:13, fontWeight:700,
                  cursor: isSaving ? "not-allowed" : "pointer", alignSelf:"flex-start",
                }} onClick={() => reopenLead(leadId)} disabled={isSaving}>
                  <IcRotate /> Reopen Lead
                </button>
              </div>
            )}

            {/* ── Subscription History Table ─────────────── */}
            {(itemType === "early" || itemType === "renewal") && userMobile && userMobile !== "—" && (
              <SubscriptionHistoryTable mobile={userMobile} history={subHistory[userMobile]} />
            )}

            <div>
              {record.updatedAt && (
                <p style={{ margin:0, fontSize:11, color:"var(--p-text-4)", borderTop:"1px solid var(--p-border)", paddingTop:10 }}>
                  Last updated: {record.updatedAt?.toDate ? record.updatedAt.toDate().toLocaleString("en-IN") : "—"}
                </p>
              )}
              {record.completedAt && (
                <p style={{ margin:"4px 0 0", fontSize:11, color:"#10b981" }}>
                  Completed on: {fmtDate(record.completedAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Shared table styles ────────────────────────────────────
  const TH = { padding:"10px 14px", fontSize:11, fontWeight:700, color:"var(--p-text-4)", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:"left", background:"var(--p-card2)", borderBottom:"2px solid var(--p-border)", whiteSpace:"nowrap" };
  const TD = { padding:"11px 14px", fontSize:13, color:"var(--p-text)", borderBottom:"1px solid var(--p-border)", verticalAlign:"middle" };

  // ── Reusable expanded detail panel ────────────────────────
  const renderDetailPanel = (leadId, userMobile, userName, itemType, item, isCompletedView) => {
    const record   = leadMap[leadId] ?? {};
    const isSaving = saving[leadId];
    const status   = record.status ?? "pending";
    return (
      <div style={{ padding:"20px 18px", display:"flex", flexDirection:"column", gap:18 }}>
        {!isCompletedView && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:5 }}>
              <IcCalendar /> Set Next Follow-up Date
            </p>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              <input type="date"
                value={followUpInput[leadId] ?? record.followUpDate ?? ""}
                min={isoToday()}
                onChange={(e) => setFollowUpInput((p) => ({ ...p, [leadId]: e.target.value }))}
                style={{ padding:"9px 12px", background:"var(--p-input)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text)", fontSize:14, outline:"none", colorScheme:"var(--p-cs, dark)" }}
              />
              <button style={{
                display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
                background:"#f59e0b20", border:"1.5px solid #f59e0b60", borderRadius:8,
                color:"#f59e0b", fontSize:13, fontWeight:700,
                cursor: !followUpInput[leadId] || isSaving ? "not-allowed" : "pointer",
                opacity: !followUpInput[leadId] || isSaving ? 0.5 : 1,
              }} disabled={!followUpInput[leadId] || isSaving}
                onClick={() => setFollowUp(leadId, userMobile, userName)}>
                <IcCalendar /> Set Follow-up
              </button>
            </div>
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:5 }}>
            <IcNote /> Notes
          </p>
          <textarea
            value={notesInput[leadId] ?? record.notes ?? ""}
            onChange={(e) => setNotesInput((p) => ({ ...p, [leadId]: e.target.value }))}
            placeholder="Add call notes, conversation summary…"
            rows={3}
            style={{ width:"100%", padding:"10px 12px", background:"var(--p-input)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text)", fontSize:13, outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" }}
          />
          <button style={{
            display:"flex", alignItems:"center", gap:6, padding:"9px 14px",
            background:"var(--p-card)", border:"1.5px solid var(--p-border)",
            borderRadius:8, color:"var(--p-text-2)", fontSize:13, fontWeight:700,
            cursor: isSaving ? "not-allowed" : "pointer", alignSelf:"flex-start",
          }} onClick={() => saveNotes(leadId)} disabled={isSaving}>
            Save Notes
          </button>
        </div>
        {status !== "completed" && !isCompletedView && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em", display:"flex", alignItems:"center", gap:5 }}>
              <IcStar /> Close Lead
            </p>
            <button style={{
              display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
              background:"#6366f120", border:"1.5px solid #6366f160",
              borderRadius:8, color:"#6366f1", fontSize:13, fontWeight:700,
              cursor: isSaving ? "not-allowed" : "pointer", alignSelf:"flex-start",
            }} onClick={() => markComplete(leadId, userMobile, userName)} disabled={isSaving}>
              <IcStar /> Mark as Successfully Completed
            </button>
          </div>
        )}
        {isCompletedView && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Reopen this lead</p>
            <button style={{
              display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
              background:"#f59e0b20", border:"1.5px solid #f59e0b60",
              borderRadius:8, color:"#f59e0b", fontSize:13, fontWeight:700,
              cursor: isSaving ? "not-allowed" : "pointer", alignSelf:"flex-start",
            }} onClick={() => reopenLead(leadId)} disabled={isSaving}>
              <IcRotate /> Reopen Lead
            </button>
          </div>
        )}
        {(itemType === "early" || itemType === "renewal") && userMobile && userMobile !== "—" && (
          <SubscriptionHistoryTable mobile={userMobile} history={subHistory[userMobile]} />
        )}
        <div>
          {record.updatedAt && (
            <p style={{ margin:0, fontSize:11, color:"var(--p-text-4)", borderTop:"1px solid var(--p-border)", paddingTop:10 }}>
              Last updated: {record.updatedAt?.toDate ? record.updatedAt.toDate().toLocaleString("en-IN") : "—"}
            </p>
          )}
          {record.completedAt && (
            <p style={{ margin:"4px 0 0", fontSize:11, color:"#10b981" }}>
              Completed on: {fmtDate(record.completedAt)}
            </p>
          )}
        </div>
      </div>
    );
  };

  // ── Follow-up Active view ──────────────────────────────────
  const renderFollowupActive = () => {
    const q = tabSearch.followup.toLowerCase();
    let filtered = followUpLeads.filter((r) => {
      if (!leadFromDate && !leadToDate) return true;
      if (!r.followUpDate) return true;
      const itemDate = new Date(r.followUpDate);
      if (leadFromDate) { const from = new Date(leadFromDate); from.setHours(0,0,0,0); if (itemDate < from) return false; }
      if (leadToDate)   { const to   = new Date(leadToDate);   to.setHours(23,59,59,999); if (itemDate > to) return false; }
      return true;
    });
    if (q) filtered = filtered.filter((r) =>
      (r.userName ?? "").toLowerCase().includes(q) || (r.userMobile ?? "").includes(q)
    );

    if (filtered.length === 0) return <EmptyState icon={<IcInboxLg />} text="No follow-ups scheduled. Set a date on any lead to see it here." />;

    const currentPage = pages.followup;
    const pageSlice   = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const todayStr    = isoToday();

    const handleExportCSV = () => {
      exportCSV("follow-ups-active.csv",
        ["#","Name","Mobile","Type","Follow-up Date","Priority","Lead Status","Notes"],
        filtered.map((r, i) => {
          const { type } = resolveItem(r.leadId);
          const diff     = followUpDaysDiff(r.followUpDate);
          const priority = diff === null ? "—" : diff < 0 ? "Overdue" : diff === 0 ? "Today" : "Upcoming";
          const rec      = leadMap[r.leadId] ?? {};
          return [i+1, r.userName??"", r.userMobile??"", type, r.followUpDate??"", priority, rec.status??"pending", rec.notes??""];
        })
      );
    };

    return (
      <>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
          <button onClick={handleExportCSV} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, border:"1.5px solid #10b98160", background:"#10b98115", color:"#10b981", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <IcDownload /> Export CSV ({filtered.length})
          </button>
        </div>
        <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid var(--p-border)", marginBottom:16 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
            <thead>
              <tr>
                <th style={TH}>#</th>
                <th style={TH}>Name</th>
                <th style={TH}>Mobile</th>
                <th style={TH}>Type</th>
                <th style={TH}>Follow-up Date</th>
                <th style={TH}>Priority</th>
                <th style={TH}>Lead Status</th>
                <th style={{ ...TH, textAlign:"center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((record, idx) => {
                const { type, item } = resolveItem(record.leadId);
                const userMobile = record.userMobile ?? (item?.mobileNo ?? "—");
                const userName   = record.userName   ?? (item?.name ?? item?.UserName ?? userMobile);
                const leadId     = record.leadId;
                const rec        = leadMap[leadId] ?? {};
                const status     = rec.status ?? "pending";
                const sc         = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
                const isOpen     = expandedCard === leadId;
                const isSaving   = saving[leadId];
                const fuDiff     = record.followUpDate ? followUpDaysDiff(record.followUpDate) : null;
                const isOverdue  = fuDiff !== null && fuDiff < 0;
                const isToday    = fuDiff === 0;
                const typeInfo   = LEAD_TYPE_LABELS[type];
                return (
                  <React.Fragment key={leadId}>
                    <tr style={{ background: isOpen ? "var(--p-card2)" : isOverdue ? "#ef444408" : isToday ? "#f59e0b08" : idx%2===1 ? "var(--p-bg)" : "transparent" }}>
                      <td style={{ ...TD, color:"var(--p-text-4)", fontSize:11, width:36 }}>{(currentPage-1)*PER_PAGE+idx+1}</td>
                      <td style={TD}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:14, flexShrink:0 }}>
                            {(userName||"?")[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight:700, fontSize:13 }}>{userName}</span>
                        </div>
                      </td>
                      <td style={{ ...TD, fontFamily:"'Space Mono',monospace", fontSize:12 }}>{userMobile}</td>
                      <td style={TD}>
                        {typeInfo && <span style={{ padding:"2px 8px", borderRadius:6, border:`1px solid ${typeInfo.color}40`, fontSize:11, fontWeight:700, color:typeInfo.color }}>{typeInfo.label}</span>}
                      </td>
                      <td style={{ ...TD, fontWeight:600, color: isOverdue?"#ef4444":isToday?"#f59e0b":"var(--p-text-2)" }}>
                        {record.followUpDate ? fmtDate(record.followUpDate) : "—"}
                      </td>
                      <td style={TD}>
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background: isOverdue?"#ef444420":isToday?"#f59e0b20":"#10b98120", color: isOverdue?"#ef4444":isToday?"#f59e0b":"#10b981" }}>
                          {isOverdue ? "⚠ Overdue" : isToday ? "• Today" : "Upcoming"}
                        </span>
                      </td>
                      <td style={TD}>
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color }}>{sc.label}</span>
                      </td>
                      <td style={{ ...TD, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:5, justifyContent:"center" }}>
                          <ActionBtn label="Done" icon={<IcCheck />} color="#10b981" active={status==="done"} disabled={isSaving||status==="completed"} onClick={() => markStatus(leadId,"done",{userMobile,userName})} />
                          <ActionBtn label="N/R"  icon={<IcX />}    color="#ef4444" active={status==="not_done"} disabled={isSaving||status==="completed"} onClick={() => markStatus(leadId,"not_done",{userMobile,userName})} />
                          <ActionBtn label="Details" icon={<IcNote />} color="#6366f1" active={isOpen} disabled={false} onClick={() => { const next=isOpen?null:leadId; setExpandedCard(next); if(next&&(type==="early"||type==="renewal")) fetchSubHistory(userMobile); }} />
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} style={{ padding:0, background:"var(--p-card2)", borderBottom:"1px solid var(--p-border)" }}>
                          {renderDetailPanel(leadId, userMobile, userName, type, item, false)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator total={filtered.length} page={currentPage} perPage={PER_PAGE}
          onChange={(p) => { setPage("followup", p); setExpandedCard(null); window.scrollTo({ top:0, behavior:"smooth" }); }} />
      </>
    );
  };

  // ── Follow-up Completed view ───────────────────────────────
  const renderFollowupCompleted = () => {
    const q = tabSearch.completed.toLowerCase();
    const filtered = q
      ? completedLeads.filter((r) =>
          (r.userName ?? "").toLowerCase().includes(q) || (r.userMobile ?? "").includes(q)
        )
      : completedLeads;

    if (filtered.length === 0) return <EmptyState icon={<IcCheckCircleLg />} text="No completed leads yet. When you close a lead, it appears here." />;

    const currentPage = pages.completed;
    const pageSlice   = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    const handleExportCSV = () => {
      exportCSV("leads-completed.csv",
        ["#","Name","Mobile","Type","Completed On","Notes"],
        filtered.map((r, i) => {
          const { type } = resolveItem(r.leadId);
          const rec = leadMap[r.leadId] ?? {};
          return [i+1, r.userName??"", r.userMobile??"", type, r.completedAt??"", rec.notes??""];
        })
      );
    };

    return (
      <>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
          <button onClick={handleExportCSV} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, border:"1.5px solid #10b98160", background:"#10b98115", color:"#10b981", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <IcDownload /> Export CSV ({filtered.length})
          </button>
        </div>
        <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid var(--p-border)", marginBottom:16 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:550 }}>
            <thead>
              <tr>
                <th style={TH}>#</th>
                <th style={TH}>Name</th>
                <th style={TH}>Mobile</th>
                <th style={TH}>Type</th>
                <th style={TH}>Completed On</th>
                <th style={TH}>Notes</th>
                <th style={{ ...TH, textAlign:"center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((record, idx) => {
                const { type, item } = resolveItem(record.leadId);
                const userMobile = record.userMobile ?? (item?.mobileNo ?? "—");
                const userName   = record.userName   ?? (item?.name ?? item?.UserName ?? userMobile);
                const leadId     = record.leadId;
                const rec        = leadMap[leadId] ?? {};
                const isOpen     = expandedCard === leadId;
                const isSaving   = saving[leadId];
                const typeInfo   = LEAD_TYPE_LABELS[type];
                return (
                  <React.Fragment key={leadId}>
                    <tr style={{ background: isOpen ? "var(--p-card2)" : idx%2===1 ? "var(--p-bg)" : "transparent" }}>
                      <td style={{ ...TD, color:"var(--p-text-4)", fontSize:11, width:36 }}>{(currentPage-1)*PER_PAGE+idx+1}</td>
                      <td style={TD}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#10b981,#059669)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:14, flexShrink:0 }}>
                            {(userName||"?")[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight:700, fontSize:13 }}>{userName}</span>
                        </div>
                      </td>
                      <td style={{ ...TD, fontFamily:"'Space Mono',monospace", fontSize:12 }}>{userMobile}</td>
                      <td style={TD}>
                        {typeInfo && <span style={{ padding:"2px 8px", borderRadius:6, border:`1px solid ${typeInfo.color}40`, fontSize:11, fontWeight:700, color:typeInfo.color }}>{typeInfo.label}</span>}
                      </td>
                      <td style={{ ...TD, color:"#10b981", fontWeight:600 }}>
                        {record.completedAt ? fmtDate(record.completedAt) : "—"}
                      </td>
                      <td style={{ ...TD, maxWidth:200 }}>
                        <span style={{ fontSize:12, color:"var(--p-text-3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block" }}>
                          {rec.notes || <span style={{ color:"var(--p-text-4)" }}>—</span>}
                        </span>
                      </td>
                      <td style={{ ...TD, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:5, justifyContent:"center" }}>
                          <ActionBtn label="Reopen"  icon={<IcRotate />} color="#f59e0b" active={false} disabled={isSaving} onClick={() => reopenLead(leadId)} />
                          <ActionBtn label="Details" icon={<IcNote />}   color="#6366f1" active={isOpen} disabled={false}   onClick={() => { const next=isOpen?null:leadId; setExpandedCard(next); if(next&&(type==="early"||type==="renewal")) fetchSubHistory(userMobile); }} />
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} style={{ padding:0, background:"var(--p-card2)", borderBottom:"1px solid var(--p-border)" }}>
                          {renderDetailPanel(leadId, userMobile, userName, type, item, true)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator total={filtered.length} page={currentPage} perPage={PER_PAGE}
          onChange={(p) => { setPage("completed", p); setExpandedCard(null); window.scrollTo({ top:0, behavior:"smooth" }); }} />
      </>
    );
  };

  // ── Normal tab ─────────────────────────────────────────────
  const renderNormalTab = () => {
    const getInfo = (item) => {
      if (activeTab === "new")     return { leadId: newLeadId(item.mobileNo),       mob: item.mobileNo, name2: item.name,                     type:"new" };
      if (activeTab === "renewal") return { leadId: renewalLeadId(item.documentId), mob: item.mobileNo, name2: item.UserName ?? item.mobileNo, type:"renewal" };
      return                              { leadId: earlyLeadId(item.documentId),   mob: item.mobileNo, name2: item.UserName ?? item.mobileNo, type:"early" };
    };

    const baseList =
      activeTab === "new"     ? newUsers :
      activeTab === "renewal" ? renewals : earlyExp;

    let fullList = (activeTab === "early"
      ? baseList.filter((s) => {
          const exp = parseDMY(s.expirydate);
          if (!exp) return false;
          const days = daysFromToday(exp);
          return days !== null && days >= 0 && days <= earlyDays;
        })
      : baseList
    ).filter((item) => {
      if (!leadFromDate && !leadToDate) return true;
      let itemDate;
      if (activeTab === "new") {
        itemDate = parseAnyDate(item.createdAt);
      } else {
        itemDate = parseDMY(item.expirydate);
      }
      if (!itemDate) return true;
      if (leadFromDate) { const from = new Date(leadFromDate); from.setHours(0,0,0,0); if (itemDate < from) return false; }
      if (leadToDate)   { const to   = new Date(leadToDate);   to.setHours(23,59,59,999); if (itemDate > to) return false; }
      return true;
    });

    if (activeTab === "new") {
      fullList = [...fullList].sort((a, b) => {
        const da = parseAnyDate(a.createdAt);
        const db = parseAnyDate(b.createdAt);
        return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
      });
    }

    const q = (tabSearch[activeTab] ?? "").toLowerCase();
    const currentList = q
      ? fullList.filter((item) => {
          const n = (item.name ?? item.UserName ?? "").toLowerCase();
          const m = (item.mobileNo ?? "").toLowerCase();
          return n.includes(q) || m.includes(q);
        })
      : fullList;

    if (currentList.length === 0) return <EmptyState icon={<IcInboxLg />} text={
      activeTab === "new"     ? "No new unsubscribed users found." :
      activeTab === "renewal" ? "No expired subscriptions from your coupon." :
                                `No subscriptions expiring in the next ${earlyDays} days.`
    } />;

    const currentPage  = pages[activeTab] ?? 1;
    const pageSlice    = currentList.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const isNew        = activeTab === "new";
    const isRenewal    = activeTab === "renewal";
    const isEarly      = activeTab === "early";
    const colCount     = isNew ? 6 : isRenewal ? 7 : 8;

    const handleExportCSV = () => {
      const label = isNew ? "new-users" : isRenewal ? "renewal" : `early-expiry-${earlyDays}days`;
      const headers = isNew
        ? ["#","Name","Mobile","Lead Status","Follow-up Date","Notes"]
        : isRenewal
        ? ["#","Name","Mobile","Plan","Expiry Date","Lead Status","Follow-up Date","Notes"]
        : ["#","Name","Mobile","Plan","Expiry Date","Days Left","Lead Status","Follow-up Date","Notes"];
      const rows = currentList.map((item, idx) => {
        const { leadId, mob, name2 } = getInfo(item);
        const rec      = leadMap[leadId] ?? {};
        const expDate  = !isNew ? parseDMY(item.expirydate) : null;
        const daysLeft = expDate ? daysFromToday(expDate) : null;
        if (isNew) return [idx+1, name2, mob, rec.status??"pending", rec.followUpDate??"", rec.notes??""];
        if (isRenewal) return [idx+1, item.UserName??item.mobileNo, item.mobileNo, item.plan??"", item.expirydate??"", rec.status??"pending", rec.followUpDate??"", rec.notes??""];
        return [idx+1, item.UserName??item.mobileNo, item.mobileNo, item.plan??"", item.expirydate??"", daysLeft??0, rec.status??"pending", rec.followUpDate??"", rec.notes??""];
      });
      exportCSV(`leads-${label}.csv`, headers, rows);
    };

    return (
      <>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
          <button onClick={handleExportCSV} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, border:"1.5px solid #10b98160", background:"#10b98115", color:"#10b981", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            <IcDownload /> Export CSV ({currentList.length})
          </button>
        </div>
        <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid var(--p-border)", marginBottom:16 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:isNew?520:620 }}>
            <thead>
              <tr>
                <th style={TH}>#</th>
                <th style={TH}>Name</th>
                <th style={TH}>Mobile</th>
                {!isNew && <th style={TH}>Plan</th>}
                {!isNew && <th style={TH}>Expiry Date</th>}
                {isEarly && <th style={{ ...TH, textAlign:"center" }}>Days Left</th>}
                <th style={TH}>Lead Status</th>
                <th style={TH}>Follow-up</th>
                <th style={{ ...TH, textAlign:"center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((item, idx) => {
                const { leadId, mob, name2, type } = getInfo(item);
                const record   = leadMap[leadId] ?? {};
                const status   = record.status ?? "pending";
                const sc       = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
                const isOpen   = expandedCard === leadId;
                const isSaving = saving[leadId];
                const expDate  = !isNew ? parseDMY(item.expirydate) : null;
                const daysLeft = expDate ? daysFromToday(expDate) : null;
                const fuDate   = record.followUpDate;
                const fuDiff   = fuDate ? followUpDaysDiff(fuDate) : null;
                const isOverdue = fuDiff !== null && fuDiff < 0;
                return (
                  <React.Fragment key={leadId}>
                    <tr style={{ background: isOpen ? "var(--p-card2)" : idx%2===1 ? "var(--p-bg)" : "transparent" }}>
                      <td style={{ ...TD, color:"var(--p-text-4)", fontSize:11, width:36 }}>{(currentPage-1)*PER_PAGE+idx+1}</td>
                      <td style={TD}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:14, flexShrink:0 }}>
                            {(name2||"?")[0].toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight:700, fontSize:13, display:"block" }}>{name2}</span>
                            {isNew && (() => { const cd = parseAnyDate(item.createdAt); return cd ? <span style={{ fontSize:11, color:"var(--p-text-4)" }}>Joined: {fmtDateShort(cd)}</span> : null; })()}
                          </div>
                        </div>
                      </td>
                      <td style={{ ...TD, fontFamily:"'Space Mono',monospace", fontSize:12 }}>{mob}</td>
                      {!isNew && (
                        <td style={TD}>
                          <span style={{ padding:"2px 8px", borderRadius:6, background:"#6366f115", color:"#a5b4fc", fontSize:11, fontWeight:700 }}>{item.plan||"—"}</span>
                        </td>
                      )}
                      {!isNew && (
                        <td style={{ ...TD, fontWeight:600, color: daysLeft!==null&&daysLeft<=0?"#ef4444":daysLeft!==null&&daysLeft<=2?"#f59e0b":"var(--p-text-2)" }}>
                          {item.expirydate||"—"}
                        </td>
                      )}
                      {isEarly && (
                        <td style={{ ...TD, textAlign:"center" }}>
                          <span style={{ padding:"3px 10px", borderRadius:8, fontSize:12, fontWeight:700, background: daysLeft===0?"#ef444420":daysLeft!==null&&daysLeft<=2?"#f59e0b20":"#10b98120", color: daysLeft===0?"#ef4444":daysLeft!==null&&daysLeft<=2?"#f59e0b":"#10b981" }}>
                            {daysLeft===0?"Today!":daysLeft===1?"1 day":`${daysLeft} days`}
                          </span>
                        </td>
                      )}
                      <td style={TD}>
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:sc.bg, color:sc.color }}>{sc.label}</span>
                      </td>
                      <td style={TD}>
                        {fuDate
                          ? <span style={{ fontSize:12, fontWeight:600, color: isOverdue?"#ef4444":fuDiff===0?"#f59e0b":"var(--p-text-2)" }}>{fmtDate(fuDate)}{isOverdue?" ⚠":""}</span>
                          : <span style={{ fontSize:12, color:"var(--p-text-4)" }}>—</span>
                        }
                      </td>
                      <td style={{ ...TD, textAlign:"center" }}>
                        <div style={{ display:"flex", gap:5, justifyContent:"center" }}>
                          <ActionBtn label="Done" icon={<IcCheck />} color="#10b981" active={status==="done"} disabled={isSaving||status==="completed"} onClick={() => markStatus(leadId,"done",{userMobile:mob,userName:name2})} />
                          <ActionBtn label="N/R"  icon={<IcX />}    color="#ef4444" active={status==="not_done"} disabled={isSaving||status==="completed"} onClick={() => markStatus(leadId,"not_done",{userMobile:mob,userName:name2})} />
                          <ActionBtn label="Details" icon={<IcNote />} color="#6366f1" active={isOpen} disabled={false} onClick={() => { const next=isOpen?null:leadId; setExpandedCard(next); if(next&&(type==="early"||type==="renewal")) fetchSubHistory(mob); }} />
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={colCount} style={{ padding:0, background:"var(--p-card2)", borderBottom:"1px solid var(--p-border)" }}>
                          {renderDetailPanel(leadId, mob, name2, type, !isNew?item:null, false)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <Paginator total={currentList.length} page={currentPage} perPage={PER_PAGE}
          onChange={(p) => { setPage(activeTab, p); setExpandedCard(null); window.scrollTo({ top:0, behavior:"smooth" }); }} />
      </>
    );
  };

  const isFollowupTab = activeTab === "followup";

  return (
    <div style={{ padding:"24px 20px 60px", fontFamily:"'DM Sans','Segoe UI',sans-serif", maxWidth:1000, margin:"0 auto" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:22, fontWeight:800, color:"var(--p-text)", display:"flex", alignItems:"center", gap:8 }}>
            <IcTarget /> Lead Management
          </h2>
          <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--p-text-3)" }}>
            {coupon && <>Coupon: <strong style={{ color:"#a5b4fc" }}>{coupon.code}</strong></>}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {[
            { color:"#6366f1", count: newUsers.length,  label:"New" },
            { color:"#f59e0b", count: renewals.length,  label:"Renewal" },
            { color:"#ef4444", count: earlyExp.length,  label:"Early" },
          ].map(({ color, count, label }) => (
            <span key={label} style={{ padding:"5px 12px", background:color+"20", border:`1px solid ${color}40`, borderRadius:20, color, fontSize:12, fontWeight:700 }}>
              {count} {label}
            </span>
          ))}
          {overdueFollowUps > 0 && (
            <span style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"#ef444420", border:"1px solid #ef444440", borderRadius:20, color:"#ef4444", fontSize:12, fontWeight:700, animation:"pulse 1.5s ease-in-out infinite" }}>
              <IcAlert /> {overdueFollowUps} Overdue
            </span>
          )}
        </div>
      </div>

      {/* ── Date Filter ─────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"flex-end", gap:14, flexWrap:"wrap", marginBottom:14, background:"var(--p-card)", border:"1px solid var(--p-border)", borderRadius:12, padding:"14px 18px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <label style={{ fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>From Date</label>
          <input type="date" value={leadFromDate} max={leadToDate || undefined}
            onChange={(e) => { setLeadFromDate(e.target.value); setPage("new",1); setPage("renewal",1); setPage("early",1); setPage("followup",1); }}
            style={{ padding:"8px 12px", background:"var(--p-bg)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text)", fontSize:13, outline:"none", fontFamily:"inherit" }}
          />
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          <label style={{ fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>To Date</label>
          <input type="date" value={leadToDate} min={leadFromDate || undefined}
            onChange={(e) => { setLeadToDate(e.target.value); setPage("new",1); setPage("renewal",1); setPage("early",1); setPage("followup",1); }}
            style={{ padding:"8px 12px", background:"var(--p-bg)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text)", fontSize:13, outline:"none", fontFamily:"inherit" }}
          />
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={() => { const t=isoToday(); setLeadFromDate(t); setLeadToDate(t); setPage("new",1); setPage("renewal",1); setPage("early",1); setPage("followup",1); }}
            style={{ padding:"8px 14px", background:"var(--p-bg)", border:"1.5px solid #6366f150", borderRadius:8, color:"#a5b4fc", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Today
          </button>
          <button onClick={() => { const t=new Date(); const w=new Date(t); w.setDate(t.getDate()-6); setLeadFromDate(w.toISOString().slice(0,10)); setLeadToDate(t.toISOString().slice(0,10)); setPage("new",1); setPage("renewal",1); setPage("early",1); setPage("followup",1); }}
            style={{ padding:"8px 14px", background:"var(--p-bg)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text-3)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Last 7 Days
          </button>
          <button onClick={() => { const t=new Date(); const m=new Date(t.getFullYear(),t.getMonth(),1); setLeadFromDate(m.toISOString().slice(0,10)); setLeadToDate(t.toISOString().slice(0,10)); setPage("new",1); setPage("renewal",1); setPage("early",1); setPage("followup",1); }}
            style={{ padding:"8px 14px", background:"var(--p-bg)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text-3)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            This Month
          </button>
          <button onClick={() => { setLeadFromDate(""); setLeadToDate(""); setPage("new",1); setPage("renewal",1); setPage("early",1); setPage("followup",1); }}
            style={{ padding:"8px 14px", background:"var(--p-bg)", border:"1.5px solid var(--p-border)", borderRadius:8, color:"var(--p-text-3)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            All Dates
          </button>
        </div>
        {(leadFromDate || leadToDate) && (
          <span style={{ fontSize:12, color:"var(--p-text-4)", alignSelf:"center" }}>
            {leadFromDate === leadToDate && leadFromDate ? `Showing: ${fmtDate(leadFromDate)}` : `${leadFromDate ? fmtDate(leadFromDate) : "Start"} → ${leadToDate ? fmtDate(leadToDate) : "Now"}`}
          </span>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        {TAB_DEFS.map((t) => {
          const isActive = activeTab === t.id;
          const isRed    = t.id === "followup" && t.count > 0;
          return (
            <button key={t.id} style={{
              display:"flex", alignItems:"center", gap:6, padding:"9px 16px",
              border:"1.5px solid", borderRadius:10, fontSize:13, fontWeight:700,
              cursor:"pointer", transition:"all 0.15s",
              background: isActive ? (isRed ? "#ef4444" : "#6366f1") : "transparent",
              color:       isActive ? "#fff" : isRed ? "#ef4444" : "var(--p-text-3)",
              borderColor: isActive ? (isRed ? "#ef4444" : "#6366f1") : isRed ? "#ef444450" : "var(--p-border)",
            }} onClick={() => { setActiveTab(t.id); setPage(t.id, 1); setExpandedCard(null); }}>
              {t.icon} {t.label}
              {t.count > 0 && (
                <span style={{ padding:"1px 7px", borderRadius:20, fontSize:11, fontWeight:800, background: isActive ? "#ffffff30" : "#ef444430", color: isActive ? "#fff" : "#ef4444" }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Early Expiry days filter ────────────────────── */}
      {activeTab === "early" && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, fontWeight:700, color:"var(--p-text-3)" }}>Show expiring in:</span>
          {[1, 2, 3, 7, 14, 30].map((d) => (
            <button key={d} onClick={() => { setEarlyDays(d); setPage("early", 1); }} style={{
              padding:"5px 12px", borderRadius:8, border:"1.5px solid", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
              background: earlyDays === d ? "#ef444420" : "transparent",
              color:      earlyDays === d ? "#ef4444"   : "var(--p-text-3)",
              borderColor:earlyDays === d ? "#ef444460" : "var(--p-border)",
            }}>{d} {d === 1 ? "day" : "days"}</button>
          ))}
          <span style={{ fontSize:11, color:"var(--p-text-4)", marginLeft:4 }}>
            ({earlyExp.filter((s) => { const exp=parseDMY(s.expirydate); if(!exp) return false; const dy=daysFromToday(exp); return dy!==null&&dy>=0&&dy<=earlyDays; }).length} found)
          </span>
        </div>
      )}

      {/* ── Follow-up sub-tabs + search ────────────────────── */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
        {isFollowupTab && (
          <div style={{ display:"flex", background:"var(--p-card)", border:"1px solid var(--p-border)", borderRadius:10, overflow:"hidden", flexShrink:0 }}>
            {[
              { id:"active",    label:"Active",    count: followUpLeads.length,  color:"#6366f1", icon:<IcCalendar /> },
              { id:"completed", label:"Completed", count: completedLeads.length, color:"#10b981", icon:<IcCheckCircleSm /> },
            ].map(({ id, label, count, color, icon }) => {
              const on = followupView === id;
              return (
                <button key={id} style={{
                  padding:"8px 16px", border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
                  background: on ? color : "transparent",
                  color: on ? "#fff" : "var(--p-text-3)",
                  transition:"all 0.15s", display:"flex", alignItems:"center", gap:6,
                }} onClick={() => { setFollowupView(id); setExpandedCard(null); }}>
                  {icon} {label}
                  {count > 0 && (
                    <span style={{ padding:"1px 6px", borderRadius:20, fontSize:10, fontWeight:800, background: on ? "#ffffff40" : color+"30", color: on ? "#fff" : color }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:8, background:"var(--p-card)", border:"1px solid var(--p-border)", borderRadius:10, padding:"8px 14px" }}>
          <span style={{ color:"var(--p-text-3)", flexShrink:0 }}><IcSearch /></span>
          <input style={{ background:"transparent", border:"none", outline:"none", color:"var(--p-text)", fontSize:13, width:"100%", fontFamily:"inherit" }}
            placeholder="Search by name or mobile…"
            value={isFollowupTab ? tabSearch[followupView === "completed" ? "completed" : "followup"] : (tabSearch[activeTab] ?? "")}
            onChange={(e) => {
              if (isFollowupTab) {
                setSearch(followupView === "completed" ? "completed" : "followup", e.target.value);
              } else {
                setSearch(activeTab, e.target.value);
                setPage(activeTab, 1);
              }
            }}
          />
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      {isFollowupTab
        ? followupView === "completed" ? renderFollowupCompleted() : renderFollowupActive()
        : renderNormalTab()
      }

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}`}</style>
    </div>
  );
}

// ── ActionBtn ────────────────────────────────────────────────
function ActionBtn({ label, icon, color, active, disabled, onClick }) {
  return (
    <button style={{
      display:"flex", alignItems:"center", gap:4, padding:"6px 10px", borderRadius:8,
      border:`1px solid ${active ? color : "var(--p-border)"}`,
      background: active ? color + "25" : "transparent",
      color: active ? color : "var(--p-text-3)",
      fontSize:12, fontWeight:600,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      whiteSpace:"nowrap", transition:"all 0.15s",
    }} onClick={disabled ? undefined : onClick}>
      {icon} {label}
    </button>
  );
}

// ── EmptyState ───────────────────────────────────────────────
function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 20px", background:"var(--p-card)", border:"1px dashed var(--p-border)", borderRadius:16, marginTop:16 }}>
      <div style={{ color:"var(--p-text-4)", display:"flex", justifyContent:"center" }}>{icon}</div>
      <p style={{ color:"var(--p-text-3)", marginTop:10, fontSize:14 }}>{text}</p>
    </div>
  );
}

// ── SubscriptionHistoryTable ──────────────────────────────────
const SUB_TABLE_PER_PAGE = 5;
function SubscriptionHistoryTable({ mobile, history }) {
  const [page, setPage] = useState(1);

  if (!history) return (
    <div style={{ padding:"12px 0", color:"var(--p-text-4)", fontSize:12 }}>
      Loading subscription history…
    </div>
  );
  if (history.loading) return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 0", color:"var(--p-text-3)", fontSize:12 }}>
      <div style={{ width:16, height:16, border:"2px solid var(--p-border)", borderTopColor:"#6366f1", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />
      Loading subscription history…
    </div>
  );
  if (!history.data.length) return (
    <div style={{ padding:"12px 16px", background:"var(--p-bg)", border:"1px solid var(--p-border)", borderRadius:10, fontSize:12, color:"var(--p-text-3)" }}>
      No subscription records found for this number.
    </div>
  );

  const total = history.data.length;
  const start = (page - 1) * SUB_TABLE_PER_PAGE;
  const rows  = history.data.slice(start, start + SUB_TABLE_PER_PAGE);

  const fmtINR = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN")}`;
  const fmtD   = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }); }
    catch { return iso; }
  };

  const th = { padding:"8px 10px", fontSize:10, fontWeight:700, color:"var(--p-text-4)", textTransform:"uppercase", letterSpacing:"0.06em", textAlign:"left", borderBottom:"1px solid var(--p-border)", whiteSpace:"nowrap" };
  const td = { padding:"10px 10px", fontSize:12, color:"var(--p-text)", borderBottom:"1px solid var(--p-border)", verticalAlign:"middle" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--p-text-3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>
        Subscription History · {total} record{total !== 1 ? "s" : ""}
      </p>
      <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid var(--p-border)" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", background:"var(--p-bg)" }}>
          <thead>
            <tr>
              <th style={th}>Plan</th>
              <th style={th}>Amount</th>
              <th style={{ ...th, textAlign:"center" }}>Status</th>
              <th style={th}>Purchased</th>
              <th style={th}>Expiry</th>
              <th style={th}>Coupon</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((sub, i) => {
              const isActive  = sub.Active && !sub.Expire;
              const isExpired = sub.Expire;
              const statusColor = isActive ? "#10b981" : isExpired ? "#ef4444" : "#f59e0b";
              const statusLabel = isActive ? "Active" : isExpired ? "Expired" : "Inactive";
              return (
                <tr key={sub.id ?? i} style={{ background: i % 2 === 0 ? "transparent" : "var(--p-card2)" }}>
                  <td style={td}>
                    <span style={{ padding:"2px 8px", borderRadius:6, background:"#6366f115", color:"#a5b4fc", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                      {sub.plan ?? "—"}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight:700, color:"#f59e0b", whiteSpace:"nowrap" }}>{fmtINR(sub.PaymentAmount)}</td>
                  <td style={{ ...td, textAlign:"center" }}>
                    <span style={{ padding:"2px 8px", borderRadius:6, background:statusColor+"20", color:statusColor, fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
                      {statusLabel}
                    </span>
                  </td>
                  <td style={{ ...td, whiteSpace:"nowrap", color:"var(--p-text-2)" }}>{fmtD(sub.PurchaseAt)}</td>
                  <td style={{ ...td, whiteSpace:"nowrap", color: isExpired ? "#ef4444" : "var(--p-text-2)" }}>{sub.expirydate ?? "—"}</td>
                  <td style={{ ...td, fontFamily:"'Space Mono',monospace", fontSize:11, color:"#a5b4fc" }}>{sub.couponApplied ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mini pagination */}
      {total > SUB_TABLE_PER_PAGE && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span style={{ fontSize:11, color:"var(--p-text-4)" }}>
            {start + 1}–{Math.min(start + SUB_TABLE_PER_PAGE, total)} of {total}
          </span>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--p-border)", background:"var(--p-card)", color:"var(--p-text-3)", fontSize:12, cursor:page===1?"not-allowed":"pointer", opacity:page===1?0.4:1 }}>
              ‹ Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(Math.ceil(total / SUB_TABLE_PER_PAGE), p + 1))} disabled={page >= Math.ceil(total / SUB_TABLE_PER_PAGE)}
              style={{ padding:"4px 10px", borderRadius:6, border:"1px solid var(--p-border)", background:"var(--p-card)", color:"var(--p-text-3)", fontSize:12, cursor:page>=Math.ceil(total/SUB_TABLE_PER_PAGE)?"not-allowed":"pointer", opacity:page>=Math.ceil(total/SUB_TABLE_PER_PAGE)?0.4:1 }}>
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
