/**
 * SkeletonTable — Zero-layout-shift shimmer skeleton for AdminBookingsTable.
 *
 * Structural strategy:
 *  - Uses a real <table> with <colgroup> so column widths are governed by the
 *    same CSS layout engine as the real table. This is the only way to get
 *    zero layout shift — div-based flex skeletons always drift from table columns.
 *  - All padding values (1rem / 1.125rem) mirror .admin-table th/td exactly.
 *  - The header row background + border matches .admin-table thead tr.
 *  - The Guest column (col 1) renders a taller skeleton (8-row height) to match
 *    the real two-line name+email cell.
 *  - Row opacity fades from 1.0 → 0.35 to feel organic, not mechanical.
 *  - animationDelay staggers per row so the shimmer wave runs top-to-bottom.
 */

// Column definitions — (label for docs, pixel width for colgroup, content type)
const COLS = [
  { label: "Reference",  width: 88,  type: "pill"   },   // mono badge ~w-20
  { label: "Guest",      width: 176, type: "double" },   // name + email stacked
  { label: "Activity",   width: 88,  type: "pill"   },   // activity badge
  { label: "Date·Time",  width: 120, type: "text"   },   // mono date string
  { label: "Pax",        width: 40,  type: "text"   },   // single number
  { label: "Total",      width: 80,  type: "text"   },   // ¥XX,XXX
  { label: "Status",     width: 96,  type: "pill"   },   // badge pill
  { label: "Payment",    width: 128, type: "pill"   },   // badge pill (long)
  { label: "Source",     width: 72,  type: "text"   },   // WEB / MANUAL
] as const;

const ROW_COUNT = 8;

// Widths for the skeleton bar inside each cell type
const CONTENT_WIDTHS: Record<string, string> = {
  pill:   "65%",
  text:   "70%",
  double: "75%",
};

export default function SkeletonTable() {
  return (
    <div className="card overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table
          style={{
            width: "100%",
            minWidth: "760px",
            borderCollapse: "collapse",
            fontSize: "0.875rem",
          }}
        >
          {/* colgroup pins the exact same widths as the real table's layout */}
          <colgroup>
            {COLS.map((col) => (
              <col key={col.label} style={{ width: `${col.width}px` }} />
            ))}
          </colgroup>

          {/* Header — mirrors .admin-table thead tr */}
          <thead>
            <tr
              style={{
                borderBottom: "1.5px solid rgba(13,148,136,0.10)",
                background: "rgba(240,253,250,0.6)",
              }}
            >
              {COLS.map((col) => (
                <th
                  key={col.label}
                  style={{ padding: "1rem 1.125rem", textAlign: "left" }}
                >
                  <div
                    className="skeleton"
                    style={{
                      height: "10px",
                      borderRadius: "4px",
                      width: CONTENT_WIDTHS[col.type] ?? "60%",
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>

          {/* Body rows — mirrors .admin-table td */}
          <tbody>
            {Array.from({ length: ROW_COUNT }).map((_, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  borderBottom: rowIdx < ROW_COUNT - 1
                    ? "1px solid rgba(0,0,0,0.04)"
                    : "none",
                  opacity: Math.max(0.35, 1 - rowIdx * 0.085),
                }}
              >
                {COLS.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    style={{ padding: "1rem 1.125rem", verticalAlign: "middle" }}
                  >
                    {col.type === "double" ? (
                      // Two-line cell: name (bold) + email (muted)
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div
                          className="skeleton"
                          style={{
                            height: "13px",
                            borderRadius: "4px",
                            width: "80%",
                            animationDelay: `${rowIdx * 70}ms`,
                          }}
                        />
                        <div
                          className="skeleton"
                          style={{
                            height: "10px",
                            borderRadius: "4px",
                            width: "60%",
                            animationDelay: `${rowIdx * 70 + 35}ms`,
                          }}
                        />
                      </div>
                    ) : col.type === "pill" ? (
                      // Badge pill shape
                      <div
                        className="skeleton"
                        style={{
                          height: "22px",
                          borderRadius: "9999px",
                          width: CONTENT_WIDTHS[col.type],
                          animationDelay: `${rowIdx * 70}ms`,
                        }}
                      />
                    ) : (
                      // Plain text line
                      <div
                        className="skeleton"
                        style={{
                          height: "12px",
                          borderRadius: "4px",
                          width: CONTENT_WIDTHS[col.type],
                          animationDelay: `${rowIdx * 70}ms`,
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
