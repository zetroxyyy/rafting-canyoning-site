"use client";

/**
 * ComboQueueClient
 *
 * Client shell for the /admin/combos page.
 * Renders the list of unscheduled Combo bookings in an urgent priority queue
 * and handles opening the ComboScheduleModal when "Schedule" is clicked.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarSearch,
  Waves,
  Mountain,
  Clock,
  User,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
} from "lucide-react";
import type { ComboQueueBooking } from "@/app/actions/admin/combo";
import ComboScheduleModal from "@/components/admin/ComboScheduleModal";
import { cn } from "@/lib/cn";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

function formatJpy(n: number) {
  return `¥${n.toLocaleString("en-US")}`;
}

function daysUntil(d: Date | null | undefined): number | null {
  if (!d) return null;
  const targetStr = new Date(d).toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const nowStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  
  const targetJst = new Date(targetStr + "T00:00:00Z");
  const nowJst = new Date(nowStr + "T00:00:00Z");
  
  const diffTime = targetJst.getTime() - nowJst.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// ─── Urgency badge ────────────────────────────────────────────────────────────

function UrgencyBadge({ comboDate }: { comboDate: Date | null }) {
  const days = daysUntil(comboDate);

  if (days === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500">
        No date
      </span>
    );
  }

  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </span>
    );
  }

  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
        <AlertTriangle className="w-3.5 h-3.5" />
        Today
      </span>
    );
  }

  if (days <= 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
        <Clock className="w-3 h-3" />
        {days}d left
      </span>
    );
  }

  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
        <Clock className="w-3 h-3" />
        {days}d left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
      <Clock className="w-3 h-3" />
      {days}d left
    </span>
  );
}

// ─── Combo Card ───────────────────────────────────────────────────────────────

interface ComboCardProps {
  booking: ComboQueueBooking;
  onSchedule: (booking: ComboQueueBooking) => void;
}

function ComboCard({ booking, onSchedule }: ComboCardProps) {
  const paxCount = booking.adultCount + booking.childCount;
  const days = daysUntil(booking.comboDate);
  const isUrgent = days !== null && days <= 2;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white transition-all duration-200 hover:shadow-md overflow-hidden",
        isUrgent
          ? "border-orange-200 shadow-[0_0_0_1px_rgba(249,115,22,0.2)]"
          : "border-stone-100 shadow-sm"
      )}
    >
      {/* Urgency stripe */}
      {isUrgent && (
        <div
          className="h-1 w-full"
          style={{
            background: days === 0
              ? "linear-gradient(90deg, #ef4444 0%, #f97316 100%)"
              : "linear-gradient(90deg, #f97316 0%, #fbbf24 100%)",
          }}
        />
      )}

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Combo badge */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                <Waves className="w-3.5 h-3.5 mr-0.5 flex-shrink-0" />
                Rafting + Canyoning Combo
              </span>

              <code className="text-xs font-mono text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">
                {booking.reference}
              </code>

              <UrgencyBadge comboDate={booking.comboDate} />
            </div>

            <h3 className="font-semibold text-stone-900 mt-2 text-sm">{booking.leadName}</h3>
          </div>

          <button
            onClick={() => onSchedule(booking)}
            id={`schedule-combo-${booking.id}`}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
            style={{
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              color: "white",
              boxShadow: "0 2px 8px rgba(13,148,136,0.25)",
            }}
          >
            Schedule
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info row */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {booking.adultCount} adult{booking.adultCount !== 1 ? "s" : ""}
            {booking.childCount > 0 && `, ${booking.childCount} child${booking.childCount !== 1 ? "ren" : ""}`}
          </span>
          {booking.leadPhone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {booking.leadPhone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {booking.leadEmail}
          </span>
          <span className="font-medium text-teal-700">{formatJpy(booking.totalJpy)}</span>
        </div>

        {/* Requested date */}
        {booking.comboDate && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <CalendarSearch className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-stone-500">Requested:</span>
            <span className="font-medium text-stone-700">{formatDate(booking.comboDate, { weekday: "long", month: "long", day: "numeric" })}</span>
          </div>
        )}

        {/* Slot assignment status */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {/* Rafting slot */}
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
            booking.slotId
              ? "bg-teal-50 border border-teal-200"
              : "bg-stone-50 border border-stone-200 border-dashed"
          )}>
            <Waves className={cn("w-3.5 h-3.5 flex-shrink-0", booking.slotId ? "text-teal-600" : "text-stone-300")} />
            <div className="min-w-0">
              <p className="font-medium text-stone-600">Rafting</p>
              {booking.slotId && booking.slot ? (
                <p className="text-teal-700 font-semibold">{booking.slot.startTime}</p>
              ) : (
                <p className="text-stone-400 italic">Not scheduled</p>
              )}
            </div>
          </div>

          {/* Canyoning slot */}
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
            booking.secondarySlotId
              ? "bg-violet-50 border border-violet-200"
              : "bg-stone-50 border border-stone-200 border-dashed"
          )}>
            <Mountain className={cn("w-3.5 h-3.5 flex-shrink-0", booking.secondarySlotId ? "text-violet-600" : "text-stone-300")} />
            <div className="min-w-0">
              <p className="font-medium text-stone-600">Canyoning</p>
              {booking.secondarySlotId && booking.secondarySlot ? (
                <p className="text-violet-700 font-semibold">{booking.secondarySlot.startTime}</p>
              ) : (
                <p className="text-stone-400 italic">Not scheduled</p>
              )}
            </div>
          </div>
        </div>

        {/* Admin note */}
        {booking.adminNote && (
          <p className="mt-2 text-xs text-stone-400 bg-stone-50 rounded-lg px-3 py-1.5 line-clamp-2">
            {booking.adminNote}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex items-start gap-3 rounded-xl shadow-2xl px-4 py-3 max-w-sm"
      style={{ background: "#f0fdf9", border: "1px solid rgba(13,148,136,0.3)" }}
    >
      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
      <p className="text-sm font-medium text-teal-800 flex-1 leading-snug">{message}</p>
      <button onClick={onDismiss} className="text-teal-400 hover:text-teal-700 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  bookings: ComboQueueBooking[];
}

export default function ComboQueueClient({ bookings }: Props) {
  const router = useRouter();
  const [schedulingBooking, setSchedulingBooking] = useState<ComboQueueBooking | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSuccess = useCallback((ref: string) => {
    setSchedulingBooking(null);
    setSuccessMsg(`Combo Package ${ref} successfully scheduled and confirmed!`);
    router.refresh();
    setTimeout(() => setSuccessMsg(null), 6000);
  }, [router]);

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "linear-gradient(135deg, #f0fdf9 0%, #f5f3ff 100%)", border: "1px solid rgba(13,148,136,0.2)" }}
        >
          <CheckCircle2 className="w-8 h-8 text-teal-500" />
        </div>
        <h3 className="font-bold text-stone-800 text-lg mb-2">All Combos Scheduled</h3>
        <p className="text-stone-400 text-sm max-w-xs">
          No unscheduled Combo Packages right now. New combo bookings will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {bookings.map((b) => (
          <ComboCard
            key={b.id}
            booking={b}
            onSchedule={setSchedulingBooking}
          />
        ))}
      </div>

      {/* Schedule Modal */}
      {schedulingBooking && (
        <ComboScheduleModal
          booking={schedulingBooking}
          onClose={() => setSchedulingBooking(null)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Success toast */}
      {successMsg && (
        <SuccessToast
          message={successMsg}
          onDismiss={() => setSuccessMsg(null)}
        />
      )}
    </>
  );
}
