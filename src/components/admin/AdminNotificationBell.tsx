"use client";

/**
 * AdminNotificationBell — Task 5 Upgrade
 *
 * Features:
 *  1. Tabbed dropdown with 3 categories: Bookings | Requests | Contacts
 *  2. Per-category unread counts with a combined total badge on the bell
 *  3. localStorage per-category timestamps track "bookings" read state
 *     (Contacts read state is persisted server-side via markContactRead)
 *  4. Clicking a notification:
 *     - Marks it read locally (all categories)
 *     - For contacts: calls markContactRead() to persist isRead=true in DB
 *     - Navigates to the relevant admin detail page
 *  5. "Mark all read" marks all categories in one click
 *  6. Upgrade 3: Exported hook `useAutoMarkCategoryRead(category)` — call
 *     this from the relevant admin page layout to auto-mark on page visit.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, X, CheckCheck, Loader2,
  BookOpen, MessageSquare, Phone,
} from "lucide-react";
import { markContactRead, markAllContactsRead } from "@/app/actions/admin/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingNotif {
  id: string;
  bookingId: string | null;
  event: string;
  channel: string;
  subject: string | null;
  status: string;
  sentAt: string;
  booking?: { reference: string; id: string } | null;
}

interface RequestNotif {
  id: string;
  type: "CANCELLATION" | "RESCHEDULE";
  bookingId: string | null;
  reference: string | null;
  leadName: string | null;
  createdAt: string;
}

interface ContactNotif {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  activityInterest: string | null;
  createdAt: string;
  isRead: boolean;
}

interface UnreadCounts {
  bookings: number;
  requests: number;
  contacts: number;
  total: number;
}

interface ApiResponse {
  bookings: BookingNotif[];
  requests: RequestNotif[];
  contacts: ContactNotif[];
  unread: UnreadCounts;
}

type Tab = "bookings" | "requests" | "contacts";

// ─── localStorage helpers ──────────────────────────────────────────────────────

const LS_BOOKINGS_KEY = "admin:notifs:lastRead:bookings";

function getBookingsLastRead(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_BOOKINGS_KEY);
}

function setBookingsLastRead(iso: string) {
  localStorage.setItem(LS_BOOKINGS_KEY, iso);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const EVENT_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED:       "Confirmed",
  BOOKING_CANCELLED:       "Cancelled",
  BOOKING_COMPLETED:       "Completed",
  REFUND_ISSUED:           "Refund",
  CANCELLATION_REQUESTED:  "Cancel Request",
  RESCHEDULE_REQUESTED:    "Reschedule Request",
  REMINDER_24H:            "Reminder Sent",
};
function eventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event.replace(/_/g, " ");
}

// ─── Exported hook: auto-mark a category as read when admin visits the page ──

/**
 * Upgrade 3: Drop `useAutoMarkCategoryRead("contacts")` into the Contacts page
 * layout (or a Client wrapper) to automatically clear the unread badge when
 * the admin views that section.
 */
export function useAutoMarkCategoryRead(category: Tab) {
  useEffect(() => {
    if (category === "contacts") {
      markAllContactsRead().catch(console.error);
    }
    if (category === "bookings") {
      setBookingsLastRead(new Date().toISOString());
    }
    // "requests" — PENDING_REVIEW count automatically drops as admin resolves them
  }, [category]);
}

// ─── Tab badge ────────────────────────────────────────────────────────────────

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white px-1"
      style={{ background: "var(--color-teal-600, #0d9488)" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("bookings");

  const [bookings, setBookings] = useState<BookingNotif[]>([]);
  const [requests, setRequests] = useState<RequestNotif[]>([]);
  const [contacts, setContacts] = useState<ContactNotif[]>([]);
  const [unread, setUnread] = useState<UnreadCounts>({ bookings: 0, requests: 0, contacts: 0, total: 0 });

  // Locally-tracked read IDs for immediate UI feedback (all categories)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const lastRead = getBookingsLastRead();
      const params = new URLSearchParams();
      if (lastRead) params.set("bookingsSince", lastRead);
      const res = await fetch(`/api/admin/notifications?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: ApiResponse = await res.json();
      setBookings(data.bookings ?? []);
      setRequests(data.requests ?? []);
      setContacts(data.contacts ?? []);
      setUnread(data.unread ?? { bookings: 0, requests: 0, contacts: 0, total: 0 });
    } catch {
      // Silently fail — bell must never break the admin UI
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Initial load + 60s polling
  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggle = () => {
    setOpen((prev) => !prev);
    if (!open) fetchNotifications(false);
  };

  const handleMarkAllRead = async () => {
    const now = new Date().toISOString();
    setBookingsLastRead(now);
    // Mark all contacts server-side
    await markAllContactsRead().catch(console.error);
    // Update local state immediately
    setUnread({ bookings: 0, requests: 0, contacts: 0, total: 0 });
    setReadIds(new Set([
      ...bookings.map((b) => b.id),
      ...requests.map((r) => r.id),
      ...contacts.map((c) => c.id),
    ]));
    setContacts((prev) => prev.map((c) => ({ ...c, isRead: true })));
  };

  const handleClickBookingNotif = (n: BookingNotif) => {
    markLocalRead(n.id);
    setOpen(false);
    if (n.bookingId) {
      router.push(`/admin/bookings/${n.bookingId}`);
    }
  };

  const handleClickRequestNotif = (r: RequestNotif) => {
    markLocalRead(r.id);
    setOpen(false);
    if (r.bookingId) {
      router.push(`/admin/requests?bookingId=${r.bookingId}`);
    }
  };

  const handleClickContactNotif = async (c: ContactNotif) => {
    markLocalRead(c.id);
    // Mark read server-side (Upgrade 2)
    await markContactRead(c.id).catch(console.error);
    setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, isRead: true } : x));
    setUnread((prev) => ({
      ...prev,
      contacts: Math.max(0, prev.contacts - 1),
      total: Math.max(0, prev.total - 1),
    }));
    setOpen(false);
    router.push(`/admin/contacts`);
  };

  function markLocalRead(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
  }

  const isRead = (id: string) => readIds.has(id);

  // ── Render ────────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "bookings", label: "Bookings", icon: <BookOpen className="w-3.5 h-3.5" />, count: unread.bookings },
    { key: "requests", label: "Requests", icon: <MessageSquare className="w-3.5 h-3.5" />, count: unread.requests },
    { key: "contacts", label: "Contacts", icon: <Phone className="w-3.5 h-3.5" />, count: unread.contacts },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        id="admin-notification-bell"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 text-stone-500 animate-spin" />
        ) : (
          <Bell className={`w-5 h-5 transition-colors duration-200 ${open ? "text-teal-600" : "text-stone-500"}`} />
        )}
        {unread.total > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none px-1 shadow-sm"
            style={{ background: "var(--color-teal-600, #0d9488)" }}
          >
            {unread.total > 99 ? "99+" : unread.total}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-[400px] bg-white rounded-2xl z-50 overflow-hidden transition-all duration-200"
          style={{
            boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.07)",
          }}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "linear-gradient(to bottom, #fafaf9, #ffffff)" }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-stone-900 text-sm tracking-tight">Notifications</h3>
              {unread.total > 0 && (
                <span className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-full">
                  {unread.total} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {unread.total > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pill tabs */}
          <div className="flex gap-1 px-3 py-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "#fafaf9" }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${
                  tab === t.key
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                }`}
              >
                {t.icon}
                {t.label}
                {t.count > 0 && (
                  <span className={`min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${
                    tab === t.key ? "bg-white/25 text-white" : "bg-teal-600 text-white"
                  }`}>
                    {t.count > 99 ? "99+" : t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto">

            {/* BOOKINGS */}
            {tab === "bookings" && (
              bookings.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <BookOpen className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">No recent booking events</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                  {bookings.map((n) => {
                    const read = isRead(n.id);
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClickBookingNotif(n)}
                        className={`w-full text-left px-4 py-3 transition-all duration-150 ${read ? "opacity-50" : "hover:bg-teal-50/40"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${read ? "bg-transparent" : "bg-teal-500"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-xs font-semibold ${read ? "text-stone-500" : "text-stone-800"}`}>{eventLabel(n.event)}</span>
                              <span className="text-[10px] font-medium text-stone-300 uppercase tracking-wide">{n.channel}</span>
                            </div>
                            <p className="text-xs text-stone-500 truncate">
                              {n.booking?.reference && <span className="font-mono text-teal-600 mr-1.5">{n.booking.reference}</span>}
                              {n.subject ?? "—"}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-[10px] text-stone-400">{relativeTime(n.sentAt)}</p>
                            {n.status !== "sent" && <p className="text-[10px] text-red-400 capitalize">{n.status}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* REQUESTS */}
            {tab === "requests" && (
              requests.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <MessageSquare className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">No pending requests</p>
                  <p className="text-xs text-stone-300 mt-1">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                  {requests.map((r) => {
                    const read = isRead(r.id);
                    const isCancellation = r.type === "CANCELLATION";
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleClickRequestNotif(r)}
                        className={`w-full text-left px-4 py-3 transition-all duration-150 ${read ? "opacity-50" : "hover:bg-amber-50/40"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${read ? "bg-transparent" : "bg-amber-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${isCancellation ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-700"}`}>
                                {isCancellation ? "CANCEL" : "RESCHEDULE"}
                              </span>
                              <span className="text-xs font-semibold text-stone-700 truncate">{r.leadName ?? "Guest"}</span>
                            </div>
                            {r.reference && <p className="text-xs font-mono text-teal-600">{r.reference}</p>}
                          </div>
                          <p className="flex-shrink-0 text-[10px] text-stone-400 mt-1">{relativeTime(r.createdAt)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* CONTACTS */}
            {tab === "contacts" && (
              contacts.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Phone className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                  <p className="text-sm text-stone-400">No unread messages</p>
                  <p className="text-xs text-stone-300 mt-1">Inbox is clear</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                  {contacts.map((c) => {
                    const read = c.isRead || isRead(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleClickContactNotif(c)}
                        className={`w-full text-left px-4 py-3 transition-all duration-150 ${read ? "opacity-50" : "hover:bg-red-50/30"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${read ? "bg-transparent" : "bg-red-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-semibold text-stone-800 truncate">{c.name}</span>
                              {c.activityInterest && (
                                <span className="text-[10px] font-medium text-stone-300 uppercase tracking-wide flex-shrink-0">
                                  {c.activityInterest}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 truncate">{c.subject ?? c.email}</p>
                          </div>
                          <p className="flex-shrink-0 text-[10px] text-stone-400 mt-1">{relativeTime(c.createdAt)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* ── Footer ── */}
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: "#fafaf9" }}
          >
            {[
              { label: "Bookings", href: "/admin/bookings" },
              { label: "Requests", href: "/admin/requests" },
              { label: "Contacts", href: "/admin/contacts" },
            ].map((l) => (
              <button
                key={l.href}
                onClick={() => { setOpen(false); router.push(l.href); }}
                className="text-[11px] text-stone-400 hover:text-teal-600 transition-colors duration-150 font-medium"
              >
                {l.label} →
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
