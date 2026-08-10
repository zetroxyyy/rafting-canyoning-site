"use client";

/**
 * AdminBookingActions — right-column action panel on the admin booking detail page.
 *
 * Payment system: manual cash/bank transfer only.
 * Payment statuses are strictly limited to: PAID | PENDING
 * No Stripe integration.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, CheckCircle, ExternalLink, AlertTriangle, Ban } from "lucide-react";
import { cn } from "@/lib/cn";
import { sendBackToComboQueue } from "@/app/actions/admin/combo";

interface BookingData {
  id: string;
  status: string;
  paymentStatus: string;
  totalJpy: number;
  leadEmail: string;
  reference: string;
  receiptPdfPath?: string | null;
  waiverPdfPath?: string | null;
  source?: string;
  /** YYYY-MM-DD string of the booking's slot date — used for COMPLETED guardrail */
  slotDate: string;
  isCombo?: boolean | null;
  slotId?: string | null;
  secondarySlotId?: string | null;
}

// Booking lifecycle statuses available to admin
const BOOKING_STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED"] as const;

// Payment statuses — strictly PAID or PENDING only
const PAYMENT_STATUSES = ["PAID", "PENDING"] as const;


const LOCKED_STATUSES = ["CANCELLED", "COMPLETED"];

export default function AdminBookingActions({ booking: initialBooking }: { booking: BookingData }) {
  const router = useRouter();
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [pdfGeneratingLocale, setPdfGeneratingLocale] = useState<"en" | "ja" | null>(null);
  const [error, setError] = useState("");
  const [pdfSuccess, setPdfSuccess] = useState("");
  const [lastReceiptUrl, setLastReceiptUrl] = useState<string | null>(null);
  const [lastWaiverUrl, setLastWaiverUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showFinalizePanel, setShowFinalizePanel] = useState(false);
  const [finalizeNote, setFinalizeNote] = useState("");
  // Manual refund amount — admin types exact amount to return to guest (empty = must fill in)
  const [finalizeRefundAmount, setFinalizeRefundAmount] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState("");


  const isLocked = LOCKED_STATUSES.includes(booking.status);

  // Use JST (Asia/Tokyo) for the today comparison — Vercel server runs on UTC
  // and we must compare against JST midnight, not UTC midnight.
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const tripIsInFuture = booking.slotDate > todayStr;
  const isCompletedDisabled = tripIsInFuture || booking.status === "COMPLETED";
  const completedTooltip = tripIsInFuture
    ? `Cannot mark COMPLETED — trip date (${booking.slotDate}) has not passed yet`
    : undefined;

  const isPaid =
    booking.paymentStatus === "PAID" ||
    booking.paymentStatus.startsWith("PAID");
  const isUnpaid = !isPaid;

  // ── Generic PATCH helper ──────────────────────────────────────────────────
  const apiCall = async (body: object) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      if (data.booking) {
        setBooking((b) => ({ ...b, ...data.booking }));
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange  = (status: string)        => { if (!isLocked) apiCall({ action: "STATUS", status }); };
  const handlePaymentStatus = (paymentStatus: string) => { if (!isLocked) apiCall({ action: "PAYMENT_STATUS", paymentStatus }); };
  const handleSaveNote      = ()                       => apiCall({ action: "NOTE", adminNote: note });

  const handleSendBackToComboQueue = async () => {
    if (
      !confirm(
        "Are you sure you want to send this booking back to the Combo Queue?\n\nThis will:\n1. Remove the booking from its currently scheduled slots.\n2. Restore the slot capacities.\n3. Reset the status to PENDING and place it back in the unscheduled Combo package manifest queue."
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await sendBackToComboQueue(booking.id);
      if (!res.success) throw new Error(res.error ?? "Failed to send back to combo queue");

      setBooking((b) => ({
        ...b,
        status: "PENDING",
        slotId: null,
        secondarySlotId: null,
      }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error sending back to queue");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCancel = () => {
    if (!confirm(
      "Cancel this booking request?\n\nThis booking is UNPAID — no payment was collected and no seats will be restored (none were reserved). This action cannot be undone."
    )) return;
    apiCall({ action: "CANCEL", reason: "Admin cancelled PENDING/UNPAID inquiry" });
  };

  const handleFinalizeCancel = async () => {
    const refundJpy = parseInt(finalizeRefundAmount || "0", 10);
    if (isNaN(refundJpy) || refundJpy < 0) {
      setFinalizeError("Enter a valid refund amount (0 for no refund).");
      return;
    }
    if (!confirm(
      `Cancel this booking${refundJpy === 0 ? " with no refund" : ""}? Return ¥${refundJpy.toLocaleString()} to the guest manually.`
    )) return;

    setFinalizing(true);
    setFinalizeError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FINALIZE_CANCEL",
          refundAmountJpy: refundJpy,
          adminDecisionNote: finalizeNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Finalize failed");

      if (data.booking) setBooking((b) => ({ ...b, ...data.booking }));
      setShowFinalizePanel(false);
      router.refresh();
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : "Server error");
    } finally {
      setFinalizing(false);
    }
  };

  // ── PDF generation ────────────────────────────────────────────────────────
  const handleGeneratePdfs = async (locale: "en" | "ja") => {
    setPdfGeneratingLocale(locale);
    setError("");
    setPdfSuccess("");
    setLastReceiptUrl(null);
    setLastWaiverUrl(null);

    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/generate-pdfs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "PDF generation failed");

      const langLabel = locale === "ja" ? "Japanese" : "English";
      setPdfSuccess(
        data.uploadErrors?.length
          ? `${langLabel} PDFs generated (with upload warnings).`
          : `${langLabel} PDFs ready — click below to open:`
      );

      if (data.receiptUrl) setLastReceiptUrl(data.receiptUrl);
      if (data.waiverUrl)  setLastWaiverUrl(data.waiverUrl);

      if (data.receiptPath) {
        setBooking((b) => ({
          ...b,
          receiptPdfPath: data.receiptPath ?? b.receiptPdfPath,
          waiverPdfPath:  data.waiverPath  ?? b.waiverPdfPath,
        }));
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF error");
    } finally {
      setPdfGeneratingLocale(null);
    }
  };

  const canGeneratePdfs = ["CONFIRMED", "COMPLETED"].includes(booking.status);
  const hasPdfs  = booking.receiptPdfPath && booking.waiverPdfPath;
  const isPdfBusy = pdfGeneratingLocale !== null;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Saving…
        </div>
      )}

      {/* ── PDF generation (bilingual) ────────────────────────────── */}
      {canGeneratePdfs && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Documents</p>

          {hasPdfs ? (
            <p className="text-xs text-teal-600 flex items-center gap-1 mb-3">
              <CheckCircle className="w-3 h-3" /> PDFs on file
            </p>
          ) : (
            <p className="text-xs text-amber-600 mb-3">⚠ No PDFs generated yet</p>
          )}

          {pdfSuccess && (
            <p className="text-xs text-teal-700 bg-teal-50 p-2 rounded mb-2">{pdfSuccess}</p>
          )}

          {(lastReceiptUrl || lastWaiverUrl) && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {lastReceiptUrl && (
                <a
                  href={lastReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm flex items-center justify-center gap-1.5 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Receipt
                </a>
              )}
              {lastWaiverUrl && (
                <a
                  href={lastWaiverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm flex items-center justify-center gap-1.5 text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Waiver
                </a>
              )}
            </div>
          )}

          <p className="text-[11px] text-stone-400 mb-2">Choose language to generate:</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="pdf-generate-en"
              onClick={() => handleGeneratePdfs("en")}
              disabled={isPdfBusy}
              className={cn("btn btn-outline btn-sm flex items-center justify-center gap-1.5 text-xs", pdfGeneratingLocale === "en" && "opacity-70")}
              title="Generate English receipt & waiver PDFs"
            >
              {pdfGeneratingLocale === "en" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              English
            </button>
            <button
              id="pdf-generate-ja"
              onClick={() => handleGeneratePdfs("ja")}
              disabled={isPdfBusy}
              className={cn("btn btn-outline btn-sm flex items-center justify-center gap-1.5 text-xs", pdfGeneratingLocale === "ja" && "opacity-70")}
              title="Generate Japanese PDFs / 日本語でPDFを生成"
            >
              {pdfGeneratingLocale === "ja" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              日本語
            </button>
          </div>

          <p className="text-[10px] text-stone-400 mt-1.5 text-center">
            {hasPdfs ? "Regenerates" : "Generates"} receipt + waiver · links appear above after generation
          </p>
        </div>
      )}
      {/* ── COMBO ACTIONS ─────────────────────────────────────────── */}
      {booking.isCombo && (booking.slotId || booking.secondarySlotId) && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
        <div className="card p-4 border border-violet-100 bg-violet-50/30">
          <p className="text-xs font-semibold text-violet-700 uppercase mb-2">Combo Actions</p>
          <p className="text-xs text-stone-500 mb-3">
            This booking is scheduled with dual slots. Sending it back to the queue will release slot capacities and allow manifest rescheduling.
          </p>
          <button
            onClick={handleSendBackToComboQueue}
            disabled={loading}
            className="btn btn-sm w-full text-violet-700 border-violet-200 hover:bg-violet-50 bg-white flex items-center justify-center gap-2"
            style={{ borderWidth: "1px", borderStyle: "solid" }}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            Send back to Combo Queue
          </button>
        </div>
      )}

      {/* ── BOOKING STATUS ─────────────────────────────────────────── */}
      <div className={cn("card p-4", isLocked && "opacity-60")}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-stone-500 uppercase">Booking Status</p>
          {isLocked && <span className="text-[10px] text-stone-400 italic">Locked — {booking.status}</span>}
        </div>
        <div className="flex flex-col gap-2">
          {BOOKING_STATUSES.map((s) => {
            const isCompleted = s === "COMPLETED";
            const disabledForFuture = isCompleted && tripIsInFuture;
            const disabledFully = booking.status === s || loading || isLocked || disabledForFuture;
            const tooltip = disabledForFuture
              ? completedTooltip
              : isLocked
              ? `Cannot change status of a ${booking.status} booking`
              : undefined;
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={disabledFully}
                title={tooltip}
                className={cn(
                  "btn btn-sm btn-outline text-xs w-full justify-start",
                  booking.status === s && "opacity-40",
                  (isLocked || disabledForFuture) && "cursor-not-allowed",
                  disabledForFuture && "opacity-30"
                )}
              >
                {s}
                {disabledForFuture && (
                  <span className="ml-auto text-[9px] text-stone-400 font-normal">future date</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-stone-400 mt-2">
          Booking status controls lifecycle. Use Payment Status below for money tracking.
        </p>
      </div>

      {/* ── Payment Status ────────────────────────────────────────── */}
      <div className={cn("card p-4", isLocked && "opacity-60")}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-stone-500 uppercase">Payment Status</p>
          {isLocked && <span className="text-[10px] text-stone-400 italic">Locked</span>}
        </div>

        {/* Current payment status badge */}
        <p className="text-xs text-stone-500 mb-3">
          Current:{" "}
          {(() => {
            const psUpper = booking.paymentStatus.toUpperCase();
            const bsUpper = booking.status.toUpperCase();
            const displayPaymentStatus = bsUpper === "CANCELLED"
              ? (psUpper.startsWith("PAID") || psUpper === "REFUNDED" || psUpper === "PARTIALLY_REFUNDED" ? "REFUNDED" : "UNPAID")
              : booking.paymentStatus;
            
            return (
              <span className={cn(
                "font-semibold",
                displayPaymentStatus === "PAID" || displayPaymentStatus.startsWith("PAID")
                  ? "text-green-700"
                  : displayPaymentStatus === "REFUNDED"
                  ? "text-blue-700"
                  : displayPaymentStatus === "UNPAID"
                  ? "text-red-700"
                  : "text-amber-700"
              )}>
                {displayPaymentStatus}
              </span>
            );
          })()}
        </p>

        {/* Quick status buttons — PAID and PENDING only */}
        <div className="flex flex-col gap-1.5 mb-3">
          {PAYMENT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handlePaymentStatus(s)}
              disabled={booking.paymentStatus === s || loading || isLocked}
              className={cn(
                "btn btn-sm btn-outline text-xs w-full justify-start",
                booking.paymentStatus === s && "opacity-40",
                isLocked && "cursor-not-allowed"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-stone-400 mt-2">
          Payment statuses: PENDING (awaiting) or PAID (received at base).
        </p>
      </div>

      {/* ── Finalize Cancellation panel ─────────────────────────────────────
           Shown ONLY for paid bookings (isPaid guard).
           Admin manually types the exact amount to return to the guest.
           For UNPAID bookings, use the Quick Cancel button below instead.
      ────────────────────────────────────────────────────────────────── */}
      {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && isPaid && (
        <div className="card p-4 border border-red-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-red-500 uppercase flex items-center gap-1">
              <Ban className="w-3.5 h-3.5" /> Finalize Cancellation
            </p>
            <button
              onClick={() => setShowFinalizePanel((v) => !v)}
              className="text-[10px] text-stone-400 underline underline-offset-2"
            >
              {showFinalizePanel ? "Hide" : "Open"}
            </button>
          </div>

          {showFinalizePanel && (
            <div className="space-y-3 mt-2">
              <div className="rounded-lg p-3 text-xs flex items-start gap-2" style={{ background: "#fef9c3", border: "1px solid #fde68a" }}>
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <div className="text-amber-800 space-y-0.5">
                  <p className="font-semibold">Pay on Arrival Booking</p>
                  <p>Return the refund to the guest physically <strong>before</strong> confirming below. Seats will be restored automatically.</p>
                </div>
              </div>

              <div>
                <label className="label text-xs">
                  Exact Refund Amount (¥){" "}
                  <span className="text-stone-400 font-normal">
                    — booking total: ¥{booking.totalJpy.toLocaleString()}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={booking.totalJpy}
                  step={100}
                  className="input text-sm"
                  value={finalizeRefundAmount}
                  onChange={(e) => setFinalizeRefundAmount(e.target.value)}
                  placeholder="Enter exact amount to return to guest (¥0 = no refund)"
                />
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Type the exact yen amount you are physically handing back. Set to 0 for weather cancellations or policy forfeit.
                </p>
              </div>

              <div>
                <label className="label text-xs">Admin Decision Note (optional)</label>
                <textarea
                  className="input text-sm w-full h-16 resize-none"
                  placeholder="Reason for cancellation, refund rationale…"
                  value={finalizeNote}
                  onChange={(e) => setFinalizeNote(e.target.value)}
                />
              </div>

              {finalizeError && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{finalizeError}</p>
              )}

              <button
                onClick={handleFinalizeCancel}
                disabled={finalizing || finalizeRefundAmount === ""}
                className="btn btn-sm w-full text-xs"
                style={{
                  background: finalizeRefundAmount === ""
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "white",
                  cursor: finalizeRefundAmount === "" ? "not-allowed" : undefined,
                }}
                title={finalizeRefundAmount === "" ? "Enter a refund amount (¥0 for no refund)" : undefined}
              >
                {finalizing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finalizing…</>
                ) : (
                  <><Ban className="w-3.5 h-3.5" /> Cancel Booking + Record Manual Refund</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Quick cancel — UNPAID/PENDING bookings ONLY ───────────────────────
           UNPAID means no seat hold was created and no capacity was deducted.
           Cancelling is a clean operation: no seat restore, no refund ledger.
           The backend CANCEL action (cancelBooking) already guards on status.
      ───────────────────────────────────────────────────────────────────── */}
      {booking.status !== "CANCELLED" &&
       booking.status !== "COMPLETED" &&
       isUnpaid && (
        <div className="card p-4 border border-red-50">
          <p className="text-xs text-stone-500 mb-3">
            <span className="font-semibold text-red-500">UNPAID booking</span> — no payment was collected.
            Cancelling will archive this inquiry without restoring any seat capacity (none was reserved).
          </p>
          <button
            onClick={handleQuickCancel}
            disabled={loading}
            className="btn btn-sm w-full text-red-600 border-red-200 hover:bg-red-50"
            style={{ borderWidth: "1px", borderStyle: "solid" }}
          >
            Cancel Request (No Payment to Refund)
          </button>
        </div>
      )}

      {/* ── Admin note ───────────────────────────────────────────── */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Admin Note</p>
        <textarea
          className="input text-sm w-full h-20 resize-none"
          placeholder="Internal note (not shown to guest)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button onClick={handleSaveNote} disabled={loading || !note.trim()} className="btn btn-sm btn-outline mt-2 w-full">
          Save Note
        </button>
      </div>
    </div>
  );
}
