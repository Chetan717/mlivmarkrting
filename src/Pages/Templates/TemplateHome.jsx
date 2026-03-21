import { useState, useCallback, useMemo,useEffect } from "react";
import { useNavigate } from "react-router";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../Firebase";
import HomeList, { Pagination } from "./TempHome";
import {
  CirclePlus,
  ArrowRotateRight,
  TriangleThunderbolt,
  Folder,
  Magnifier,
  ChevronDown,
} from "@gravity-ui/icons";
import { MAIN_TYPES } from "./Constant";

const PAGE_SIZE = 12;

// ── Count stat card ───────────────────────────────────────────────────────────
function CountCard({ label, count, color }) {
  const styles = {
    violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-100 dark:border-violet-500/20",
    sky:    "bg-sky-50    dark:bg-sky-500/10    text-sky-700    dark:text-sky-400    border-sky-100    dark:border-sky-500/20",
    gray:   "bg-gray-50   dark:bg-gray-800/60   text-gray-700   dark:text-gray-300   border-gray-200   dark:border-gray-700",
  };
  return (
    <div className={`flex flex-col items-center justify-center px-5 py-4 rounded-2xl border ${styles[color]} flex-shrink-0`}>
      <span className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>{count}</span>
      <span className="text-xs font-medium mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-28 bg-gray-200 dark:bg-gray-700" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TemplateHome() {
  const navigate = useNavigate();

  const [allTemplates, setAllTemplates] = useState([]);
  const [fetched,      setFetched]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [deletingId,   setDeletingId]   = useState(null);

  // Filters
  const [filterType,   setFilterType]   = useState(""); // "" | "MLM" | "General"
  const [search,       setSearch]       = useState("");
  const [currentPage,  setCurrentPage]  = useState(1);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "mlmtemplate"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllTemplates(data);
      setFetched(true);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      setError("Failed to load templates. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

    useEffect(() => {
      fetchTemplates()
    }, [fetchTemplates]);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    total:   allTemplates.length,
    mlm:     allTemplates.filter((t) => t.MainType === "MLM").length,
    general: allTemplates.filter((t) => t.MainType === "General").length,
  }), [allTemplates]);

  // ── Filtered + paginated ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allTemplates;
    if (filterType) list = list.filter((t) => t.MainType === filterType);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.SelectType || "").toLowerCase().includes(q) ||
          (t.MainType   || "").toLowerCase().includes(q) ||
          String(t.serial || "").includes(q)
      );
    }
    return list;
  }, [allTemplates, filterType, search]);

  const totalPages   = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered]);
  const paginated    = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset page when filter/search changes
  const handleFilterType = useCallback((val) => { setFilterType(val); setCurrentPage(1); }, []);
  const handleSearch     = useCallback((e)   => { setSearch(e.target.value); setCurrentPage(1); }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "mlmtemplate", id));
      setAllTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleEdit = useCallback((id) => navigate(`/templates/edit/${id}`), [navigate]);

  const isFiltered = !!(filterType || search.trim());

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Templates
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage MLM & General templates</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ArrowRotateRight className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : fetched ? "Refresh" : "Refresh"}
          </button>

          <button
            onClick={() => navigate("/templates/add")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-violet-500/20"
          >
            <CirclePlus className="w-4 h-4" />
            Add Template
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          <TriangleThunderbolt className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={fetchTemplates} className="ml-auto text-xs font-semibold underline underline-offset-2">Retry</button>
        </div>
      )}

      {/* ── Not fetched yet ── */}
      {!loading && !fetched && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-4">
            <Folder className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No data loaded yet</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            Click <span className="font-semibold text-violet-500">Fetch Templates</span> to load templates from Firestore.
          </p>
        </div>
      )}

      {/* ── After fetch ── */}
      {fetched && (
        <>
          {/* Count cards */}
          <div className="flex items-center gap-3 flex-wrap">
            <CountCard label="Total"   count={counts.total}   color="gray"   />
            <CountCard label="MLM"     count={counts.mlm}     color="violet" />
            <CountCard label="General" count={counts.general} color="sky"    />
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Magnifier className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Search by type, serial…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
              />
            </div>

            {/* Main type filter */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => handleFilterType(e.target.value)}
                className="pl-4 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all appearance-none cursor-pointer"
              >
                <option value="">All Types</option>
                {MAIN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            {/* Result count */}
            <span className="text-sm text-gray-400 dark:text-gray-500 flex-shrink-0">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              {totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}
            </span>
          </div>
        </>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {[...Array(PAGE_SIZE)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Template list ── */}
      {!loading && fetched && (
        <>
          <HomeList
            templates={paginated}
            onEdit={handleEdit}
            onDelete={handleDelete}
            deletingId={deletingId}
            filtered={isFiltered}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}