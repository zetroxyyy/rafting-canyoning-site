"use server";

/**
 * Settings Server Actions
 *
 * All settings are stored in the SystemSetting table as key/value pairs.
 * Values are plain strings; booleans and arrays are JSON-serialised.
 *
 * Default values are seeded on first call to getSettings() via upsert so the
 * UI never breaks on a fresh deployment.
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  maintenanceMode:    boolean;
  notificationEmails: string[];
  isPromoBannerActive: boolean;
  promoBannerText:    string;
  isOffSeasonMode:    boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: Record<string, string> = {
  maintenanceMode:    "false",
  notificationEmails: JSON.stringify(["booking@thedreamadventure.com"]),
  isPromoBannerActive: "false",
  promoBannerText:    "",
  isOffSeasonMode:    "false",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSettings(rows: { key: string; value: string }[]): AppSettings {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  for (const [k, v] of Object.entries(DEFAULTS)) {
    if (!(k in map)) map[k] = v;
  }

  return {
    maintenanceMode: map.maintenanceMode === "true",
    notificationEmails: (() => {
      try { return JSON.parse(map.notificationEmails ?? "[]"); }
      catch { return ["booking@thedreamadventure.com"]; }
    })(),
    isPromoBannerActive: map.isPromoBannerActive === "true",
    promoBannerText: map.promoBannerText ?? "",
    isOffSeasonMode: map.isOffSeasonMode === "true",
  };
}

// ─── getSettings ─────────────────────────────────────────────────────────────

/**
 * Fetch all settings, seeding defaults for any missing keys.
 * Safe to call from server components — no auth check (read-only data).
 */
export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.systemSetting.findMany({
    select: { key: true, value: true },
  });

  const existingKeys = new Set(rows.map((r) => r.key));
  const missing = Object.entries(DEFAULTS).filter(([k]) => !existingKeys.has(k));

  if (missing.length > 0) {
    await prisma.$transaction(
      missing.map(([key, value]) =>
        prisma.systemSetting.upsert({
          where:  { key },
          update: {},
          create: { key, value },
        })
      )
    );
    missing.forEach(([key, value]) => rows.push({ key, value }));
  }

  return parseSettings(rows);
}

// ─── updateSettings ───────────────────────────────────────────────────────────

/**
 * Update one or more settings. Admin-only.
 */
export async function updateSettings(
  updates: Partial<Record<keyof AppSettings, string | number | boolean | string[]>>
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    const pairs = Object.entries(updates).map(([key, val]) => {
      let stored: string;
      if (Array.isArray(val))            stored = JSON.stringify(val);
      else if (typeof val === "boolean") stored = val ? "true" : "false";
      else                               stored = String(val);
      return { key, value: stored };
    });

    await prisma.$transaction(
      pairs.map(({ key, value }) =>
        prisma.systemSetting.upsert({
          where:  { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    revalidatePath("/admin/settings");
    revalidatePath("/en");
    revalidatePath("/");
    revalidatePath("/en/booking");
    revalidatePath("/booking");
    revalidatePath("/en/rafting");
    revalidatePath("/rafting");
    revalidatePath("/en/canyoning");
    revalidatePath("/canyoning");

    return { success: true };
  } catch (err) {
    console.error("[updateSettings]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

// ─── updateAdminPassword ──────────────────────────────────────────────────────

/**
 * Securely update the admin password for the currently-logged-in admin user.
 *
 * Uses findFirst with mode:"insensitive" to get the DB record by PK before
 * updating, avoiding the Prisma "record not found" crash caused by case
 * mismatches between the JWT email and the stored email.
 */
export async function updateAdminPassword(
  newPassword: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user?.email) return { error: "UNAUTHORIZED" };

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  try {
    const admin = await prisma.adminUser.findFirst({
      where: {
        email: { equals: session.user.email, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (!admin) {
      return { error: "Admin account not found. Please sign out and sign in again." };
    }

    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(newPassword, 12);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data:  { passwordHash: hash },
    });

    return { success: true };
  } catch (err) {
    console.error("[updateAdminPassword]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}
