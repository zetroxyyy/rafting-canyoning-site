/**
 * Audit log service — write and read audit entries.
 */
import { prisma } from "@/lib/prisma";

export interface AuditEntry {
  action: string;
  actorEmail: string;
  description: string;
  bookingId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action as never,
        actorEmail: entry.actorEmail,
        description: entry.description,
        bookingId: entry.bookingId,
        ipAddress: entry.ipAddress,
      },
    });
  } catch {
    // Never crash main flow
    console.warn("[AuditLog] Failed to write audit entry:", entry.action);
  }
}

export async function getBookingAuditLogs(bookingId: string) {
  try {
    return await prisma.auditLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getRecentAuditLogs(limit = 50) {
  try {
    return await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}
