/**
 * POST /api/admin/promotions
 * Create a new promo code.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/services/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const actorEmail = session.user?.email ?? "admin";

  try {
    const existing = await prisma.promotion.findUnique({
      where: { code: body.code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json({ error: "CODE_EXISTS" }, { status: 409 });
    }

    const promo = await prisma.promotion.create({
      data: {
        code: body.code.toUpperCase(),
        type: body.type,
        category: body.category ?? "SEASONAL",
        value: body.value,
        maxUses: body.maxUses ?? null,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        descriptionEn: body.descriptionEn ?? null,
      },
    });

    await logAudit({
      action: "PROMO_CREATED",
      actorEmail,
      description: `Created promo code ${promo.code} (${promo.type} ${promo.value})`,
    });

    return NextResponse.json(promo);
  } catch (err) {
    console.error("[admin/promotions]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
