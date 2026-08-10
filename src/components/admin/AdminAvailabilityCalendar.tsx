"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Loader2, X, Save } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SlotInfo = {
  id: string;
  date: string;
  startTime: string;
  maxCapacity: number;
  bookedCount: number;
  heldCount: number;
  remaining: number;
  status: string;
  isBlocked: boolean;
  blockedReason?: string | null;
  adminNote?: string | null;
  bookingCount: number;
};

// ─── Status colors ──────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  available: "bg-teal-50 border-teal-200",
  limited: "bg-amber-50 border-amber-200",
  full: "bg-red-50 border-red-200",
  blocked: "bg-stone-100 border-stone-200",
  special: "bg-purple-50 border-purple-200",
  closed: "bg-stone-100 border-stone-200",
};

const STATUS_DOT: Record<string, string> = {
  available: "bg-teal-400",
  limited: "bg-amber-400",
  full: "bg-red-400",
  blocked: "bg-stone-400",
  special: "bg-purple-400",
  closed: "bg-stone-400",
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

// ─── Edit Modal ─────────────────────────────────────────────────────────────────

interface EditModalProps {
  slot: SlotInfo;
  onClose: () => void;
  onSaved: () => void;
}

const SLOT_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "BLOCKED",   label: "Blocked" },
  { value: "SPECIAL",   label: "Special Event" },
  { value: "CLOSED",    label: "Closed" },
];

// DB enum → UI label mapping (inverse of what the PATCH route does)
// DB:  OPEN → UI: AVAILABLE  (everything else maps 1-to-1)
function dbStatusToUi(dbStatus: string, isBlocked: boolean): string {
  if (isBlocked) return "BLOCKED"; // isBlocked always wins
  if (dbStatus === "OPEN" || dbStatus === "AVAILABLE") return "AVAILABLE";
  return dbStatus; // BLOCKED, SPECIAL, CLOSED pass through
}

function EditSlotModal({ slot, onClose, onSaved }: EditModalProps) {
  const [capacity, setCapacity] = useState(String(slot.maxCapacity));
  const [startTime, setStartTime] = useState(slot.startTime);
  const [status, setStatus] = useState(
    // Convert DB status → UI display value so the dropdown always has a valid option
    dbStatusToUi(slot.status, slot.isBlocked)
  );
  const [adminNote, setAdminNote] = useState(slot.adminNote ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedCap = parseInt(capacity, 10);
  const isCapacityInvalid = isNaN(parsedCap) || parsedCap < slot.bookedCount || parsedCap < 1;

  const handleSave = async () => {
    if (isCapacityInvalid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/availability/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxCapacity: parsedCap,
          startTime,
          status,
          adminNote: adminNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (slot.bookedCount > 0) return;
    if (!confirm("Are you sure you want to delete this slot? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/availability/${slot.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900">Edit Slot</h3>
            <p className="text-sm text-stone-500 mt-0.5">
              {slot.date} · {slot.startTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current state info */}
        <div className="bg-stone-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-stone-400">Booked</p>
            <p className="font-bold text-stone-900">{slot.bookedCount}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Held</p>
            <p className="font-bold text-amber-600">{slot.heldCount}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Remaining</p>
            <p className="font-bold text-teal-600">{slot.remaining}</p>
          </div>
        </div>

        {/* Capacity */}
        <div>
          <label className="label text-xs">Max Capacity</label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="input text-sm"
            min={slot.bookedCount}
            max={200}
          />
          {isCapacityInvalid && (
            <p className="text-xs text-red-500 mt-1">
              ⚠ Capacity must be a whole number, at least {slot.bookedCount}.
            </p>
          )}
        </div>

        {/* Start time */}
        <div>
          <label className="label text-xs">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input text-sm font-mono"
          />
        </div>

        {/* Status — includes SPECIAL */}
        <div>
          <label className="label text-xs">Slot Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input text-sm"
          >
            {SLOT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {status === "SPECIAL" && (
            <p className="text-xs text-purple-600 mt-1">
              Special event slots are highlighted in purple on the calendar.
            </p>
          )}
          {status === "BLOCKED" && (
            <p className="text-xs text-red-500 mt-1">
              Blocked slots are hidden from guests and cannot be booked.
            </p>
          )}
        </div>

        {/* Admin note */}
        <div>
          <label className="label text-xs">Admin Note (internal only)</label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="input text-sm resize-none"
            rows={2}
            placeholder="e.g. International tour group, restricted access..."
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="btn btn-outline btn-sm flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || isCapacityInvalid}
              className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-1.5"
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
          <button
            onClick={handleDelete}
            disabled={loading || slot.bookedCount > 0}
            className="w-full btn btn-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
          >
            Delete Slot
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface Props {
  slots: SlotInfo[];
  year: number;
  month: number;
  view: "calendar" | "list";
  productId: string;
}

export default function AdminAvailabilityCalendar({ slots, year, month, view, productId }: Props) {
  const router = useRouter();
  const [editingSlot, setEditingSlot] = useState<SlotInfo | null>(null);

  const byDate = new Map<string, SlotInfo[]>();
  for (const s of slots) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  }

  const handleSaved = () => {
    setEditingSlot(null);
    router.refresh();
  };

  // ── List view ────────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <>
        {editingSlot && (
          <EditSlotModal
            slot={editingSlot}
            onClose={() => setEditingSlot(null)}
            onSaved={handleSaved}
          />
        )}
        <div className="card overflow-hidden">
          <div className="w-full overflow-x-auto">
          <table className="admin-table" style={{ minWidth: "640px" }}>
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Date</th>
                  <th className="whitespace-nowrap">Time</th>
                  <th className="whitespace-nowrap">Capacity</th>
                  <th className="whitespace-nowrap">Booked</th>
                  <th className="whitespace-nowrap">Held</th>
                  <th className="whitespace-nowrap">Remaining</th>
                  <th className="whitespace-nowrap">Status</th>
                  <th className="whitespace-nowrap">Note</th>
                  <th className="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-stone-500 py-8">
                      No slots for this month
                    </td>
                  </tr>
                ) : (
                  slots.map((s) => (
                    <tr key={s.id}>
                      <td className="text-sm font-medium whitespace-nowrap">{s.date}</td>
                      <td className="text-sm font-mono whitespace-nowrap">{s.startTime}</td>
                      <td className="text-sm whitespace-nowrap">{s.maxCapacity}</td>
                      <td className="text-sm whitespace-nowrap">{s.bookedCount}</td>
                      <td className="text-sm text-amber-600 whitespace-nowrap">{s.heldCount}</td>
                      <td className="text-sm font-medium whitespace-nowrap">{s.remaining}</td>
                      <td className="whitespace-nowrap">
                        <span
                          className={cn(
                            "badge text-xs",
                            s.status === "blocked" || s.isBlocked
                              ? "badge-red"
                              : s.status === "special"
                              ? "badge-purple"
                              : "badge-gray"
                          )}
                        >
                          {s.isBlocked
                            ? "BLOCKED"
                            : s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-xs text-stone-400 max-w-[120px] truncate whitespace-nowrap">
                        {s.adminNote ?? "—"}
                      </td>
                      <td className="whitespace-nowrap">
                        <button
                          onClick={() => setEditingSlot(s)}
                          className="text-xs text-teal-600 hover:underline font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  // ── Calendar view ─────────────────────────────────────────────────────────────

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      {editingSlot && (
        <EditSlotModal
          slot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onSaved={handleSaved}
        />
      )}
      <div className="card p-4 overflow-x-auto">
        <div style={{ minWidth: "480px" }}>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {dayLabels.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const daySlots = byDate.get(dateStr) ?? [];

            const hasSpecial = daySlots.some((s) => s.status === "special");
            const hasBlocked = daySlots.some((s) => s.isBlocked);
            const hasAvail = daySlots.some((s) => s.status === "available");
            const hasLimited = daySlots.some((s) => s.status === "limited");
            const allFull = daySlots.length > 0 && daySlots.every((s) => s.status === "full" || s.isBlocked);

            const cellStatus = hasSpecial
              ? "special"
              : hasBlocked
              ? "blocked"
              : allFull
              ? "full"
              : hasLimited
              ? "limited"
              : hasAvail
              ? "available"
              : "none";

            return (
              <div
                key={day}
                className={cn(
                  "rounded-lg border p-1 min-h-[56px] transition-all",
                  cellStatus !== "none" ? STATUS_COLOR[cellStatus] : "border-stone-100",
                )}
              >
                <p className="text-xs font-semibold text-stone-700 mb-1">{day}</p>
                {daySlots.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setEditingSlot(s)}
                    className="flex items-center gap-1 mb-0.5 w-full text-left hover:opacity-70 transition-opacity"
                    title={`Edit ${s.date} ${s.startTime}`}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_DOT[s.status])} />
                    <span className="text-[10px] text-stone-600 font-mono">{s.startTime}</span>
                    <span className="text-[10px] text-stone-400">{s.remaining}/{s.maxCapacity}</span>
                  </button>
                ))}
                {daySlots.length > 3 && (
                  <p className="text-[9px] text-stone-400">+{daySlots.length - 3} more</p>
                )}
                {daySlots.length === 0 && (
                  <p className="text-[10px] text-stone-300">No slots</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-stone-100 text-xs text-stone-500">
          {Object.entries(STATUS_DOT).map(([status, dot]) => (
            <span key={status} className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", dot)} />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-stone-400 mt-2">Click any slot row or calendar dot to edit</p>
        </div>
      </div>
    </>
  );
}
