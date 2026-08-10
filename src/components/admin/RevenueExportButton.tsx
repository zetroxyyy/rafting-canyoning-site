"use client";

/**
 * RevenueExportButton
 *
 * A professional admin toolbar button that opens a compact month/year picker
 * modal before triggering the revenue CSV download.
 *
 * Design:
 *  - Uses a Lucide FileSpreadsheet icon (no emojis).
 *  - Modal is inline (no external library) with a clean card aesthetic.
 *  - Month/year selects default to the current calendar month.
 *  - On "Download", navigates to /api/admin/export/revenue?year=…&month=…
 *    which streams the CSV as an attachment — no client-side blob needed.
 *  - Pressing Escape or clicking the backdrop dismisses the modal.
 */

import { useState, useEffect } from "react";
import { FileSpreadsheet, X, Download } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Generate a range of years: 3 years back → current year
function yearRange(): number[] {
  const current = new Date().getUTCFullYear();
  return Array.from({ length: 4 }, (_, i) => current - 3 + i);
}

export default function RevenueExportButton() {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear]   = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1); // 1-indexed

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleDownload = () => {
    const url = `/api/admin/export/revenue?year=${year}&month=${month}`;
    // Navigate directly — browser will trigger the download automatically
    // because the API responds with Content-Disposition: attachment
    window.location.href = url;
    setOpen(false);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        id="admin-revenue-export"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-sm flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-1"
        style={{ borderColor: "var(--color-teal-400)", color: "var(--color-teal-700)" }}
        title="Export monthly revenue as CSV"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Monthly Revenue
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Modal card */}
          <div
            className="card p-6 w-full max-w-sm mx-4 relative animate-in fade-in zoom-in-95 duration-150"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" style={{ color: "var(--color-teal-600)" }} />
                <h3 className="font-semibold text-stone-900 text-sm">Export Monthly Revenue</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors rounded-full p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-300"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month + Year selectors */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label text-xs mb-1 block">Month</label>
                <select
                  id="revenue-export-month"
                  className="input text-sm"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs mb-1 block">Year</label>
                <select
                  id="revenue-export-year"
                  className="input text-sm"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {yearRange().map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview label */}
            <p className="text-xs text-stone-500 mb-5">
              Downloads <span className="font-medium text-stone-700">
                revenue-{year}-{String(month).padStart(2, "0")}.csv
              </span> — all payment transactions for{" "}
              <span className="font-medium text-stone-700">
                {MONTH_NAMES[month - 1]} {year}
              </span>.
            </p>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="btn btn-outline btn-sm text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-stone-300"
              >
                Cancel
              </button>
              <button
                id="revenue-export-download"
                onClick={handleDownload}
                className="btn btn-sm text-xs flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400/60"
                style={{
                  background: "linear-gradient(135deg, var(--color-teal-600) 0%, var(--color-teal-700) 100%)",
                  color: "white",
                  border: "none",
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
