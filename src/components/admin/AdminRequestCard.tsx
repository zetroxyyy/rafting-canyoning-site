"use client";

/**
 * AdminRequestCard
 *
 * Premium, expandable card for each BookingRequest record.
 * Displays all request context and action buttons with full slot-picker
 * for reschedule approvals.
 *
 * STATUS FLOW:
 *   PENDING_REVIEW  → "Approve" or "Reject" buttons
 *   APPROVED (cancel) → Actual refund amount input + "Finalize + Refund" button
 *   APPROVED (reschedule) → Slot date/time picker + "Approve Reschedule" button
 *   REJECTED / FINALIZED → Read-only summary
 *
 * API calls → POST /api/admin/requests
 * Actions: APPROVE | REJECT | FINALIZE_CANCELLATION | FINALIZE_RESCHEDULE
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatJpy } from "@/lib/utils";
import {
  Clock, CheckCircle, XCircle, RefreshCcw, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, Ban, Calendar,
  MessageSquare, User, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/cn";



// ── Serialised shape (dates as ISO strings) ───────────────────────────────────

export interface SerializedRequest {
  id: string;
  type: "CANCELLATION" | "RESCHEDULE";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "FINALIZED";
  requestedNewDate: string | null;
  requestedNewTime: string | null;
  guestMessage: string | null;
  suggestedRefundJpy: number | null;
  refundPolicyNote: string | null;
  adminDecisionNote: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  finalizedAt: string | null;
  booking: {
    id: string;         // Task 3: used for PDF regen after reschedule finalization
    reference: string;
    leadName: string;
    leadEmail: string;
    status: string;
    paymentStatus: string;
    totalJpy: number;
    locale: string;
    adultCount: number;
    childCount: number;
    slot: { date: string; startTime: string } | null;
    product: { nameEn: string; activityType: string };
  };
}

interface Props {
  request: SerializedRequest;
}

// ── Status config ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SerializedRequest["status"], {
  icon: React.ReactNode;
  label: string;
  badgeCls: string;
  borderCls: string;
}> = {
  PENDING_REVIEW: {
    icon: <Clock className="w-3.5 h-3.5" />,
    label: "Pending Review",
    badgeCls: "badge-amber",
    borderCls: "border-l-amber-400",
  },
  APPROVED: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: "Approved",
    badgeCls: "badge-teal",
    borderCls: "border-l-teal-400",
  },
  REJECTED: {
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: "Rejected",
    badgeCls: "badge-red",
    borderCls: "border-l-red-400",
  },
  FINALIZED: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    label: "Finalized",
    badgeCls: "badge-green",
    borderCls: "border-l-green-400",
  },
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminRequestCard({ request: initialRequest }: Props) {
  const router = useRouter();
  const [request, setRequest] = useState(initialRequest);
  const [expanded, setExpanded] = useState(request.status === "PENDING_REVIEW");
  const [isPending, start] = useTransition();

  const [adminNote, setAdminNote]         = useState(request.adminDecisionNote ?? "");
  // Concierge model: admin enters the exact refund amount manually (no auto-calculation)
  const [actualRefundJpy, setActualRefund] = useState("");
  // All bookings are manual (concierge model — no Stripe)
  const isUnpaidBooking = !request.booking.paymentStatus?.toUpperCase().startsWith("PAID");
  // Reschedule slot picker state
  const [rescheduleDate, setRescheduleDate] = useState(request.requestedNewDate ?? "");
  const [rescheduleTime, setRescheduleTime] = useState(request.requestedNewTime ?? "09:00");
  const [newSlotId, setNewSlotId]           = useState("");
  const [slotSearching, setSlotSearching]   = useState(false);
  const [slotResults, setSlotResults]       = useState<Array<{
    id: string; date: string; startTime: string; available: number;
  }>>([]);
  const [slotError, setSlotError]           = useState("");

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const isCancellation = request.type === "CANCELLATION";
  const isActionable   = request.status === "PENDING_REVIEW" || request.status === "APPROVED";
  const config         = STATUS_CONFIG[request.status];
  const today          = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  // ── API call helper ─────────────────────────────────────────────────────────

  const callApi = async (action: string, extra: Record<string, unknown> = {}) => {
    setFeedback(null);
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        requestId: request.id,
        adminDecisionNote: adminNote || undefined,
        ...extra,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setFeedback({
        type: "success",
        msg: json.message ?? "Done",
      });
      const newStatus: Record<string, SerializedRequest["status"]> = {
        APPROVE:               "APPROVED",
        REJECT:                "REJECTED",
        FINALIZE_CANCELLATION: "FINALIZED",
        FINALIZE_RESCHEDULE:   "FINALIZED",
      };
      if (newStatus[action]) {
          setRequest((r) => ({
            ...r,
            status: newStatus[action],
            adminDecisionNote: adminNote || r.adminDecisionNote,
            finalizedAt: json.finalizedAt ?? r.finalizedAt,
          }));
      }
      // Task 4: after approve/reject, navigate to All Requests tab so admin sees updated state
      if (action === "APPROVE" || action === "REJECT") {
        router.push("/admin/requests?tab=all");
      }
      // Task 3: after reschedule finalization, trigger PDF regen (fire-and-forget)
      if (action === "FINALIZE_RESCHEDULE") {
        const bookingId = request.booking?.id;
        if (bookingId) {
          fetch(`/api/admin/bookings/${bookingId}/generate-pdfs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: request.booking?.locale ?? "en" }),
          }).catch((e) => console.warn("[PDF regen] Non-fatal:", e));
        }
      }
      router.refresh();
    } else {
      setFeedback({ type: "error", msg: json.error ?? "Error" });
    }
  };

  // ── Slot search for reschedule ──────────────────────────────────────────────

  const searchSlots = async () => {
    if (!rescheduleDate) {
      setSlotError("Please enter a date first.");
      return;
    }
    setSlotSearching(true);
    setSlotError("");
    setSlotResults([]);
    setNewSlotId("");
    try {
      const pax = (request.booking.adultCount ?? 1) + (request.booking.childCount ?? 0);
      const res = await fetch(
        `/api/admin/availability/slots?date=${rescheduleDate}&time=${rescheduleTime}&minAvailable=${pax}&activityType=${request.booking.product.activityType}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setSlotResults(data.slots ?? []);
      if ((data.slots ?? []).length === 0) {
        setSlotError(`No available slots found for ${rescheduleDate} at ${rescheduleTime} with ${pax}+ capacity.`);
      }
    } catch (err) {
      setSlotError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSlotSearching(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "card overflow-hidden transition-shadow hover:shadow-md",
        "border-l-4",
        config.borderCls,
      )}
    >
      {/* ── Collapsed header ── */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-stone-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Type icon */}
          <div className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
            isCancellation ? "bg-red-50" : "bg-blue-50"
          )}>
            {isCancellation
              ? <Ban className="w-4 h-4 text-red-500" />
              : <RefreshCcw className="w-4 h-4 text-blue-500" />
            }
          </div>

          {/* Summary */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-stone-900 font-mono text-sm">
                {request.booking.reference}
              </span>
              <span className={`badge ${config.badgeCls} flex items-center gap-1 text-xs`}>
                {config.icon}
                {config.label}
              </span>
              <span className="badge badge-gray text-xs">
                {isCancellation ? "Cancellation" : "Reschedule"}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 truncate">
              <span className="font-medium">{request.booking.leadName}</span>
              {" · "}
              {request.booking.product.nameEn}
              {" · "}
              {request.booking.slot?.date ?? "TBD"} at {request.booking.slot?.startTime ?? ""}
            </p>
          </div>
        </div>

        {/* Right side meta */}
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {isCancellation && request.suggestedRefundJpy != null && (
            <span className="hidden sm:block text-sm font-medium text-stone-600 tabular-nums">
              {formatJpy(request.suggestedRefundJpy)}
            </span>
          )}
          <span className="text-xs text-stone-400 hidden md:block">
            {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" })}
          </span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-stone-400" />
            : <ChevronDown className="w-4 h-4 text-stone-400" />}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="px-4 pb-5 pt-1 border-t border-stone-100 space-y-4">

          {/* ── Context grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Booking info */}
            <div className="rounded-xl p-3 bg-stone-50 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1">Booking</p>
              <div className="flex items-center gap-2 text-stone-700">
                <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>{request.booking.leadName}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-600 text-xs min-w-0">
                <span className="text-stone-400 flex-shrink-0">Email:</span>
                <a href={`mailto:${request.booking.leadEmail}`} className="hover:underline break-all">
                  {request.booking.leadEmail}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="text-stone-700 text-sm">
                  {request.booking.slot?.date ?? "TBD"} @ {request.booking.slot?.startTime ?? ""}
                </span>
              </div>
              <div className="flex gap-2 pt-0.5 flex-wrap">
                <span className="badge badge-gray text-xs">{request.booking.status}</span>
                <span className={cn("badge text-xs", request.booking.paymentStatus?.startsWith("PAID") ? "badge-green" : "badge-amber")}>
                  {request.booking.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Total: <strong>{formatJpy(request.booking.totalJpy)}</strong>
                {" · "}
                {request.booking.adultCount}A / {request.booking.childCount}C
              </p>
            </div>

            {/* Request info */}
            <div className="rounded-xl p-3 bg-stone-50 space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-1">Request</p>
              <p className="text-stone-500 text-xs">
                Submitted {new Date(request.createdAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  timeZone: "Asia/Tokyo"
                })}
              </p>

              {request.requestedNewDate && (
                <div className="flex items-center gap-1.5 text-blue-700 text-sm">
                  <RefreshCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Requested: <strong>{request.requestedNewDate}</strong>
                    {request.requestedNewTime && ` @ ${request.requestedNewTime}`}
                  </span>
                </div>
              )}

              {isCancellation && request.refundPolicyNote && (
                // Policy note is no longer auto-generated in concierge model
                // Keep this block for legacy requests that may have a stored note
                <div className="flex items-start gap-1.5 text-amber-700 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{request.refundPolicyNote}</span>
                </div>
              )}

              {request.guestMessage && (
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-0.5">
                    <MessageSquare className="w-3 h-3" /> Guest message
                  </div>
                  <p className="text-stone-700 italic text-sm">"{request.guestMessage}"</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Prior admin decision note (read-only when not actionable) ── */}
          {request.adminDecisionNote && !isActionable && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
              <p className="text-stone-400 text-xs mb-1 font-medium">Admin note</p>
              <p className="text-stone-700">{request.adminDecisionNote}</p>
            </div>
          )}

          {/* ── Finalized state ── */}
          {request.status === "FINALIZED" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                <CheckCircle className="w-4 h-4" />
                Request finalized
              </div>
              {request.finalizedAt && (
                <p className="text-green-600 text-xs">
                  {new Date(request.finalizedAt).toLocaleString("en-US", {
                    month: "long", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                    timeZone: "Asia/Tokyo"
                  })}
                </p>
              )}
              {isCancellation && (
                <p className="text-stone-400 text-xs mt-1">
                  Refund processed manually (cash or bank transfer)
                </p>
              )}
              {request.adminDecisionNote && (
                <p className="text-green-700 text-xs mt-1.5 italic">Note: {request.adminDecisionNote}</p>
              )}
            </div>
          )}

          {/* ── Rejected state ── */}
          {request.status === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-1">
                <XCircle className="w-4 h-4" />
                Request rejected
              </div>
              {request.rejectedAt && (
                <p className="text-red-500 text-xs">{new Date(request.rejectedAt).toLocaleString("en-US", { timeZone: "Asia/Tokyo" })}</p>
              )}
              {request.adminDecisionNote && (
                <p className="text-red-700 text-xs mt-1.5 italic">Note: {request.adminDecisionNote}</p>
              )}
            </div>
          )}

          {/* ── Action form (only shown when actionable) ── */}
          {isActionable && (
            <div className="space-y-4 pt-1">
              <hr className="border-stone-100" />

              {/* Admin note field */}
              <div>
                <label className="label text-xs">Admin Note (logged with decision)</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="input text-sm"
                  rows={2}
                  placeholder="Optional internal note…"
                />
              </div>

              {/* ── CANCELLATION: refund amount + method when APPROVED ── */}
              {isCancellation && request.status === "APPROVED" && (
                isUnpaidBooking ? (
                  // UNPAID: no payment was ever collected — no refund to process
                  <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 text-sm">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      UNPAID Booking
                    </div>
                    <p className="text-amber-700 text-xs">
                      This booking was never paid. No refund is necessary.
                      Finalizing will simply cancel the booking — no payment ledger entry will be created.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="label text-xs">
                        Actual Refund Amount (¥)
                        <span className="text-stone-400 font-normal ml-1">
                          — booking total: {formatJpy(request.booking.totalJpy)}
                        </span>
                      </label>
                      <input
                        type="number"
                        value={actualRefundJpy}
                        onChange={(e) => setActualRefund(e.target.value)}
                        className="input text-sm"
                        min={0}
                        max={request.booking.totalJpy}
                        placeholder="Enter exact amount to return to guest (¥0 = no refund)"
                      />
                      {(() => {
                        const v = parseInt(actualRefundJpy || "0", 10);
                        if (isNaN(v) || v < 0)
                          return <p className="text-xs text-red-600 mt-1">Amount cannot be negative.</p>;
                        if (v > request.booking.totalJpy)
                          return <p className="text-xs text-red-600 mt-1">Cannot exceed booking total ({formatJpy(request.booking.totalJpy)}).</p>;
                        return null;
                      })()}
                      <p className="text-xs text-stone-400 mt-1">
                        Type the exact yen amount you are physically returning to the guest.
                        Set to 0 for weather cancellations or policy forfeit.
                        <strong> Return payment to guest before finalizing.</strong>
                      </p>
                    </div>


                  </div>
                )
              )}

              {/* ── RESCHEDULE: slot picker when APPROVED ── */}
              {!isCancellation && request.status === "APPROVED" && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-stone-500 uppercase">Select New Slot</p>

                  {/* Date + time row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Date</label>
                      <input
                        type="date"
                        className="input text-sm"
                        value={rescheduleDate}
                        min={today}
                        onChange={(e) => { setRescheduleDate(e.target.value); setSlotResults([]); setNewSlotId(""); }}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Time</label>
                      <select
                        className="input text-sm"
                        value={rescheduleTime}
                        onChange={(e) => { setRescheduleTime(e.target.value); setSlotResults([]); setNewSlotId(""); }}
                      >
                        <option value="09:00">09:00 AM</option>
                        <option value="11:30">11:30 AM</option>
                        <option value="13:30">01:30 PM</option>
                      </select>
                    </div>
                  </div>

                  {/* Search button */}
                  <button
                    onClick={searchSlots}
                    disabled={slotSearching || !rescheduleDate}
                    className="btn btn-outline btn-sm flex items-center gap-1.5"
                  >
                    {slotSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                    {slotSearching ? "Searching…" : "Find Available Slots"}
                  </button>

                  {slotError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{slotError}</p>
                  )}

                  {/* Slot results */}
                  {slotResults.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-stone-500">{slotResults.length} slot{slotResults.length !== 1 ? "s" : ""} found — select one:</p>
                      {slotResults.map((slot) => (
                        <label
                          key={slot.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors text-sm",
                            newSlotId === slot.id
                              ? "border-teal-500 bg-teal-50 text-teal-800"
                              : "border-stone-200 hover:border-stone-300 bg-white text-stone-700"
                          )}
                        >
                          <input
                            type="radio"
                            name={`slot-${request.id}`}
                            value={slot.id}
                            checked={newSlotId === slot.id}
                            onChange={() => setNewSlotId(slot.id)}
                            className="accent-teal-600"
                          />
                          <div className="flex-1">
                            <span className="font-medium">{slot.date}</span>
                            <span className="text-stone-400 mx-1.5">@</span>
                            <span>{slot.startTime}</span>
                          </div>
                          <span className="text-xs text-stone-400">{slot.available} seats free</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Manual slot ID override */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-stone-400 hover:text-stone-600">
                      Enter Slot ID manually (advanced)
                    </summary>
                    <div className="mt-2">
                      <label className="label text-xs">Slot ID (CUID from availability list)</label>
                      <input
                        type="text"
                        value={newSlotId}
                        onChange={(e) => setNewSlotId(e.target.value)}
                        className="input text-sm font-mono"
                        placeholder="c… (cuid)"
                      />
                      <p className="text-stone-400 mt-1">
                        Find in <a href="/admin/availability" target="_blank" className="underline inline-flex items-center gap-0.5">Availability<ExternalLink className="w-3 h-3" /></a>
                      </p>
                    </div>
                  </details>
                </div>
              )}

              {/* ── Action buttons ── */}
              <div className="flex flex-wrap gap-2">
                {/* PENDING_REVIEW → Approve / Reject */}
                {request.status === "PENDING_REVIEW" && (
                  <>
                    <button
                      disabled={isPending}
                      onClick={() => start(() => callApi("APPROVE"))}
                      className="btn btn-primary btn-sm flex items-center gap-1.5"
                    >
                      {isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle className="w-3.5 h-3.5" />}
                      {isCancellation ? "Approve (Refund Required)" : "Approve Reschedule Request"}
                    </button>
                    <button
                      disabled={isPending}
                      onClick={() => start(() => callApi("REJECT"))}
                      className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                    >
                      {isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                  </>
                )}

                {/* APPROVED cancellation → Finalize */}
                {isCancellation && request.status === "APPROVED" && (() => {
                  const refundVal   = parseInt(actualRefundJpy || "0", 10);
                  const hasAmount   = actualRefundJpy !== "";
                  const isRefundInvalid = !hasAmount || isNaN(refundVal) || refundVal < 0 || refundVal > request.booking.totalJpy;
                  const isBlocked   = !isUnpaidBooking && isRefundInvalid; // UNPAID: no amount needed
                  return (
                    <button
                      disabled={isPending || isBlocked}
                      title={isBlocked ? `Enter a refund amount between ¥0 and ${formatJpy(request.booking.totalJpy)}` : undefined}
                      onClick={() =>
                        start(() =>
                          callApi("FINALIZE_CANCELLATION", {
                            actualRefundJpy: isUnpaidBooking ? 0 : refundVal,
                          })
                        )
                      }
                      className="btn btn-sm flex items-center gap-1.5"
                      style={{
                        background: isBlocked
                          ? "#9ca3af"
                          : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                        color: "white",
                        cursor: isBlocked ? "not-allowed" : undefined,
                      }}
                    >
                      {isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Ban className="w-3.5 h-3.5" />}
                      {isUnpaidBooking ? "Finalize Cancellation (No Refund)" : "Finalize + Mark Refunded"}
                    </button>
                  );
                })()}

                {/* APPROVED reschedule → Finalize */}
                {!isCancellation && request.status === "APPROVED" && (
                  <button
                    disabled={isPending || !newSlotId}
                    onClick={() => start(() => callApi("FINALIZE_RESCHEDULE", { newSlotId }))}
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                  >
                    {isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCcw className="w-3.5 h-3.5" />}
                    Confirm Reschedule
                  </button>
                )}
              </div>

              {/* Feedback */}
              {feedback && (
                <div
                  className={cn(
                    "text-sm px-3 py-2.5 rounded-xl flex items-start gap-2",
                    feedback.type === "success"
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  )}
                >
                  {feedback.type === "success"
                    ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div>
                    <p>{feedback.msg}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
