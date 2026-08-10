import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SignOutButton from "@/components/admin/SignOutButton";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import { getComboQueueCount } from "@/app/actions/admin/combo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Fetch combo badge count for sidebar — falls back to 0 on error
  const comboBadgeCount = session ? await getComboQueueCount() : 0;

  return (
    <div
      className="flex min-h-screen w-full overflow-x-hidden"
      style={{ background: "#f8faf9" }}
    >
      {session ? (
        <>
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <div className="print:hidden">
            <AdminSidebar comboBadgeCount={comboBadgeCount} />
          </div>

          {/* ── Main column ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 w-full max-w-[100vw] lg:max-w-[calc(100vw-220px)] overflow-x-hidden">

            {/* ── Top bar ───────────────────────────────────────────── */}
            <header
              className="bg-white/90 backdrop-blur-sm px-4 sm:px-6 h-16
                         flex items-center justify-between flex-shrink-0 print:hidden
                         sticky top-0 z-10 pl-14 lg:pl-6"
              style={{ borderBottom: "1px solid rgba(13,148,136,0.08)" }}
            >
              {/* Dynamic breadcrumb */}
              <AdminBreadcrumb />

              {/* Right: bell + email + sign-out */}
              <div className="flex items-center gap-2 sm:gap-3">
                <AdminNotificationBell />

                {/* Email chip */}
                <span
                  className="text-xs text-stone-500 hidden sm:inline-flex items-center
                             px-2.5 py-1 rounded-full bg-stone-100 truncate max-w-[180px]"
                >
                  {session.user?.email}
                </span>

                <SignOutButton />
              </div>
            </header>

            {/* ── Page content — generous but bounded padding ──────── */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 print:p-0 print:w-full max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>
        </>
      ) : (
        <main className="flex-1 w-full flex items-center justify-center">
          {children}
        </main>
      )}
    </div>
  );
}