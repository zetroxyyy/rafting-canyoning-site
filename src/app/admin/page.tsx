/**
 * Admin Dashboard — Revenue-First Layout
 * ────────────────────────────────────────────────────────────────────────────
 * TASK 1: RevenueExportButton (month picker modal) placed in the top-right
 *         header of this page, replacing the plain <a> export link.
 * TASK 2: Default range changed to "today" instead of "month".
 */
import { prisma } from "@/lib/prisma";
import {
  BookOpen, Users, Calendar, TrendingUp,
  AlertCircle, AlertTriangle, Clock, CheckCircle2, XCircle,
  Download, ArrowUpRight, ArrowDownRight, Printer,
} from "lucide-react";
import Link from "next/link";
import { formatJpy } from "@/lib/utils";
import AdminRevenueChart, { type RevenueDay } from "@/components/admin/AdminRevenueChart";
import RevenueExportButton from "@/components/admin/RevenueExportButton";
import PrintButton from "@/components/admin/PrintButton";

// ─── Data fetching ────────────────────────────────────────────────────────────

// ─── Formatting helpers ────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  PENDING:   "badge-amber",
  CONFIRMED: "badge-teal",
  COMPLETED: "badge-green",
  CANCELLED: "badge-red",
  EXPIRED:   "badge-gray",
  CASH_DUE:  "badge-blue",
};

function getDisplayPaymentStatus(status: string, paymentStatus: string): string {
  const s = status.toUpperCase();
  const ps = paymentStatus.toUpperCase();
  if (s === "CANCELLED") {
    if (ps.startsWith("PAID") || ps === "REFUNDED" || ps === "PARTIALLY_REFUNDED") {
      return "REFUNDED";
    }
    return "UNPAID";
  }
  return paymentStatus;
}

function getPaymentBadgeClass(paymentStatus: string): string {
  const ps = paymentStatus.toUpperCase();
  if (ps === "PENDING")             return "badge-amber";
  if (ps === "UNPAID")              return "badge-red";
  if (ps.startsWith("PAID"))        return "badge-green";
  if (ps.startsWith("REFUNDED") || ps === "PARTIALLY_REFUNDED") return "badge-blue";
  if (ps === "PAYMENT_FAILED")      return "badge-red";
  if (ps === "CASH_DUE")            return "badge-blue";
  return "badge-gray";
}

async function getDashboardStats(range: string) {
  const JST_OFFSET = 9 * 60 * 60 * 1000; // 9 hours in ms
  const nowUtc = new Date();
  const nowJst = new Date(nowUtc.getTime() + JST_OFFSET);
  const jstYear = nowJst.getUTCFullYear();
  const jstMonth = nowJst.getUTCMonth();
  const jstDateStr = nowJst.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // JST Today boundaries for timestamp fields (00:00 JST to 23:59:59.999 JST)
  const todayStartJst = new Date(`${jstDateStr}T00:00:00+09:00`);
  const todayEndJst   = new Date(`${jstDateStr}T23:59:59.999+09:00`);

  // JST Today boundary for DB Date-only fields (Prisma maps @db.Date to UTC midnight Date objects)
  const targetDateJst = new Date(`${jstDateStr}T00:00:00.000Z`);

  let startJst: Date;
  switch (range) {
    case "week": {
      const pastJst = new Date(nowJst.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pastJstDateStr = pastJst.toISOString().slice(0, 10);
      startJst = new Date(`${pastJstDateStr}T00:00:00+09:00`);
      break;
    }
    case "month": {
      const monthStartStr = `${jstYear}-${String(jstMonth + 1).padStart(2, "0")}-01`;
      startJst = new Date(`${monthStartStr}T00:00:00+09:00`);
      break;
    }
    default: // today
      startJst = todayStartJst;
  }

  // For comparison: same-length period immediately before `startJst`
  const periodMs  = Math.max(nowUtc.getTime() - startJst.getTime(), 1);
  const prevStart = new Date(startJst.getTime() - periodMs);
  const prevEnd   = startJst;

  try {
    const [
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      todayBookings,
      ledgerRevenue,
      prevLedgerRevenue,
      completedRevenue,
      pendingPayments,
      todayManifest,
      dailyPayments,
    ] = await Promise.all([
      prisma.booking.count({ where: { createdAt: { gte: startJst } } }),
      prisma.booking.count({ where: { status: "CONFIRMED",  createdAt: { gte: startJst } } }),
      prisma.booking.count({ where: { status: "PENDING",    createdAt: { gte: startJst } } }),
      prisma.booking.count({ where: { status: "CANCELLED",  createdAt: { gte: startJst } } }),
      // Uses JST today boundary so "Today's Bookings" KPI reflects Japan calendar day
      prisma.booking.count({ where: { createdAt: { gte: todayStartJst, lte: todayEndJst } } }),

      // Current period net revenue from payment ledger
      prisma.bookingPayment.aggregate({
        _sum: { amountJpy: true },
        where: {
          OR: [
            { paidAt:    { gte: startJst } },
            { refundedAt:{ gte: startJst } },
            { createdAt: { gte: startJst } },
          ],
        },
      }),

      // Previous period for trend delta
      prisma.bookingPayment.aggregate({
        _sum: { amountJpy: true },
        where: {
          OR: [
            { paidAt:    { gte: prevStart, lt: prevEnd } },
            { refundedAt:{ gte: prevStart, lt: prevEnd } },
            { createdAt: { gte: prevStart, lt: prevEnd } },
          ],
        },
      }),

      prisma.booking.aggregate({
        _sum: { totalJpy: true },
        where: { status: "COMPLETED", createdAt: { gte: startJst } },
      }),

      // ── "All payments settled" panel ───────────────────────────────────
      // Catches any active booking where payment is not yet collected.
      prisma.booking.findMany({
        where: {
          OR: [
            { paymentStatus: "UNPAID"  },
            { paymentStatus: "PENDING" },
          ],
          status: { in: ["CONFIRMED", "PENDING", "CASH_DUE"] },
        },
        take: 5,
        orderBy: { createdAt: "asc" },
        include: { slot: { select: { date: true } } },
      }),

      // ── "Today's Manifest" panel ──────────────────────────────────────
      // Uses JST-correct targetDateJst so the panel reflects the actual Japan calendar day.
      prisma.booking.findMany({
        where: {
          slot: { date: targetDateJst },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        orderBy: [{ slot: { startTime: "asc" } }],
        include: {
          product: { select: { nameEn: true, activityType: true } },
          slot:    { select: { startTime: true } },
        },
      }),

      // Daily aggregation for the chart
      prisma.bookingPayment.findMany({
        where: {
          OR: [
            { paidAt:    { gte: startJst, lte: nowUtc } },
            { refundedAt:{ gte: startJst, lte: nowUtc } },
            { createdAt: { gte: startJst, lte: nowUtc } },
          ],
        },
        select: {
          amountJpy:  true,
          paidAt:     true,
          refundedAt: true,
          createdAt:  true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // ── Build daily revenue buckets for the chart ─────────────────────────
    const buckets: Record<string, number> = {};
    const totalDays = range === "today" ? 1 : range === "week" ? 7 : nowJst.getUTCDate();

    for (let d = 0; d < totalDays; d++) {
      const day = new Date(startJst.getTime() + d * 24 * 60 * 60 * 1000 + JST_OFFSET);
      const key = `${(day.getUTCMonth() + 1).toString().padStart(2, "0")}/${day.getUTCDate().toString().padStart(2, "0")}`;
      buckets[key] = 0;
    }

    for (const payment of dailyPayments) {
      const ts  = payment.paidAt ?? payment.refundedAt ?? payment.createdAt;
      const tsJst = new Date(ts.getTime() + JST_OFFSET);
      const key = `${(tsJst.getUTCMonth() + 1).toString().padStart(2, "0")}/${tsJst.getUTCDate().toString().padStart(2, "0")}`;
      if (key in buckets) {
        buckets[key] = (buckets[key] ?? 0) + payment.amountJpy;
      }
    }

    const chartData: RevenueDay[] = Object.entries(buckets).map(([date, net]) => ({ date, net }));

    const paidRevenue  = ledgerRevenue._sum.amountJpy ?? 0;
    const prevRevenue  = prevLedgerRevenue._sum.amountJpy ?? 0;
    const revenueDelta = prevRevenue !== 0
      ? Math.round(((paidRevenue - prevRevenue) / Math.abs(prevRevenue)) * 100)
      : null;

    return {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      todayBookings,
      paidRevenue,
      prevRevenue,
      revenueDelta,
      completedRevenue: completedRevenue._sum.totalJpy ?? 0,
      pendingPayments,
      todayManifest,
      chartData,
    };
  } catch (err) {
    console.error("[getDashboardStats] failed", err);
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ range?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  // TASK 2: default is now "today", not "month"
  const range  = params.range ?? "today";
  const stats  = await getDashboardStats(range);

  const rangeLabel: Record<string, string> = {
    today: "Today",
    week:  "Last 7 Days",
    month: "This Month",
  };

  // ── KPI cards config ──────────────────────────────────────────────────────
  const kpiCards = stats ? [
    {
      label:     "Net Revenue",
      value:     formatJpy(stats.paidRevenue),
      icon:      TrendingUp,
      iconBg:    "rgba(13,148,136,0.08)",
      iconColor: "#0d9488",
      delta:     stats.revenueDelta,
      primary:   true,
    },
    {
      label:     "Total Bookings",
      value:     stats.totalBookings.toLocaleString(),
      icon:      BookOpen,
      iconBg:    "rgba(59,130,246,0.08)",
      iconColor: "#3b82f6",
      delta:     null,
      primary:   false,
    },
    {
      label:     "Confirmed",
      value:     stats.confirmedBookings.toLocaleString(),
      icon:      CheckCircle2,
      iconBg:    "rgba(34,197,94,0.08)",
      iconColor: "#22c55e",
      delta:     null,
      primary:   false,
    },
    {
      label:     "Today's Bookings",
      value:     stats.todayBookings.toLocaleString(),
      icon:      Calendar,
      iconBg:    "rgba(245,158,11,0.08)",
      iconColor: "#f59e0b",
      delta:     null,
      primary:   false,
    },
  ] : [];

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">Revenue Dashboard</h2>
          <p className="text-sm text-stone-400 mt-0.5 font-medium">
            Dream Adventure Operations · {rangeLabel[range] ?? "Custom"}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range pills */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: "rgba(13,148,136,0.06)", border: "1px solid rgba(13,148,136,0.10)" }}
          >
            {(["today", "week", "month"] as const).map((r) => (
              <Link
                key={r}
                href={`/admin?range=${r}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                style={
                  range === r
                    ? { background: "#0d9488", color: "white", boxShadow: "0 2px 8px rgba(13,148,136,0.30)" }
                    : { color: "#78716c" }
                }
              >
                {r === "today" ? "Today" : r === "week" ? "7 Days" : "Month"}
              </Link>
            ))}
          </div>

          {/*
            TASK 1: RevenueExportButton (month picker modal) replaces the plain
            <a href="/api/admin/export/revenue"> link that was here before.
            The button opens a modal where the admin selects a specific month +
            year, then calls /api/admin/export/revenue?year=…&month=… with those
            exact params. This is the correct semantic home for this action.
          */}
          <RevenueExportButton />
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {!stats ? (
        <div
          className="card p-12 text-center"
          style={{ borderColor: "rgba(251,191,36,0.3)", background: "#fffbeb" }}
        >
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-amber-400" />
          <p className="text-stone-600 font-medium">Database not connected</p>
          <p className="text-stone-400 text-sm mt-1">Check your DATABASE_URL environment variable.</p>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            {kpiCards.map((card, i) => (
              <div
                key={i}
                className="card p-5"
                style={
                  card.primary
                    ? {
                        background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
                        borderColor: "rgba(13,148,136,0.18)",
                      }
                    : {
                        background: "linear-gradient(135deg, #ffffff 0%, #fafaf9 100%)",
                        borderColor: "rgba(0,0,0,0.06)",
                        boxShadow:  "0 1px 4px 0 rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
                      }
                }
              >
                <div className="flex items-start justify-between mb-4">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em]">
                    {card.label}
                  </p>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: card.iconBg }}
                  >
                    <card.icon className="w-4 h-4" style={{ color: card.iconColor }} />
                  </div>
                </div>

                <p
                  className="text-2xl font-extrabold tracking-tight"
                  style={{ color: card.primary ? "#0d9488" : "#1c1917", letterSpacing: "-0.03em" }}
                >
                  {card.value}
                </p>

                {card.delta !== null && (
                  <div className="flex items-center gap-1 mt-2">
                    {card.delta >= 0 ? (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[11px] font-semibold text-emerald-600">
                          +{card.delta}% vs prev period
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-[11px] font-semibold text-red-500">
                          {card.delta}% vs prev period
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Secondary stats strip ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
            {[
              { label: "Pending",           value: stats.pendingBookings,            icon: Clock,      color: "#d97706" },
              { label: "Cancelled",         value: stats.cancelledBookings,          icon: XCircle,    color: "#ef4444" },
              { label: "Completed Revenue", value: formatJpy(stats.completedRevenue), icon: TrendingUp, color: "#0d9488" },
            ].map((c, i) => (
              <div
                key={i}
                className="card p-4 flex items-center gap-4"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #fafaf9 100%)",
                  borderColor: "rgba(0,0,0,0.06)",
                  boxShadow:  "0 1px 4px 0 rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${c.color}14` }}
                >
                  <c.icon className="w-4 h-4" style={{ color: c.color }} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em]">{c.label}</p>
                  <p className="font-bold text-stone-900 text-base mt-0.5">
                    {typeof c.value === "number" ? c.value.toLocaleString() : c.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Revenue Chart ────────────────────────────────────────────── */}
          <div className="card p-6 print:hidden">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em] mb-1">
                  Net Revenue
                </p>
                <p
                  className="text-2xl font-extrabold text-stone-900 tracking-tight"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {formatJpy(stats.paidRevenue)}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {rangeLabel[range] ?? "Period"} · {stats.chartData.length} day{stats.chartData.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                style={{ background: "rgba(13,148,136,0.08)", color: "#0d9488" }}
              >
                ¥ JPY
              </div>
            </div>

            {/* Recharts Area Chart — client component */}
            <AdminRevenueChart data={stats.chartData} height={220} />
          </div>

          {/* ── Bottom panels — Today's Manifest + Pending Payments ──────── */}
          <div className="grid lg:grid-cols-2 gap-4 print:grid-cols-1 print:gap-0">

            {/* Today's Manifest */}
            {stats.todayManifest.length > 0 ? (
              <div className="card p-6 print:border-none print:shadow-none print:p-0">
                <div className="flex items-center justify-between mb-5 print:mb-2">
                  <div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em] mb-0.5 print:text-[14px] print:text-black">
                      Today&apos;s Manifest
                    </p>
                    <p className="font-semibold text-stone-900 print:text-[12px] print:text-stone-500">
                      {stats.todayManifest.length} booking{stats.todayManifest.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <PrintButton />
                    <Link
                      href="/admin/bookings"
                      className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 transition-colors"
                    >
                      All <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse" style={{ minWidth: "700px" }}>
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] font-bold text-stone-400 uppercase tracking-wider print:text-black print:border-black">
                        <th className="py-3 px-4 print:py-2 whitespace-nowrap">Time</th>
                        <th className="py-3 px-4 print:py-2 whitespace-nowrap">Activity</th>
                        <th className="py-3 px-4 print:py-2 whitespace-nowrap">Reference</th>
                        <th className="py-3 px-4 print:py-2 whitespace-nowrap">Lead Guest</th>
                        <th className="py-3 px-4 text-center print:py-2 whitespace-nowrap">Pax</th>
                        <th className="py-3 px-4 print:py-2 whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 print:py-2 whitespace-nowrap">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-sm print:divide-stone-300">
                      {stats.todayManifest.map((b) => (
                        <tr
                          key={b.id}
                          className="hover:bg-teal-50/40 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-teal-600 print:text-black print:py-2 whitespace-nowrap">
                            {b.slot?.startTime ?? "—"}
                          </td>
                          <td className="py-3.5 px-4 print:py-2 whitespace-nowrap">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md print:border print:border-stone-400"
                              style={{ background: "rgba(13,148,136,0.08)", color: "#0f766e" }}
                            >
                              {b.product.activityType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs font-bold text-stone-600 print:text-black print:py-2 whitespace-nowrap">
                            <Link href={`/admin/bookings/${b.id}`} className="hover:underline print:pointer-events-none">
                              {b.reference}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-stone-800 print:text-black print:py-2 whitespace-nowrap">
                            {b.leadName}
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-stone-700 print:text-black print:py-2 whitespace-nowrap">
                            {b.adultCount + b.childCount}
                          </td>
                          <td className="py-3.5 px-4 print:py-2 whitespace-nowrap">
                            <span className={`badge ${STATUS_BADGE[b.status] ?? "badge-gray"} text-[10px] print:text-black print:border print:border-stone-400`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 print:py-2 whitespace-nowrap">
                            <span className={`badge ${getPaymentBadgeClass(getDisplayPaymentStatus(b.status, b.paymentStatus))} text-[10px] print:text-black print:border print:border-stone-400`}>
                              {getDisplayPaymentStatus(b.status, b.paymentStatus)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className="card p-6 flex flex-col items-center justify-center text-center"
                style={{ minHeight: "200px" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(13,148,136,0.06)" }}
                >
                  <Calendar className="w-6 h-6" style={{ color: "#0d9488", opacity: 0.5 }} />
                </div>
                <p className="font-semibold text-stone-500">No bookings today</p>
                <p className="text-xs text-stone-400 mt-1">
                  The manifest will populate once bookings are confirmed for today.
                </p>
              </div>
            )}

            {/* Pending Payments */}
            {stats.pendingPayments.length > 0 ? (
              <div
                className="card p-6"
                style={{ borderLeft: "3px solid #f59e0b" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                      <p className="text-[11px] font-bold text-amber-600 uppercase tracking-[0.07em] mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        Pending Payments
                      </p>
                    <p className="font-semibold text-stone-900">{stats.pendingPayments.length} awaiting</p>
                  </div>
                  <Link
                    href="/admin/bookings?paymentStatus=UNPAID"
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 transition-colors"
                  >
                    View all <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-1">
                  {stats.pendingPayments.map((b) => (
                    <Link
                      key={b.id}
                      href={`/admin/bookings/${b.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 hover:bg-amber-50/60"
                    >
                      <span className="font-mono text-sm font-bold" style={{ color: "#0d9488" }}>
                        {b.reference}
                      </span>
                      <span className="text-xs font-medium text-stone-400 tabular-nums">
                        {b.slot?.date
                          ? (b.slot.date instanceof Date
                            ? b.slot.date
                            : new Date(b.slot.date as string)
                          ).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
                          : "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="card p-6 flex flex-col items-center justify-center text-center"
                style={{ minHeight: "200px" }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "rgba(34,197,94,0.06)" }}
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" style={{ opacity: 0.6 }} />
                </div>
                <p className="font-semibold text-stone-500">All payments settled</p>
                <p className="text-xs text-stone-400 mt-1">No unpaid bookings require attention.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
