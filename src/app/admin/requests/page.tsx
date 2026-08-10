/**
 * Admin Requests Dashboard — Enterprise Polish
 *
 * UI upgrades:
 *  1. Stats cards: icon containers changed from `rounded-full` → `rounded-xl`
 *     to match the global design language (dashboard KPI cards, toolbar icons).
 *  2. Tab navigation: upgraded from border-bottom underline tabs to pill-style
 *     segmented control (same visual language as the dashboard range picker).
 *  3. Stats row: added hover state + transition to each card.
 *  4. Empty state (All Requests tab): richer illustration treatment.
 *  5. Pagination: consistent btn-outline btn-sm with proper gap alignment.
 *  6. Header: added subtitle with better muted typography.
 */
import { getPendingRequests, getAllRequests } from "@/lib/services/bookingRequests";
import AdminRequestCard from "@/components/admin/AdminRequestCard";
import { Clock, CheckCircle, XCircle, RefreshCcw, Inbox } from "lucide-react";
import Link from "next/link";
import type { SerializedRequest } from "@/components/admin/AdminRequestCard";
import AutoMarkRead from "@/components/admin/AutoMarkRead";

interface Props {
  searchParams: Promise<{ page?: string; tab?: string }>;
}

function serializeRequest(r: Awaited<ReturnType<typeof getPendingRequests>>[0]): SerializedRequest {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    rejectedAt: r.rejectedAt?.toISOString() ?? null,
    finalizedAt: r.finalizedAt?.toISOString() ?? null,
    booking: {
      ...r.booking,
      slot: r.booking.slot
        ? {
            ...r.booking.slot,
            date: r.booking.slot.date.toISOString().slice(0, 10),
          }
        : null,
    },
  };
}

export default async function AdminRequestsPage({ searchParams }: Props) {
  const params   = await searchParams;
  const tab      = params.tab === "all" ? "all" : "pending";
  const page     = Math.max(1, parseInt(params.page ?? "1"));

  const pendingRaw = await getPendingRequests();
  const allResult  = tab === "all" ? await getAllRequests(page, 30) : null;

  const pending     = pendingRaw.map(serializeRequest);
  const allRequests = allResult
    ? { ...allResult, requests: allResult.requests.map(serializeRequest) }
    : null;

  const cancellationCount = pending.filter((r) => r.type === "CANCELLATION").length;
  const rescheduleCount   = pending.filter((r) => r.type === "RESCHEDULE").length;

  return (
    <div className="space-y-6">
      {/* Auto-mark request notifications read when admin visits this page */}
      <AutoMarkRead category="requests" />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">Guest Requests</h2>
          <p className="text-sm text-stone-400 mt-0.5 font-medium">
            Review and action cancellation and reschedule requests
          </p>
        </div>
      </div>

      {/* ── Stats row — POLISH: icon containers standardized to rounded-xl ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Pending */}
        <div className="card p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-md">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(217,119,6,0.10)" }}
          >
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p
              className="text-2xl font-extrabold text-stone-900 leading-none tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              {pending.length}
            </p>
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em] mt-1">
              Pending Review
            </p>
          </div>
          {pending.length > 0 && (
            <div className="ml-auto">
              <span
                className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold text-white px-1.5"
                style={{ background: "#d97706" }}
              >
                {pending.length}
              </span>
            </div>
          )}
        </div>

        {/* Cancellations */}
        <div className="card p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-md">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(239,68,68,0.10)" }}
          >
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p
              className="text-2xl font-extrabold text-stone-900 leading-none tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              {cancellationCount}
            </p>
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em] mt-1">
              Cancellations
            </p>
          </div>
        </div>

        {/* Reschedules */}
        <div className="card p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-md">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(59,130,246,0.10)" }}
          >
            <RefreshCcw className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p
              className="text-2xl font-extrabold text-stone-900 leading-none tracking-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              {rescheduleCount}
            </p>
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em] mt-1">
              Reschedules
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab navigation — POLISH: pill segmented control ── */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl self-start"
        style={{
          background: "rgba(13,148,136,0.06)",
          border: "1px solid rgba(13,148,136,0.10)",
          width: "fit-content",
        }}
      >
        <Link
          href="/admin/requests"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
          style={
            tab === "pending"
              ? { background: "#0d9488", color: "white", boxShadow: "0 2px 8px rgba(13,148,136,0.30)" }
              : { color: "#78716c" }
          }
        >
          Pending Review
          {pending.length > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
              style={
                tab === "pending"
                  ? { background: "rgba(255,255,255,0.25)", color: "white" }
                  : { background: "#d97706", color: "white" }
              }
            >
              {pending.length}
            </span>
          )}
        </Link>
        <Link
          href="/admin/requests?tab=all"
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
          style={
            tab === "all"
              ? { background: "#0d9488", color: "white", boxShadow: "0 2px 8px rgba(13,148,136,0.30)" }
              : { color: "#78716c" }
          }
        >
          All Requests
        </Link>
      </div>

      {/* ── Pending tab ── */}
      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
            <div className="card p-14 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(13,148,136,0.06)" }}
              >
                <CheckCircle className="w-7 h-7 text-teal-500" style={{ opacity: 0.7 }} />
              </div>
              <p className="font-semibold text-stone-700 text-base">All clear!</p>
              <p className="text-stone-400 text-sm mt-1 max-w-xs mx-auto">
                No pending guest requests to review. Great work keeping up.
              </p>
              <Link
                href="/admin/requests?tab=all"
                className="btn btn-outline btn-sm mt-5 inline-flex"
              >
                View request history
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <AdminRequestCard key={r.id} request={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── All requests tab ── */}
      {tab === "all" && allRequests && (
        <div className="space-y-4">
          <p className="text-sm text-stone-400 font-medium">
            {allRequests.total} total request{allRequests.total !== 1 ? "s" : ""}
          </p>

          {allRequests.requests.length === 0 ? (
            <div className="card p-12 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(0,0,0,0.04)" }}
              >
                <Inbox className="w-6 h-6 text-stone-300" />
              </div>
              <p className="text-stone-500 font-medium">No requests yet</p>
              <p className="text-stone-400 text-sm mt-1">
                Guest cancellation and reschedule requests will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRequests.requests.map((r) => (
                <AdminRequestCard key={r.id} request={r} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {allRequests.total > 30 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-stone-400">
                Page {page} of {Math.ceil(allRequests.total / 30)}
                <span className="text-stone-300 mx-1.5">·</span>
                {allRequests.total} total
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/requests?tab=all&page=${page - 1}`}
                    className="btn btn-outline btn-sm"
                  >
                    Previous
                  </Link>
                )}
                {allRequests.total > page * 30 && (
                  <Link
                    href={`/admin/requests?tab=all&page=${page + 1}`}
                    className="btn btn-outline btn-sm"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
