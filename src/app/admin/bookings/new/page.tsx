import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ManualBookingForm from "@/components/admin/ManualBookingForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Manual Booking | Dream Adventure Admin",
};

export default async function NewManualBookingPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/admin/login");

  // Load active products (RAFTING + CANYONING)
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, nameEn: true, activityType: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/bookings"
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Bookings
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-900">New Manual Booking</h1>
        <p className="text-sm text-stone-500 mt-1">
          Phone reservation or walk-in. No payment link generated — commit directly.
        </p>
      </div>

      <ManualBookingForm products={products} />
    </div>
  );
}
