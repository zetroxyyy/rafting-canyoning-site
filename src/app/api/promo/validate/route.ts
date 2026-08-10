import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPromo } from "@/lib/utils";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const { code, bookingSubtotal } = await req.json();
    if (!code) return NextResponse.json({ valid: false });

    const promo = await prisma.promotion.findUnique({
      where: { code: code.toUpperCase() },
    });

    const now = new Date();
    if (
      !promo ||
      !promo.isActive ||
      (promo.validFrom && promo.validFrom > now) ||
      (promo.validUntil && promo.validUntil < now) ||
      (promo.maxUses && promo.usedCount >= promo.maxUses)
    ) {
      return NextResponse.json({ valid: false });
    }

    const { discount } = applyPromo(
      Number(bookingSubtotal),
      { type: promo.type, value: promo.value }
    );

    return NextResponse.json({ valid: true, discountJpy: discount });
  } catch (err) {
    console.error("[/api/promo/validate]", err);
    return NextResponse.json({ valid: false });
  }
}
