import { getBookingById } from "@/lib/services/booking";
import { getBookingAuditLogs } from "@/lib/services/audit";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatJpy } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import AdminBookingActions from "@/components/admin/AdminBookingActions";
import LocalDateTime from "@/components/ui/LocalDateTime";
import { ArrowLeft, User, Calendar, Wallet, FileText, Activity, Waves, Mountain } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "badge-amber",
  CONFIRMED: "badge-teal",
  COMPLETED: "badge-green",
  CANCELLED: "badge-red",
  EXPIRED: "badge-gray",
};

const PAYMENT_BADGE: Record<string, string> = {
  UNPAID:                "badge-red",
  PENDING:               "badge-amber",
  REFUNDED:              "badge-blue",
  PARTIALLY_REFUNDED:    "badge-blue",
  "PAID - Cash":         "badge-green",
  "PAID - Card Terminal": "badge-green",
  "PAID - Bank Transfer": "badge-green",
  "PAID - Manual":       "badge-green",
  PAID:                  "badge-green",
};

// Display label for payment status — maps cancelled bookings correctly
function paymentStatusLabel(ps: string, bookingStatus?: string): string {
  const psUpper = ps.toUpperCase();
  const bsUpper = bookingStatus?.toUpperCase();
  if (bsUpper === "CANCELLED") {
    if (psUpper.startsWith("PAID") || psUpper === "REFUNDED" || psUpper === "PARTIALLY_REFUNDED") {
      return "REFUNDED";
    }
    return "UNPAID";
  }
  if (psUpper === "PENDING") return "PENDING";
  return ps;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({ params }: Props) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) notFound();

  const auditLogs = await getBookingAuditLogs(id);

  // Count prior completed bookings to verify VIP status (case-insensitive)
  const completedCount = await prisma.booking.count({
    where: {
      leadEmail: { equals: booking.leadEmail, mode: "insensitive" },
      status: "COMPLETED",
      id: { not: booking.id },
    },
  });

  const isCombo = !!(booking as { isCombo?: boolean }).isCombo;
  // For combo bookings with no slot yet, use a far-future date so AdminBookingActions
  // correctly prevents marking COMPLETED (trip hasn't happened yet).
  const slotDate = booking.slot?.date.toISOString().slice(0, 10) ?? "9999-12-31";
  const secondarySlot = (booking as { secondarySlot?: { date: Date; startTime: string; product: { nameEn: string } } | null }).secondarySlot;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/bookings" className="btn btn-ghost btn-sm flex items-center gap-1 mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-stone-900 font-mono">{booking.reference}</h2>
            <span className={`badge ${STATUS_BADGE[booking.status] ?? "badge-gray"}`}>
              {booking.status}
            </span>
            <span className={`badge ${PAYMENT_BADGE[paymentStatusLabel(booking.paymentStatus, booking.status)] ?? "badge-gray"}`}>
              {paymentStatusLabel(booking.paymentStatus, booking.status)}
            </span>
            {isCombo && (
              <span className="badge" style={{ background: "#7c3aed", color: "white", fontSize: "0.65rem", letterSpacing: "0.06em" }}>
                COMBO PACKAGE
              </span>
            )}
            {completedCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                ⭐ VIP Return ({completedCount} past {completedCount === 1 ? "trip" : "trips"})
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Created <LocalDateTime iso={booking.createdAt.toISOString()} /> · {booking.source} · {booking.locale}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="md:col-span-2 space-y-6">

          {/* Booking summary */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-stone-900">Booking Details</h3>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-stone-500">Activity</dt><dd className="font-medium mt-0.5">{isCombo ? "Rafting + Canyoning Combo" : booking.product.nameEn}</dd></div>
              <div><dt className="text-stone-500">Date</dt><dd className="font-medium mt-0.5">{booking.slot ? slotDate : isCombo ? <span className="text-amber-600 font-semibold">Awaiting Schedule</span> : "TBD"}</dd></div>
              <div><dt className="text-stone-500">Time</dt><dd className="font-medium mt-0.5">{booking.slot?.startTime ?? (isCombo ? <span className="text-amber-600 font-semibold">Awaiting Schedule</span> : "TBD")}</dd></div>
              <div><dt className="text-stone-500">Participants</dt><dd className="font-medium mt-0.5">
                {booking.adultCount} adult{booking.adultCount !== 1 ? "s" : ""}
                {booking.childCount > 0 && `, ${booking.childCount} child`}
              </dd></div>
              <div><dt className="text-stone-500">Add-ons</dt><dd className="font-medium mt-0.5">
                {booking.hasBbq ? "BBQ" : "None"}
              </dd></div>
              <div><dt className="text-stone-500">Language</dt><dd className="font-medium mt-0.5">{booking.locale === "ja" ? "Japanese" : "English"}</dd></div>
            </dl>

            {/* Combo Package slot assignment display */}
            {isCombo && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Combo Slot Assignment</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Rafting slot */}
                  <div
                    className="rounded-xl p-3 text-sm"
                    style={{
                      background: booking.slot ? "rgba(13,148,136,0.06)" : "rgba(0,0,0,0.03)",
                      border: booking.slot ? "1px solid rgba(13,148,136,0.2)" : "1px dashed rgba(0,0,0,0.12)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Waves className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700">Rafting</span>
                    </div>
                    {booking.slot ? (
                      <>
                        <p className="font-bold text-stone-900">{booking.slot.startTime}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{slotDate}</p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 font-medium italic">Not yet assigned</p>
                    )}
                  </div>

                  {/* Canyoning slot */}
                  <div
                    className="rounded-xl p-3 text-sm"
                    style={{
                      background: secondarySlot ? "rgba(109,40,217,0.06)" : "rgba(0,0,0,0.03)",
                      border: secondarySlot ? "1px solid rgba(109,40,217,0.2)" : "1px dashed rgba(0,0,0,0.12)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Mountain className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-semibold text-violet-700">Canyoning</span>
                    </div>
                    {secondarySlot ? (
                      <>
                        <p className="font-bold text-stone-900">{secondarySlot.startTime}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{secondarySlot.date.toISOString().slice(0, 10)}</p>
                      </>
                    ) : (
                      <p className="text-xs text-amber-600 font-medium italic">Not yet assigned</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-stone-900">Pricing</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatJpy(booking.subtotalJpy)}</span></div>
              {booking.discountJpy > 0 && (
                <div className="flex justify-between text-teal-600">
                  <span>Discount {booking.promoCode ? `(${booking.promoCode})` : ""}</span>
                  <span>-{formatJpy(booking.discountJpy)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-100">
                <span>Total</span>
                <span style={{ color: "var(--color-teal-700)" }}>{formatJpy(booking.totalJpy)}</span>
              </div>
              {booking.hasBbq && (
                <p className="text-xs text-stone-400">+ BBQ (pay on arrival)</p>
              )}
            </div>
          </div>

          {/* Participants */}
          {booking.participants.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-teal-600" />
                <h3 className="font-semibold text-stone-900">Participants</h3>
              </div>
              <div className="space-y-3">
                {booking.participants.map((p) => (
                  <div key={p.id} className="flex items-start justify-between py-3 border-b border-stone-50 last:border-0">
                    <div>
                      <p className="font-medium text-sm text-stone-900">
                        {p.firstName} {p.lastName}
                        {p.age && <span className="text-stone-400 font-normal ml-1">(age {p.age})</span>}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {p.participantType}
                        {p.swimmingConfidence && ` · Swimming: ${p.swimmingConfidence}`}
                      </p>
                      {p.medicalNotes && <p className="text-xs text-amber-600 mt-0.5">⚕ {p.medicalNotes}</p>}
                      {p.dietaryNotes && <p className="text-xs text-stone-400 mt-0.5">{p.dietaryNotes}</p>}
                    </div>
                    <span className={p.waiverAccepted ? "badge badge-green text-xs" : "badge badge-red text-xs"}>
                      {p.waiverAccepted ? "Waiver ✓" : "No waiver"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {(booking.customerNote || booking.adminNote || booking.specialRequest) && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-teal-600" />
                <h3 className="font-semibold text-stone-900">Notes</h3>
              </div>
              {booking.customerNote && (
                <div className="mb-3">
                  <p className="text-xs text-stone-500 mb-1">Guest Note</p>
                  <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg">{booking.customerNote}</p>
                </div>
              )}
              {booking.specialRequest && (
                <div className="mb-3">
                  <p className="text-xs text-stone-500 mb-1">Special Request</p>
                  <p className="text-sm text-stone-700 bg-stone-50 p-3 rounded-lg">{booking.specialRequest}</p>
                </div>
              )}
              {booking.adminNote && (
                <div>
                  <p className="text-xs text-stone-500 mb-1">Admin Note</p>
                  <p className="text-sm text-stone-700 bg-amber-50 p-3 rounded-lg border-l-2 border-amber-400">{booking.adminNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Payment history */}
          {booking.payments.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="w-4 h-4 text-teal-600" />
                <h3 className="font-semibold text-stone-900">Payment History</h3>
              </div>
              <div className="space-y-2">
                {booking.payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center text-sm py-2 border-b border-stone-50 last:border-0">
                    <div>
                      <span className="font-medium">{formatJpy(Math.abs(p.amountJpy))}</span>
                      <span className="text-stone-400 ml-2">{p.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${PAYMENT_BADGE[p.status] ?? "badge-gray"} text-xs`}>{p.status}</span>
                      <span className="text-xs text-stone-400">{p.createdAt.toLocaleDateString("en-US", { timeZone: "Asia/Tokyo" })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log */}
          {auditLogs.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-teal-600" />
                <h3 className="font-semibold text-stone-900">Audit Log</h3>
              </div>
              <div className="space-y-2 text-xs">
                {auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-stone-50 last:border-0">
                    <span className="text-stone-400 whitespace-nowrap">
                      {log.createdAt.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })}
                    </span>
                    <div>
                      <span className="badge badge-gray text-xs mr-2">{log.action}</span>
                      <span className="text-stone-600">{log.description}</span>
                      <span className="text-stone-400 ml-2 break-all font-mono">by {log.actorEmail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — contact + actions */}
        <div className="space-y-6">
          {/* Lead guest */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-teal-600" />
              <h3 className="font-semibold text-stone-900">Lead Guest</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-stone-900">{booking.leadName}</p>
              <a href={`mailto:${booking.leadEmail}`} className="text-teal-600 hover:underline block break-all">
                {booking.leadEmail}
              </a>
              {booking.leadPhone && <p className="text-stone-600">{booking.leadPhone}</p>}
              {booking.leadCountry && <p className="text-stone-400">{booking.leadCountry}</p>}
              {completedCount > 0 && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-medium">
                    ⭐ VIP Return ({completedCount} past {completedCount === 1 ? "trip" : "trips"})
                  </span>
                </div>
              )}
            </div>
          </div>



          {/* Admin Actions */}
          <AdminBookingActions booking={{
            id: booking.id,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            totalJpy: booking.totalJpy,
            leadEmail: booking.leadEmail,
            reference: booking.reference,
            receiptPdfPath: booking.receiptPdfPath ?? null,
            waiverPdfPath: booking.waiverPdfPath ?? null,
            source: booking.source,
            slotDate,
            isCombo,
            slotId: booking.slotId,
            secondarySlotId: booking.secondarySlotId,
          }} />
        </div>
      </div>
    </div>
  );
}
