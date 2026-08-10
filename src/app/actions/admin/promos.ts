"use server";

/**
 * Promo Code CRUD Server Actions
 *
 * Separate from the legacy /api/admin/promotions REST routes — these are
 * proper Next.js Server Actions used by the Settings → Promo Manager section.
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import type { PromoCategory, PromoType } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromoRow {
  id:            string;
  code:          string;
  type:          "PERCENT" | "FIXED";
  value:         number;
  category:      string;
  isActive:      boolean;
  usedCount:     number;
  maxUses:       number | null;
  validFrom:     string | null;   // ISO date string
  validUntil:    string | null;   // ISO date string
  descriptionEn: string | null;
  createdAt:     string;
}

export interface PromoInput {
  code:          string;
  type:          "PERCENT" | "FIXED";
  value:         number;
  category:      string;
  isActive:      boolean;
  maxUses:       number | null;
  validFrom:     string | null;
  validUntil:    string | null;
  descriptionEn: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function revalidate() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/promotions");
}

// ─── listPromos ───────────────────────────────────────────────────────────────

export async function listPromos(): Promise<PromoRow[]> {
  const rows = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, code: true, type: true, value: true,
      category: true, isActive: true, usedCount: true,
      maxUses: true, validFrom: true, validUntil: true,
      descriptionEn: true, createdAt: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    type:      r.type      as "PERCENT" | "FIXED",
    validFrom:  r.validFrom  ? r.validFrom.toISOString().slice(0, 10)  : null,
    validUntil: r.validUntil ? r.validUntil.toISOString().slice(0, 10) : null,
    createdAt:  r.createdAt.toISOString().slice(0, 10),
  }));
}

// ─── createPromo ─────────────────────────────────────────────────────────────

export async function createPromo(
  input: PromoInput
): Promise<{ success: true; id: string } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  const code = input.code.toUpperCase().trim();
  if (!code) return { error: "Code is required." };
  if (!input.value || input.value <= 0) return { error: "Value must be > 0." };
  if (input.type === "PERCENT" && input.value > 100)
    return { error: "Percentage cannot exceed 100." };

  try {
    const existing = await prisma.promotion.findUnique({ where: { code } });
    if (existing) return { error: `Code "${code}" already exists.` };

    const promo = await prisma.promotion.create({
      data: {
        code,
        type:          input.type as PromoType,
        value:         input.value,
        category:      input.category as PromoCategory,
        isActive:      input.isActive,
        maxUses:       input.maxUses   ?? null,
        validFrom:     input.validFrom  ? new Date(input.validFrom)  : null,
        validUntil:    input.validUntil ? new Date(input.validUntil) : null,
        descriptionEn: input.descriptionEn ?? null,
      },
    });

    revalidate();
    return { success: true, id: promo.id };
  } catch (err) {
    console.error("[createPromo]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

// ─── updatePromo ─────────────────────────────────────────────────────────────

export async function updatePromo(
  id: string,
  input: Partial<PromoInput>
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    // Build the update data object imperatively to avoid Prisma union type issues
    // with conditional spreads.
    const data: Record<string, unknown> = {};
    if (input.code      !== undefined) data.code      = input.code.toUpperCase().trim();
    if (input.type      !== undefined) data.type      = input.type as PromoType;
    if (input.value     !== undefined) data.value     = input.value;
    if (input.category  !== undefined) data.category  = input.category as PromoCategory;
    if (input.isActive  !== undefined) data.isActive  = input.isActive;
    if (input.maxUses   !== undefined) data.maxUses   = input.maxUses;
    if (input.validFrom !== undefined) data.validFrom = input.validFrom ? new Date(input.validFrom) : null;
    if (input.validUntil !== undefined) data.validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (input.descriptionEn !== undefined) data.descriptionEn = input.descriptionEn;

    await prisma.promotion.update({ where: { id }, data: data as Parameters<typeof prisma.promotion.update>[0]["data"] });

    revalidate();
    return { success: true };
  } catch (err) {
    console.error("[updatePromo]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

// ─── togglePromo ─────────────────────────────────────────────────────────────

export async function togglePromo(
  id: string,
  isActive: boolean
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await prisma.promotion.update({ where: { id }, data: { isActive } });
    revalidate();
    return { success: true };
  } catch (err) {
    console.error("[togglePromo]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

// ─── deletePromo ─────────────────────────────────────────────────────────────

export async function deletePromo(
  id: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    // Safety: don't delete codes that have been used — deactivate instead
    const promo = await prisma.promotion.findUnique({
      where: { id },
      select: { usedCount: true, code: true },
    });

    if (!promo) return { error: "Not found." };

    if (promo.usedCount > 0) {
      // Has been used — deactivate rather than hard-delete to preserve booking history
      await prisma.promotion.update({ where: { id }, data: { isActive: false } });
      revalidate();
      return { success: true };
    }

    await prisma.promotion.delete({ where: { id } });
    revalidate();
    return { success: true };
  } catch (err) {
    console.error("[deletePromo]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}
