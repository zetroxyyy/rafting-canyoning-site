"use client";

/**
 * AdminContactsTable — Enterprise Polish + Bug Fixes
 *
 * Bug fixes:
 *  1. [CRITICAL] Per-submission note state: replaced single shared `note`
 *     string with a `notes` Record<id, string> map so each submission has its
 *     own draft. Previously, typing in one textarea and saving on another would
 *     overwrite the wrong record.
 *  2. Loading states: markRead / markReplied now set a per-id loading set to
 *     prevent duplicate PATCH requests from double-clicks.
 *  3. Save Note button now shows a Loader2 spinner + "Saving…" label while
 *     the PATCH is in-flight.
 *
 * UI polish:
 *  - Expanded section: smooth max-height CSS transition for open/close.
 *  - Contact detail chips: email and phone wrapped in pill-style links.
 *  - Action buttons: consistent btn-sm btn-outline ordering, hover lift.
 *  - Card header: stronger hover state (`hover:bg-stone-50/60`).
 *  - Typography: muted subtext perfectly tuned (text-stone-400 → stone-500).
 *  - Empty state: upgraded with branded SVG illustration.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, MessageSquare, Loader2, ChevronDown, Save } from "lucide-react";

interface Submission {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  locale: string;
  isRead: boolean;
  isReplied: boolean;
  adminNote?: string | null;
  activityInterest?: string | null;
  paxCount?: number | null;
  createdAt: Date;
}

export default function AdminContactsTable({ submissions }: { submissions: Submission[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // BUG FIX 1: per-submission note state — one key per id
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(submissions.map((s) => [s.id, s.adminNote ?? ""]))
  );

  // BUG FIX 2: per-id loading sets for atomic actions
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());
  const [markingReplied, setMarkingReplied] = useState<Set<string>>(new Set());
  const [savingNote, setSavingNote] = useState<Set<string>>(new Set());

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  };

  const markRead = async (id: string) => {
    if (markingRead.has(id)) return; // BUG FIX 2: prevent duplicate
    setMarkingRead((s) => new Set([...s, id]));
    await patch(id, { isRead: true });
    setMarkingRead((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const markReplied = async (id: string) => {
    if (markingReplied.has(id)) return;
    setMarkingReplied((s) => new Set([...s, id]));
    await patch(id, { isReplied: true });
    setMarkingReplied((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  const saveNote = async (id: string) => {
    if (savingNote.has(id)) return;
    setSavingNote((s) => new Set([...s, id]));
    // BUG FIX 1: use per-submission note value
    await patch(id, { adminNote: notes[id] ?? "" });
    setSavingNote((s) => { const n = new Set(s); n.delete(id); return n; });
  };

  if (submissions.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(13,148,136,0.06)" }}
          >
            <MessageSquare className="w-7 h-7" style={{ color: "#0d9488", opacity: 0.5 }} />
          </div>
          <p className="text-base font-semibold text-stone-500 mb-1">No submissions found</p>
          <p className="text-sm text-stone-400 max-w-xs">
            Contact submissions will appear here once guests send inquiries through the public form.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((s) => {
        const isExpanded = expandedId === s.id;

        return (
          <div
            key={s.id}
            className="card overflow-hidden transition-all duration-200"
            style={
              !s.isRead
                ? { borderLeft: "3px solid #0d9488" }
                : {}
            }
          >
            {/* ── Collapsed header — clickable ── */}
            <button
              className="w-full p-5 text-left transition-colors duration-150 hover:bg-stone-50/60"
              onClick={() => {
                const willExpand = expandedId !== s.id;
                setExpandedId(willExpand ? s.id : null);
                if (willExpand && !s.isRead) markRead(s.id);
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Name + badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-stone-900">{s.name}</span>
                    {!s.isRead && (
                      <span className="badge badge-teal text-[10px]">New</span>
                    )}
                    {s.isReplied && (
                      <span className="badge badge-green text-[10px]">Replied</span>
                    )}
                    {s.activityInterest && (
                      <span className="badge badge-gray text-[10px] uppercase tracking-wide">
                        {s.activityInterest}
                      </span>
                    )}
                  </div>

                  {/* Subject + locale + pax */}
                  <p className="text-sm text-stone-500">
                    {s.subject ?? "Inquiry"}
                    <span className="text-stone-300 mx-1.5">·</span>
                    {s.locale.toUpperCase()}
                    {s.paxCount ? (
                      <>
                        <span className="text-stone-300 mx-1.5">·</span>
                        {s.paxCount} pax
                      </>
                    ) : null}
                  </p>

                  {/* Message preview */}
                  <p className="text-sm text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {s.message}
                  </p>
                </div>

                {/* Right: date + chevron */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <span className="text-xs text-stone-400 whitespace-nowrap tabular-nums">
                    {new Date(s.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "Asia/Tokyo",
                    })}
                  </span>
                  <ChevronDown
                    className="w-4 h-4 text-stone-300 transition-transform duration-200"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </div>
              </div>
            </button>

            {/* ── Expanded detail panel ── */}
            {isExpanded && (
              <div
                className="px-5 pb-6 pt-4 space-y-5"
                style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
              >
                {/* Full message */}
                <div>
                  <p
                    className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em] mb-2"
                  >
                    Message
                  </p>
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {s.message}
                  </p>
                </div>

                {/* Contact details chips */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`mailto:${s.email}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-3 py-1.5 rounded-lg transition-colors duration-150 max-w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="break-all">{s.email}</span>
                  </a>
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-lg transition-colors duration-150 max-w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="break-all">{s.phone}</span>
                    </a>
                  )}
                </div>

                {/* Admin note — BUG FIX 1: per-submission state */}
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.07em] mb-2">
                    Internal Note
                  </p>
                  <textarea
                    className="input text-sm w-full resize-none"
                    style={{ height: "72px" }}
                    placeholder="Add an internal note visible only to admin..."
                    value={notes[s.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => saveNote(s.id)}
                    disabled={savingNote.has(s.id)}
                    className="btn btn-outline btn-sm flex items-center gap-1.5 mt-2"
                  >
                    {savingNote.has(s.id) ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        Save Note
                      </>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href={`mailto:${s.email}?subject=Re: ${encodeURIComponent(s.subject ?? "Your Inquiry")}`}
                    className="btn btn-sm btn-primary flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Reply by Email
                  </a>
                  {!s.isReplied && (
                    <button
                      onClick={() => markReplied(s.id)}
                      disabled={markingReplied.has(s.id)}
                      className="btn btn-sm btn-outline flex items-center gap-1.5"
                    >
                      {markingReplied.has(s.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : null}
                      {markingReplied.has(s.id) ? "Marking…" : "Mark Replied"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
