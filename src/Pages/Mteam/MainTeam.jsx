import React, { useState, useCallback } from "react";
import MarketingTeam from "./Marketingteam";
import CouponCodeManager from "./CouponCodeManager";

const TABS = [
  {
    id: "marketing",
    label: "Marketing Team",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    component: MarketingTeam,
  },
  {
    id: "coupons",
    label: "Coupon Manager",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    component: CouponCodeManager,
  },
];

export default function MainTeam() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  const handleTabChange = useCallback((id) => {
    setActiveTab(id);
  }, []);

  const ActiveComponent = TABS.find((t) => t.id === activeTab)?.component;

  return (
    <>
      <style>{`
        .mt-root {
          min-height: 100vh;
          background: #ffffff;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          color: #e8eaf0;
        }

        /* ── Tab Bar ── */
        .mt-tabbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0 24px;
          display: flex;
          align-items: stretch;
          gap: 4px;
        }

        .mt-tab {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px 14px;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: 0.01em;
          color: #6b7280;
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s ease;
          white-space: nowrap;
          outline: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }

        .mt-tab:hover {
          color: #c4c8d4;
        }

        .mt-tab.active {
          color: #f97316;
          border-bottom-color: #f97316;
        }

        .mt-tab .mt-tab-icon {
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .mt-tab.active .mt-tab-icon,
        .mt-tab:hover .mt-tab-icon {
          opacity: 1;
        }

        /* ── Badge (optional count) ── */
        .mt-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 700;
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
          transition: background 0.2s;
        }

        .mt-tab:not(.active) .mt-badge {
          background: rgba(255,255,255,0.07);
          color: #6b7280;
        }

        /* ── Panel ── */
        .mt-panel {
          animation: mt-fadein 0.22s ease both;
        }

        @keyframes mt-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Focus ring for accessibility ── */
        .mt-tab:focus-visible {
          outline: 2px solid #f97316;
          outline-offset: -2px;
          border-radius: 4px;
        }
      `}</style>

      <div className="mt-root">
        {/* Tab Navigation */}
        <nav className="mt-tabbar" role="tablist" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`mt-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="mt-tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Panel */}
        <div
          key={activeTab}
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          className="mt-panel"
        >
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </>
  );
}