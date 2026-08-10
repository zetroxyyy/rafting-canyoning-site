import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AdminContactsTable from "@/components/admin/AdminContactsTable";
import AutoMarkRead from "@/components/admin/AutoMarkRead";
import { Search, Mail } from "lucide-react";

/**
 * AdminContactsPage — Enterprise Polish
 *
 * UI upgrades:
 *  1. Filter bar: replaced plain text input with icon-prefixed search
 *     (mirrors AdminBookingsFilters visual language).
 *  2. Filter selects: given consistent widths with min-w constraints.
 *  3. Submit button: now shows a loading state via form's onSubmit handler —
 *     actually we use a native form submit for simplicity; the button text
 *     is clear and the full-page navigation is fast enough.
 *  4. Unread count chip: moved into a premium badge component style.
 *  5. Header: subtitle typography refined with consistent muting.
 *  6. Pagination: aligned with bookings page style.
 */

interface Props {
  searchParams: Promise<{ page?: string; search?: string; isRead?: string; isReplied?: string }>;
}

export default async function AdminContactsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const pageSize = 30;

  const where: Record<string, unknown> = {};
  if (sp.search) {
    where.OR = [
      { name:    { contains: sp.search, mode: "insensitive" } },
      { email:   { contains: sp.search, mode: "insensitive" } },
      { message: { contains: sp.search, mode: "insensitive" } },
    ];
  }
  if (sp.isRead    === "false") where.isRead    = false;
  if (sp.isReplied === "false") where.isReplied = false;

  const [submissions, total, unreadCount] = await Promise.all([
    prisma.contactSubmission.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.contactSubmission.count({ where }),
    prisma.contactSubmission.count({ where: { isRead: false } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = !!(sp.search || sp.isRead || sp.isReplied);

  return (
    <div className="space-y-6">
      {/* Auto-mark contact notifications read when admin visits this page */}
      <AutoMarkRead category="contacts" />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">Contact Inbox</h2>
          <p className="text-sm text-stone-400 mt-0.5 font-medium">
            {unreadCount > 0 ? (
              <>
                <span
                  className="inline-flex items-center gap-1 text-amber-600 font-semibold"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
                  />
                  {unreadCount} unread
                </span>
                <span className="text-stone-300 mx-1.5">·</span>
              </>
            ) : (
              <>
                <span className="text-emerald-600 font-semibold">All read</span>
                <span className="text-stone-300 mx-1.5">·</span>
              </>
            )}
            {total} total submission{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Filter card — polished to match AdminBookingsFilters ── */}
      <div className="card p-5">
        <form method="get" className="space-y-4">
          {/* Search input with icon */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={sp.search}
              placeholder="Search by name, email, or message…"
              className="input w-full"
              style={{ paddingLeft: "2.5rem" }}
              aria-label="Search contacts"
            />
          </div>

          {/* Filter selects row */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              name="isRead"
              defaultValue={sp.isRead ?? ""}
              className="input py-1.5 text-sm flex-1 min-w-[140px]"
              aria-label="Filter by read status"
            >
              <option value="">All Messages</option>
              <option value="false">Unread only</option>
            </select>

            <select
              name="isReplied"
              defaultValue={sp.isReplied ?? ""}
              className="input py-1.5 text-sm flex-1 min-w-[140px]"
              aria-label="Filter by reply status"
            >
              <option value="">All Replies</option>
              <option value="false">Not replied</option>
            </select>

            <button
              type="submit"
              className="btn btn-outline btn-sm flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Filter
            </button>

            {hasFilters && (
              <Link
                href="/admin/contacts"
                className="btn btn-ghost btn-sm text-stone-500"
              >
                Clear filters
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* ── Submissions list ── */}
      <AdminContactsTable submissions={submissions} />

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-400 font-medium">
            Page {page} of {totalPages}
            <span className="text-stone-300 mx-1.5">·</span>
            {total} submissions
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/contacts?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}
                className="btn btn-outline btn-sm"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/contacts?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}
                className="btn btn-outline btn-sm"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
