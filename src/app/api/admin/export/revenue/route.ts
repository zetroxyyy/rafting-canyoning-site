/**
 * GET /api/admin/export/revenue
 *
 * Monthly Revenue CSV — queries the BookingPayment ledger (not the Booking table)
 * so every individual transaction is represented, including partial refunds.
 *
 * Query parameters:
 *   year  — 4-digit year  (required or defaults to current UTC year)
 *   month — 1-indexed month (required or defaults to current UTC month)
 *
 * CSV format — exactly 5 columns:
 *   1. Date              — payment paidAt/createdAt, formatted "YYYY-MM-DD"
 *   2. Booking Reference — e.g. "DA-240101-ABCD"
 *   3. Guest Name        — booking.leadName
 *   4. Total Revenue (¥) — amountJpy (positive = income, negative = refund)
 *   5. Payment Source    — one of the strict categories below:
 *        "PAID - Cash"
 *        "PAID - Bank Transfer"
 *        "PENDING - Pay on Arrival"
 *        "REFUNDED - Cash"
 *        "REFUNDED - Bank Transfer"
 *
 * The CSV is UTF-8 with a BOM (U+FEFF) prepended so Japanese characters render
 * correctly in Excel without needing an import wizard.
 *
 * Auth: admin session required.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── Payment Source mapping ──────────────────────────────────────────────────────
//
// BookingPayment.method is mapped to our three strict payment statuses:
//   "PAID - Cash" (includes cash, card_terminal, and credit_card since they are collected at the base counter on-site)
//   "PAID - Bank Transfer" (bank_transfer)
//   "PENDING - Pay on Arrival" (pay_on_arrival, unpaid, pending)
// Refunds map to their respective REFUNDED counterparts.

function derivePaymentSource(
  method: string | null,
  amountJpy: number,
): string {
  const m = (method ?? "").toLowerCase().trim();
  const isRefund = amountJpy < 0 || m === "manual_refund";

  if (isRefund) {
    if (m === "bank_transfer") {
      return "REFUNDED - Bank Transfer";
    }
    // Default fallback for refunds
    return "REFUNDED - Cash";
  }

  // Income rows
  if (m === "bank_transfer") {
    return "PAID - Bank Transfer";
  }
  if (m === "pay_on_arrival" || m === "pending" || m === "unpaid") {
    return "PENDING - Pay on Arrival";
  }

  // Default fallback for all on-site payments (cash, credit card terminals, card terminals, legacy Stripe, etc.)
  return "PAID - Cash";
}

// ── Month label helper ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Route handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const now = new Date();

    const year  = parseInt(searchParams.get("year")  ?? String(now.getUTCFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(now.getUTCMonth() + 1), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12 || year < 2020 || year > 2100) {
      return NextResponse.json({ error: "Invalid year or month parameter." }, { status: 400 });
    }

    // UTC date range: full calendar month
    const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const to   = new Date(Date.UTC(year, month,     1, 0, 0, 0, 0));

    // ── Query BookingPayment ledger ─────────────────────────────────────────────
    const payments = await prisma.bookingPayment.findMany({
      where: {
        createdAt: { gte: from, lt: to },
      },
      orderBy: { createdAt: "asc" },
      include: {
        booking: {
          select: {
            reference: true,
            leadName: true,
          },
        },
      },
    });

    // ── Build rows ──────────────────────────────────────────────────────────────

    const formatDate = (d: Date): string => {
      return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    };

    const rows = payments.map((p) => {
      const dateStr   = formatDate(p.paidAt ?? p.createdAt);
      const reference = p.booking?.reference  ?? "(no booking)";
      const guestName = p.booking?.leadName   ?? "(unknown)";
      const amount    = p.amountJpy;          // negative for refunds
      const source    = derivePaymentSource(
        p.method,
        p.amountJpy,
      );

      return [dateStr, reference, guestName, amount, source] as const;
    });

    // ── Summary totals ──────────────────────────────────────────────────────────

    const totalIncome  = payments.filter(p => p.amountJpy > 0).reduce((s, p) => s + p.amountJpy, 0);
    const totalRefunds = payments.filter(p => p.amountJpy < 0).reduce((s, p) => s + p.amountJpy, 0);
    const netRevenue   = totalIncome + totalRefunds;

    // Breakdown by our three strict payment statuses:
    const cashIncome = payments
      .filter(p => p.amountJpy > 0 && !["bank_transfer", "pay_on_arrival", "pending", "unpaid"].includes((p.method ?? "").toLowerCase().trim()))
      .reduce((s, p) => s + p.amountJpy, 0);

    const bankTransferIncome = payments
      .filter(p => p.amountJpy > 0 && (p.method ?? "").toLowerCase().trim() === "bank_transfer")
      .reduce((s, p) => s + p.amountJpy, 0);

    const pendingIncome = payments
      .filter(p => p.amountJpy > 0 && ["pay_on_arrival", "pending", "unpaid"].includes((p.method ?? "").toLowerCase().trim()))
      .reduce((s, p) => s + p.amountJpy, 0);

    // ── Assemble CSV ────────────────────────────────────────────────────────────

    /** Wraps a cell value in double-quotes, escaping internal double-quotes. */
    const cell = (v: string | number | null | undefined): string => {
      return `"${String(v ?? "").replace(/"/g, '""')}"`;
    };

    const headers = [
      "Date",
      "Booking Reference",
      "Guest Name",
      "Total Revenue (¥)",
      "Payment Source",
    ];

    const csvLines: string[] = [
      headers.map(cell).join(","),
      ...rows.map((r) => r.map(cell).join(",")),

      // Spacer line
      "",

      // ── Summary block ──────────────────────────────────────────────────────────
      [cell(`=== ${MONTH_NAMES[month - 1].toUpperCase()} ${year} SUMMARY ===`), cell(""), cell(""), cell(""), cell("")].join(","),
      [cell("Transactions"),                  cell(""), cell(""), cell(payments.length),  cell("")].join(","),
      [cell("Total Income (¥)"),               cell(""), cell(""), cell(totalIncome),       cell("")].join(","),
      [cell("  Cash Income (¥)"),             cell(""), cell(""), cell(cashIncome),         cell("")].join(","),
      [cell("  Bank Transfer Income (¥)"),    cell(""), cell(""), cell(bankTransferIncome), cell("")].join(","),
      [cell("  Pending - Pay on Arrival (¥)"), cell(""), cell(""), cell(pendingIncome),      cell("")].join(","),
      [cell("Net Revenue (¥)"),               cell(""), cell(""), cell(netRevenue),         cell("")].join(","),
      [cell("Total Refunds (¥)"),             cell(""), cell(""), cell(totalRefunds),       cell("")].join(","),
    ];

    // UTF-8 BOM (\uFEFF) ensures Excel opens Japanese characters correctly
    const BOM = "\uFEFF";
    const csv = BOM + csvLines.join("\n");
    const filename = `revenue-${year}-${String(month).padStart(2, "0")}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export/revenue] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
