import { prisma } from "@/lib/prisma";
import { getAdminMonthSlots } from "@/lib/services/availability";
import AdminAvailabilityCalendar from "@/components/admin/AdminAvailabilityCalendar";
import AdminAvailabilityActions from "@/components/admin/AdminAvailabilityActions";

interface Props {
  searchParams: Promise<{ year?: string; month?: string; view?: string; productId?: string }>;
}

export default async function AdminAvailabilityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()));
  const month = parseInt(sp.month ?? String(now.getMonth() + 1));
  const view = sp.view ?? "calendar";

  // Get products for selector
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, nameEn: true, activityType: true },
  });

  const productId = sp.productId ?? products[0]?.id ?? "";
  const slots = productId ? await getAdminMonthSlots(productId, year, month) : [];

  const selectedProduct = products.find(p => p.id === productId) || products[0];
  const activityType = selectedProduct?.activityType || "RAFTING";

  const MONTH_NAMES = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Availability</h2>
          <p className="text-sm text-stone-500 mt-0.5">Manage slots, capacity, and blocks</p>
        </div>
        <div className="flex gap-2">
          <a href={`/admin/availability?${new URLSearchParams({ ...sp, view: "calendar" })}`}
            className={`btn btn-sm ${view !== "list" ? "btn-primary" : "btn-outline"}`}>
            Calendar
          </a>
          <a href={`/admin/availability?${new URLSearchParams({ ...sp, view: "list" })}`}
            className={`btn btn-sm ${view === "list" ? "btn-primary" : "btn-outline"}`}>
            List
          </a>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {/* Product selector */}
        <form method="get" className="flex flex-wrap gap-2 items-center flex-1">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="view" value={view} />
          <select name="productId" defaultValue={productId}
            className="input text-sm py-1.5">
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.nameEn} ({p.activityType})</option>
            ))}
          </select>
          <button type="submit" className="btn btn-outline btn-sm">Apply</button>

          {/* Month nav */}
          <div className="flex items-center gap-2">
            <a href={`/admin/availability?${new URLSearchParams({
              ...sp,
              productId,
              year: month === 1 ? String(year - 1) : String(year),
              month: month === 1 ? "12" : String(month - 1),
            })}`}
              className="btn btn-outline btn-sm">‹</a>
            <span className="font-semibold text-stone-900 whitespace-nowrap">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <a href={`/admin/availability?${new URLSearchParams({
              ...sp,
              productId,
              year: month === 12 ? String(year + 1) : String(year),
              month: month === 12 ? "1" : String(month + 1),
            })}`}
              className="btn btn-outline btn-sm">›</a>
          </div>
        </form>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminAvailabilityCalendar
            slots={slots}
            year={year}
            month={month}
            view={view as "calendar" | "list"}
            productId={productId}
          />
        </div>
        <div>
          <AdminAvailabilityActions
            key={productId}
            productId={productId}
            activityType={activityType}
            year={year}
            month={month}
          />
        </div>
      </div>
    </div>
  );
}
