/**
 * GET /api/admin/export/bookings
 * CSV export of all bookings. Auth-protected.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      product: { select: { nameEn: true, activityType: true } },
      slot: { select: { date: true, startTime: true } },
    },
  });

  const headers = [
    "Reference","Status","PaymentStatus","ActivityType","Date","Time",
    "LeadName","Email","Phone","Country","Adults","Children",
    "BBQ","Subtotal","Discount","Total","PromoCode",
    "Source","Locale","Notes","Created",
  ];

  const rows = bookings.map(b => [
    b.reference,
    b.status,
    b.paymentStatus,
    b.product.activityType,
    b.slot ? b.slot.date.toISOString().slice(0, 10) : (b.comboDate ? b.comboDate.toISOString().slice(0, 10) : ""),
    b.slot?.startTime ?? (b.isCombo ? "Unscheduled Combo" : ""),
    b.leadName,
    b.leadEmail,
    b.leadPhone ?? "",
    b.leadCountry ?? "",
    b.adultCount,
    b.childCount,
    b.hasBbq ? "Yes" : "No",
    b.subtotalJpy,
    b.discountJpy,
    b.totalJpy,
    b.promoCode ?? "",
    b.source,
    b.locale,
    (b.customerNote ?? "").replace(/,/g, ";").replace(/\n/g, " "),
    b.createdAt.toISOString(),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
