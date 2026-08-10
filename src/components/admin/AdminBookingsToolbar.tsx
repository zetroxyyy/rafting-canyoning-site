"use client";

/**
 * AdminBookingsToolbar
 *
 * Client component rendered in the Bookings page header. Contains:
 *  1. "Mark Past Complete" — calls bulkCompleteBookings() server action
 *  2. "Create Custom Slot" — opens a modal to create a one-off availability slot
 *     with a custom activity, date, time, and capacity.
 */

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, CalendarPlus, X, Check, AlertCircle } from "lucide-react";
import { bulkCompleteBookings } from "@/app/actions/admin/bulkCompleteBookings";
import {
  createCustomSlot,
  getAvailableProducts,
  type ProductOption,
} from "@/app/actions/admin/availability";
import { cn } from "@/lib/cn";
import { CAPACITY } from "@/lib/utils";

// ─── Minimal today YYYY-MM-DD helper ─────────────────────────────────────────

function todayString(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

// ─── Toast component ─────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[9999] flex items-start gap-3 rounded-xl shadow-2xl px-4 py-3 max-w-sm",
        "border backdrop-blur-sm transition-all animate-in slide-in-from-bottom-4 duration-300",
        type === "success"
          ? "bg-teal-50/95 border-teal-200 text-teal-800"
          : "bg-red-50/95 border-red-200 text-red-800"
      )}
    >
      {type === "success" ? (
        <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-teal-600" />
      ) : (
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600" />
      )}
      <p className="text-sm font-medium leading-snug flex-1">{message}</p>
      <button
        onClick={onDismiss}
        className="ml-1 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Create Custom Slot Modal ─────────────────────────────────────────────────

interface CreateSlotModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

function CreateSlotModal({ onClose, onSuccess, onError }: CreateSlotModalProps) {
  const [products, setProducts]         = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError]     = useState("");

  // Form fields
  const [productId, setProductId] = useState("");
  const [date, setDate]           = useState(todayString());
  const [startTime, setStartTime] = useState("09:00");
  const [capacity, setCapacity]   = useState<number>(CAPACITY.RAFTING);

  // Submission state
  const [submitting, startSubmit] = useTransition();
  const [fieldError, setFieldError] = useState("");

  // ── Load products on mount ────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setProductsLoading(true);
    getAvailableProducts().then(({ products: ps, error }) => {
      if (!mounted) return;
      setProductsLoading(false);
      if (error) {
        setProductsError(error);
        return;
      }
      setProducts(ps);
      if (ps.length > 0) {
        setProductId(ps[0].id);
        setCapacity(ps[0].defaultCapacity);
      }
    });
    return () => { mounted = false; };
  }, []);

  // ── When product changes, update default capacity ─────────────────────────
  const handleProductChange = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setCapacity(p.defaultCapacity);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setFieldError("");

    // Client-side guard
    if (!productId) { setFieldError("Please select an activity."); return; }
    if (!date)       { setFieldError("Please select a date.");     return; }
    if (!startTime)  { setFieldError("Please enter a start time."); return; }
    if (!capacity || capacity < 1) {
      setFieldError("Capacity must be at least 1.");
      return;
    }

    startSubmit(async () => {
      const result = await createCustomSlot({
        productId,
        date,
        startTime,
        maxCapacity: capacity,
      });

      if (result.success) {
        const product = products.find((p) => p.id === productId);
        onSuccess(
          `Custom slot created: ${product?.nameEn ?? "Activity"} on ${date} at ${startTime} (capacity ${capacity})`
        );
        onClose();
      } else {
        onError(result.error ?? "Failed to create slot.");
      }
    });
  };

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, submitting]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm leading-tight">
                Create Custom Slot
              </h3>
              <p className="text-xs text-stone-400 leading-tight">
                Add a one-off availability slot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-4">

          {/* Activity selector */}
          <div>
            <label className="label text-xs">Activity</label>
            {productsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-stone-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading activities…
              </div>
            ) : productsError ? (
              <p className="text-sm text-red-600 py-1">{productsError}</p>
            ) : (
              <select
                id="custom-slot-product"
                value={productId}
                onChange={(e) => handleProductChange(e.target.value)}
                disabled={submitting}
                className="input text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameEn} ({p.activityType === "RAFTING" ? "Rafting" : "Canyoning"})
                  </option>
                ))}
                {products.length === 0 && (
                  <option disabled value="">
                    No active products found
                  </option>
                )}
              </select>
            )}
          </div>

          {/* Date picker */}
          <div>
            <label htmlFor="custom-slot-date" className="label text-xs">
              Date
            </label>
            <input
              id="custom-slot-date"
              type="date"
              value={date}
              min={todayString()}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              className="input text-sm"
            />
          </div>

          {/* Time input */}
          <div>
            <label htmlFor="custom-slot-time" className="label text-xs">
              Start Time
              <span className="text-stone-400 font-normal ml-1">(HH:mm, 24-hour)</span>
            </label>
            <input
              id="custom-slot-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={submitting}
              className="input text-sm font-mono"
              step={60}
            />
            {/* Quick departure-time presets */}
            <div className="flex gap-1.5 mt-1.5">
              {(["09:00", "11:30", "13:30"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStartTime(t)}
                  disabled={submitting}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-xs font-mono font-medium border transition-all",
                    startTime === t
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-stone-200 text-stone-500 hover:border-teal-300 hover:text-teal-700"
                  )}
                >
                  {t}
                </button>
              ))}
              <span className="text-xs text-stone-400 self-center ml-1">
                Standard departures
              </span>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label htmlFor="custom-slot-capacity" className="label text-xs">
              Max Capacity
            </label>
            <input
              id="custom-slot-capacity"
              type="number"
              value={capacity}
              min={1}
              max={500}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              disabled={submitting}
              className="input text-sm"
            />
            <p className="text-xs text-stone-400 mt-1">
              Default: Rafting = {CAPACITY.RAFTING} · Canyoning = {CAPACITY.CANYONING}
            </p>
          </div>

          {/* Field-level error */}
          {fieldError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {fieldError}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2 px-6 pb-5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="btn btn-outline btn-sm flex-1"
          >
            Cancel
          </button>
          <button
            id="custom-slot-submit"
            onClick={handleSubmit}
            disabled={submitting || productsLoading || products.length === 0}
            className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-1.5"
            style={{
              background:
                submitting || productsLoading || products.length === 0
                  ? undefined
                  : "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <CalendarPlus className="w-3.5 h-3.5" />
                Create Slot
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Toolbar Component ───────────────────────────────────────────────────

export default function AdminBookingsToolbar() {
  const router = useRouter();

  // ── Bulk Complete state ───────────────────────────────────────────────────
  const [isBulkCompleting, startBulkTransition] = useTransition();
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // ── Custom Slot modal state ───────────────────────────────────────────────
  const [showSlotModal, setShowSlotModal] = useState(false);

  // ── Toast state ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const showSuccess = useCallback((message: string) => {
    setToast({ message, type: "success" });
    router.refresh();
  }, [router]);

  const showError = useCallback((message: string) => {
    setToast({ message, type: "error" });
  }, []);

  // ── Bulk complete handler ─────────────────────────────────────────────────
  const handleBulkComplete = () => {
    if (!confirm("Mark all past CONFIRMED bookings as COMPLETED? This cannot be undone.")) return;
    setBulkResult(null);
    startBulkTransition(async () => {
      const result = await bulkCompleteBookings();
      if (result.error) {
        setBulkResult(`Error: ${result.error}`);
      } else if (result.updated === 0) {
        setBulkResult("No past bookings to complete.");
      } else {
        setBulkResult(`✓ ${result.updated} booking${result.updated !== 1 ? "s" : ""} marked COMPLETED.`);
        router.refresh();
      }
    });
  };

  return (
    <>
      {/* ── Toolbar buttons ── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {/* Create Custom Slot */}
          <button
            id="admin-create-custom-slot"
            onClick={() => setShowSlotModal(true)}
            className="btn btn-outline btn-sm flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 text-teal-700 border-teal-200 hover:bg-teal-50 hover:border-teal-400"
            title="Create a custom one-off availability slot"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Custom Slot
          </button>

          {/* Mark Past Complete */}
          <button
            id="admin-bulk-complete"
            onClick={handleBulkComplete}
            disabled={isBulkCompleting}
            className="btn btn-outline btn-sm flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            title="Mark all past CONFIRMED bookings as COMPLETED"
          >
            {isBulkCompleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            {isBulkCompleting ? "Working…" : "Mark Past Complete"}
          </button>
        </div>

        {bulkResult && (
          <p
            className={`text-xs px-1 ${
              bulkResult.startsWith("Error") ? "text-red-600" : "text-teal-700"
            }`}
          >
            {bulkResult}
          </p>
        )}
      </div>

      {/* ── Create Slot Modal ── */}
      {showSlotModal && (
        <CreateSlotModal
          onClose={() => setShowSlotModal(false)}
          onSuccess={showSuccess}
          onError={showError}
        />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}
    </>
  );
}
