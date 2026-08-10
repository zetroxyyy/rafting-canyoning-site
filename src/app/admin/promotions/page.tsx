import { prisma } from "@/lib/prisma";
import AdminPromoForm from "@/components/admin/AdminPromoForm";
import { formatJpy } from "@/lib/utils";

export default async function AdminPromotionsPage() {
  const promos = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Promotions</h2>
          <p className="text-sm text-stone-500 mt-0.5">{promos.length} promo codes</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Create form */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="font-semibold text-stone-900 mb-4">Create Promo Code</h3>
            <AdminPromoForm />
          </div>
        </div>

        {/* Promo list */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="admin-table" style={{ minWidth: "750px" }}>
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Code</th>
                    <th className="whitespace-nowrap">Type</th>
                    <th className="whitespace-nowrap">Value</th>
                    <th className="whitespace-nowrap">Category</th>
                    <th className="whitespace-nowrap">Uses</th>
                    <th className="whitespace-nowrap">Valid Until</th>
                    <th className="whitespace-nowrap">Status</th>
                    <th className="whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-stone-500 py-8 whitespace-nowrap">
                        No promo codes yet.
                      </td>
                    </tr>
                  ) : promos.map(p => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">
                        <span className="font-mono font-bold text-stone-900 text-sm">{p.code}</span>
                      </td>
                      <td className="text-xs whitespace-nowrap">{p.type}</td>
                      <td className="text-sm font-medium whitespace-nowrap">
                        {p.type === "PERCENT" ? `${p.value}%` : formatJpy(p.value)}
                      </td>
                      <td className="text-xs text-stone-500 whitespace-nowrap">{p.category}</td>
                      <td className="text-sm whitespace-nowrap">
                        {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""}
                      </td>
                      <td className="text-xs text-stone-500 whitespace-nowrap">
                        {p.validUntil ? p.validUntil.toISOString().slice(0, 10) : "No limit"}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`badge text-xs ${p.isActive ? "badge-green" : "badge-red"}`}>
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <form method="post" action="/api/admin/promotions/toggle">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="isActive" value={String(!p.isActive)} />
                          <button type="submit" className="text-xs text-teal-600 hover:underline">
                            {p.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
