import Link from "next/link";
import { getAdminBookings } from "@/lib/services/booking";
import AdminBookingsTable from "@/components/admin/AdminBookingsTable";
import AdminBookingsFilters from "@/components/admin/AdminBookingsFilters";
import AdminBookingsToolbar from "@/components/admin/AdminBookingsToolbar";
import AutoMarkRead from "@/components/admin/AutoMarkRead";

// TASK 1: RevenueExportButton removed from this page entirely.
// It now lives on the Revenue Dashboard (src/app/admin/page.tsx) where it
// belongs semantically alongside the financial analytics view.

interface Props {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    paymentStatus?: string;
    activityType?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");

  const { bookings, total, pageSize } = await getAdminBookings({
    page,
    pageSize: 50,
    search: sp.search,
    status: sp.status as never,
    paymentStatus: sp.paymentStatus as never,
    activityType: sp.activityType as never,
    source: sp.source as never,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
  });

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Auto-mark booking notifications read when admin visits this page */}
      <AutoMarkRead category="bookings" />

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Bookings</h2>
          <p className="text-sm text-stone-500 mt-0.5">{total} total</p>
        </div>

        {/* Right-side action group */}
        <div className="flex items-center gap-3">
          {/* Bulk actions (client component) */}
          <AdminBookingsToolbar />

          <Link
            href="/admin/bookings/new"
            id="admin-new-booking"
            className="btn btn-primary btn-sm"
          >
            + New Booking
          </Link>
        </div>
      </div>

      <AdminBookingsFilters current={sp} />
      <AdminBookingsTable bookings={bookings} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Page {page} of {totalPages} · {total} bookings
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/bookings?${new URLSearchParams({ ...sp, page: String(page - 1) })}`}
                className="btn btn-outline btn-sm"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/bookings?${new URLSearchParams({ ...sp, page: String(page + 1) })}`}
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
