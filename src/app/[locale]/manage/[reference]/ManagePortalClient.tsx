"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  submitGuestCancellation,
  submitGuestReschedule,
} from "@/app/actions/public/bookingRequests";
import { getCancellationPolicyText } from "@/lib/services/refundPolicy";
import {
  Calendar,
  Clock,
  Users,
  Wallet,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Flame,
  Tag,
  RefreshCw,
  Info,
  Ban,
  HelpCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingRequest {
  id: string;
  type: "CANCELLATION" | "RESCHEDULE";
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "FINALIZED";
  requestedNewDate?: string | null;
  requestedNewTime?: string | null;
  guestMessage?: string | null;
  suggestedRefundJpy?: number | null;
  refundPolicyNote?: string | null;
  adminDecisionNote?: string | null;
  createdAt: string;
}

interface BookingData {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  locale: string;
  adultCount: number;
  childCount: number;
  hasBbq: boolean;
  leadName: string;
  leadEmail: string;
  totalJpy: number;
  subtotalJpy: number;
  discountJpy: number;
  promoCode?: string | null;
  receiptPdfPath?: string | null;
  waiverPdfPath?: string | null;
  isCombo: boolean;
  comboDate?: string | null;
  product: { nameEn: string; nameJa: string; activityType: string };
  slot: { date: string; startTime: string } | null;
  secondarySlot: { startTime: string } | null;
  participants: Array<{
    firstName: string;
    lastName?: string | null;
    participantType: string;
  }>;
  bookingRequests: BookingRequest[];
}

interface Props {
  booking: BookingData;
  verifiedEmail: string;
  locale: "en" | "ja";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatJpy(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(dateStr: string, locale: "en" | "ja"): string {
  try {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(time: string): string {
  try {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return time;
  }
}

function getBookingStatusBadge(status: string, locale: "en" | "ja") {
  const map: Record<string, { cls: string; labelEn: string; labelJa: string }> = {
    CONFIRMED: { cls: "badge badge-teal", labelEn: "Confirmed", labelJa: "確認済み" },
    PENDING: { cls: "badge badge-amber", labelEn: "Pending", labelJa: "保留中" },
    CANCELLED: { cls: "badge badge-red", labelEn: "Cancelled", labelJa: "キャンセル" },
    COMPLETED: { cls: "badge badge-green", labelEn: "Completed", labelJa: "完了" },
    NO_SHOW: { cls: "badge badge-gray", labelEn: "No Show", labelJa: "無断欠席" },
  };
  const entry = map[status] ?? { cls: "badge badge-gray", labelEn: status, labelJa: status };
  return { cls: entry.cls, label: locale === "ja" ? entry.labelJa : entry.labelEn };
}

function getPaymentStatusBadge(ps: string, locale: "en" | "ja") {
  // Handles exact stored strings: "PAID - Cash", "PAID", etc.
  const psUpper = ps.toUpperCase();
  let cls = "badge badge-gray";
  let labelEn = ps;
  let labelJa = ps;
  if (psUpper.startsWith("PAID")) { cls = "badge badge-green"; labelEn = ps; labelJa = "支払済み"; }
  else if (psUpper === "UNPAID") { cls = "badge badge-red"; labelEn = "Unpaid"; labelJa = "未払い"; }
  else if (psUpper === "PENDING") { cls = "badge badge-amber"; labelEn = "Pending"; labelJa = "保留中"; }
  else if (psUpper.startsWith("REFUNDED")) { cls = "badge badge-blue"; labelEn = "Refunded"; labelJa = "返金済み"; }
  return { cls, label: locale === "ja" ? labelJa : labelEn };
}

function getRequestStatusInfo(req: BookingRequest, locale: "en" | "ja") {
  const isJa = locale === "ja";
  const typeLabel =
    req.type === "CANCELLATION"
      ? isJa ? "キャンセルリクエスト" : "Cancellation Request"
      : isJa ? "日程変更リクエスト" : "Reschedule Request";

  const statusMap: Record<BookingRequest["status"], {
    cls: string; icon: React.ReactNode; labelEn: string; labelJa: string; descEn: string; descJa: string;
  }> = {
    PENDING_REVIEW: {
      cls: "badge badge-amber",
      icon: <HelpCircle className="w-4 h-4" />,
      labelEn: "Under Review",
      labelJa: "審査中",
      descEn: "Your request has been received and is being reviewed by our team.",
      descJa: "リクエストを受け付けました。スタッフが確認中です。",
    },
    APPROVED: {
      cls: "badge badge-teal",
      icon: <CheckCircle2 className="w-4 h-4" />,
      labelEn: "Approved",
      labelJa: "承認済み",
      descEn: "Your request has been approved. Please check your email for details.",
      descJa: "リクエストが承認されました。メールをご確認ください。",
    },
    REJECTED: {
      cls: "badge badge-red",
      icon: <XCircle className="w-4 h-4" />,
      labelEn: "Not Approved",
      labelJa: "否認",
      descEn: "Your request could not be approved at this time.",
      descJa: "リクエストは承認できませんでした。",
    },
    FINALIZED: {
      cls: "badge badge-green",
      icon: <CheckCircle2 className="w-4 h-4" />,
      labelEn: "Finalized",
      labelJa: "完了",
      descEn: "This request has been fully processed.",
      descJa: "このリクエストは処理が完了しました。",
    },
  };

  const s = statusMap[req.status];
  return {
    typeLabel,
    statusCls: s.cls,
    statusIcon: s.icon,
    statusLabel: isJa ? s.labelJa : s.labelEn,
    desc: isJa ? s.descJa : s.descEn,
  };
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />;
}

// ── Reschedule Modal ──────────────────────────────────────────────────────────

interface RescheduleModalProps {
  onClose: () => void;
  onSubmit: (date: string, time: string, msg: string) => Promise<void>;
  locale: "en" | "ja";
  isLoading: boolean;
}

function RescheduleModal({ onClose, onSubmit, locale, isLoading }: RescheduleModalProps) {
  const isJa = locale === "ja";
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Use JST (Asia/Tokyo) — all trips operate in Numata, Gunma, so "today" must
  // reflect the JST calendar day regardless of where the guest is browsing from.
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setErr(isJa ? "日付を選択してください" : "Please select a date.");
      return;
    }
    setErr("");
    await onSubmit(date, time, msg);
  }

  return (
    <div
      // z-[60]: Header is z-50; modals must sit above it so the backdrop
      // completely covers the sticky nav on mobile and desktop.
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--color-teal-100)" }}>
            <RefreshCw className="w-5 h-5" style={{ color: "var(--color-teal-700)" }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-stone-900)" }}>
              {isJa ? "日程変更リクエスト" : "Request a Reschedule"}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-stone-500)" }}>
              {isJa ? "ご希望の日程をお知らせください" : "Let us know your preferred date"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="reschedule-date">
              {isJa ? "ご希望日" : "Preferred Date"} *
            </label>
            <input
              id="reschedule-date"
              type="date"
              className="input"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="reschedule-time">
              {isJa ? "ご希望時間" : "Preferred Start Time"}
            </label>
            <select
              id="reschedule-time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="09:00">09:00 AM</option>
              <option value="11:30">11:30 AM</option>
              <option value="13:30">01:30 PM</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="reschedule-msg">
              {isJa ? "メッセージ（任意）" : "Message (optional)"}
            </label>
            <textarea
              id="reschedule-msg"
              className="input"
              rows={3}
              placeholder={isJa ? "変更の理由や希望をお聞かせください" : "Any additional context…"}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          {err && <p className="field-error">{err}</p>}

          <div
            className="rounded-xl p-3 flex gap-2 text-sm"
            style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-border-light)" }}
          >
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--color-teal-600)" }} />
            <p style={{ color: "var(--color-teal-800)" }}>
              {isJa
                ? "変更リクエストはスタッフが確認後、メールでご連絡します。確定までお時間をいただく場合があります。"
                : "Our team will review your request and contact you by email. Subject to availability."}
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              {isJa ? "キャンセル" : "Cancel"}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm flex-1"
              disabled={isLoading}
            >
              {isLoading ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
              {isJa ? "リクエスト送信" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────

interface CancelModalProps {
  onClose: () => void;
  onSubmit: (msg: string) => Promise<void>;
  locale: "en" | "ja";
  isLoading: boolean;
}

function CancelModal({ onClose, onSubmit, locale, isLoading }: CancelModalProps) {
  const isJa = locale === "ja";
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(msg);
  }

  return (
    <div
      // z-[60]: matches RescheduleModal — must beat sticky z-50 header.
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#fee2e2" }}>
            <Ban className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-stone-900)" }}>
              {isJa ? "キャンセルリクエスト" : "Request Cancellation"}
            </h2>
            <p className="text-xs" style={{ color: "var(--color-stone-500)" }}>
              {isJa ? "スタッフが確認後にご連絡します" : "Our team will review and contact you"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="rounded-xl p-4 flex gap-3"
            style={{ background: "#fef9c3", border: "1px solid #fde68a" }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-semibold">
                {isJa ? "キャンセルポリシーにご注意ください" : "Please note our cancellation policy"}
              </p>
              <ul className="space-y-0.5 text-xs leading-relaxed">
                <li>{isJa ? "• 7日以上前：全額返金（100%）" : "• 7+ days before: Full refund (100%)"}</li>
                <li>{isJa ? "• 2〜6日前：50%返金" : "• 2–6 days before: 50% refund"}</li>
                <li>{isJa ? "• 48時間前以内：返金なし" : "• Under 48 hours: No refund (0%)"}</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="cancel-msg">
              {isJa ? "キャンセル理由（任意）" : "Reason for cancellation (optional)"}
            </label>
            <textarea
              id="cancel-msg"
              className="input"
              rows={3}
              placeholder={isJa ? "理由をお聞かせください（任意）" : "Let us know why you're cancelling (optional)"}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="btn btn-ghost btn-sm flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              {isJa ? "戻る" : "Go Back"}
            </button>
            <button
              type="submit"
              className="btn btn-sm flex-1"
              disabled={isLoading}
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                color: "white",
              }}
            >
              {isLoading ? <Spinner /> : <Ban className="w-4 h-4" />}
              {isJa ? "キャンセル申請" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ManagePortalClient({
  booking: initialBooking,
  verifiedEmail,
  locale,
}: Props) {
  const isJa = locale === "ja";
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData>(initialBooking);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<"receipt" | "waiver" | null>(null);

  // Auto-dismiss success toast after 6 seconds
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (successMsg) {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccessMsg(null), 6000);
    }
    return () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); };
  }, [successMsg]);

  const policyText = getCancellationPolicyText(locale);

  const activeRequest = booking.bookingRequests.find(
    (r) => r.status === "PENDING_REVIEW" || r.status === "APPROVED"
  ) ?? booking.bookingRequests[0] ?? null;

  const isBlocked =
    activeRequest?.status === "PENDING_REVIEW" ||
    activeRequest?.status === "APPROVED" ||
    booking.status === "CANCELLED" ||
    booking.status === "COMPLETED";

  // Task 1: Rescheduling is ONLY available when the booking is fully confirmed
  // AND payment has been collected. This prevents uncommitted inventory risk
  // from unpaid / pending bookings tying up a slot during a reschedule.
  const isRescheduleAllowed =
    booking.status === "CONFIRMED" &&
    booking.paymentStatus.toUpperCase().startsWith("PAID");

  // refreshBooking: fetches fresh booking data from the API AND re-runs server
  // component data so the request status section updates without a full reload.
  const refreshBooking = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/booking/lookup?ref=${encodeURIComponent(booking.reference)}&email=${encodeURIComponent(verifiedEmail)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.booking) setBooking(data.booking);
      }
    } catch { /* non-fatal */ }
    // Always refresh the Next.js server component cache so the BookingRequest
    // status badge in the "Request Status" section renders without a hard reload.
    router.refresh();
  }, [booking.reference, verifiedEmail, router]);

  async function handlePdf(type: "receipt" | "waiver") {
    setPdfLoading(type);
    try {
      const res = await fetch(
        `/api/booking/pdf?ref=${encodeURIComponent(booking.reference)}&email=${encodeURIComponent(verifiedEmail)}&type=${type}`
      );
      if (res.ok) {
        const { url } = await res.json();
        if (url) window.open(url, "_blank", "noopener");
      }
    } catch { /* ignore */ }
    finally { setPdfLoading(null); }
  }

  async function handleReschedule(date: string, time: string, msg: string) {
    setActionError(null); setSuccessMsg(null);
    startTransition(async () => {
      const result = await submitGuestReschedule(booking.reference, verifiedEmail, date, time, msg || undefined);
      setShowReschedule(false);
      if (result.success) {
        setSuccessMsg(isJa ? "日程変更リクエストを送信しました。スタッフよりご連絡いたします。" : "Reschedule request submitted! Our team will be in touch.");
        await refreshBooking();
      } else {
        setActionError(result.error);
      }
    });
    // Task 5: force router cache bust immediately so the guest sees the updated
    // request status without a manual browser refresh. This runs in parallel with
    // the transition so the UI is already refreshed when the toast appears.
    router.refresh();
  }

  async function handleCancellation(msg: string) {
    setActionError(null); setSuccessMsg(null);
    startTransition(async () => {
      const result = await submitGuestCancellation(booking.reference, verifiedEmail, msg || undefined);
      setShowCancel(false);
      if (result.success) {
        if (result.autoApproved) {
          // Unpaid booking — cancelled instantly, no admin review needed
          setSuccessMsg(
            isJa
              ? "ご予約をキャンセルしました。お支払いはございませんでしたので、即時処理されました。"
              : "Your booking has been cancelled immediately. No payment was collected, so no refund is required."
          );
        } else {
          setSuccessMsg(
            isJa
              ? "キャンセルリクエストを送信しました。スタッフよりご連絡いたします。"
              : "Cancellation request submitted. Our team will review and contact you shortly."
          );
        }
        await refreshBooking();
      } else {
        setActionError(result.error);
      }
    });
    // Task 5: eagerly bust the router cache so the guest's status badge updates
    // without a manual refresh. Runs in parallel with the server action transition.
    router.refresh();
  }

  const productName = booking.isCombo
    ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
    : (isJa ? booking.product.nameJa : booking.product.nameEn);
  const bookingBadge = getBookingStatusBadge(booking.status, locale);
  const paymentBadge = getPaymentStatusBadge(booking.paymentStatus, locale);

  const paxParts: string[] = [];
  if (booking.adultCount > 0) paxParts.push(isJa ? `大人 ${booking.adultCount}名` : `${booking.adultCount} Adult${booking.adultCount > 1 ? "s" : ""}`);
  if (booking.childCount > 0) paxParts.push(isJa ? `子供 ${booking.childCount}名` : `${booking.childCount} Child${booking.childCount > 1 ? "ren" : ""}`);

  return (
    <>
      {/* Hero strip */}
      <div className="w-full py-10 sm:py-14" style={{ background: "linear-gradient(135deg, var(--color-teal-950) 0%, var(--color-teal-800) 60%, var(--color-teal-700) 100%)" }}>
        <div className="container-site max-w-2xl px-4 sm:px-6">
          <span className="section-label" style={{ color: "var(--color-teal-300)", letterSpacing: "0.08em" }}>
            {isJa ? "予約管理ポータル" : "Booking Management Portal"}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">
            {isJa ? `こんにちは、${booking.leadName}さん` : `Hello, ${booking.leadName}`}
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "var(--color-teal-300)" }}>
            {isJa ? "ご予約の確認・変更はこちらから" : "View and manage your booking below"}
          </p>
          {/* Reference pill — overflow guard for long/unusual references on tiny screens */}
          <div className="mt-3">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full max-w-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.12)", color: "var(--color-teal-200)" }}
            >
              {/* break-all prevents a reference code from overflowing the hero pill on very small screens */}
              <span className="break-all">{booking.reference}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="container-site max-w-2xl px-4 sm:px-6 py-8 space-y-5">

        {/* Banners */}
        {successMsg && (
          <div
            className="rounded-xl p-4 flex items-start gap-3 text-sm shadow-sm"
            style={{ background: "#dcfce7", border: "1px solid #bbf7d0" }}
            role="alert"
            aria-live="polite"
          >
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-green-800 font-medium">{successMsg}</p>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-green-500 hover:text-green-700 ml-1 shrink-0"
              aria-label="Dismiss"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}
        {actionError && (
          <div
            className="rounded-xl p-4 flex items-start gap-3 text-sm shadow-sm"
            style={{ background: "#fee2e2", border: "1px solid #fecaca" }}
            role="alert"
            aria-live="assertive"
          >
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{isJa ? `エラー: ${actionError}` : `Error: ${actionError}`}</p>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600 ml-1 shrink-0"
              aria-label="Dismiss"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── 1. Booking Summary ── */}
        <section aria-labelledby="summary-heading">
          <span className="section-label">{isJa ? "予約詳細" : "Booking Summary"}</span>
          <div className="card p-5 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 id="summary-heading" className="text-lg font-bold" style={{ color: "var(--color-stone-900)" }}>{productName}</h2>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--color-stone-400)" }}>{booking.reference}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={bookingBadge.cls}>{bookingBadge.label}</span>
                <span className={paymentBadge.cls}>{paymentBadge.label}</span>
              </div>
            </div>

            {/* ── Pending Booking Notice — Pay on Arrival model ── */}
            {booking.status === "PENDING" && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: "linear-gradient(135deg,#fefce8,#fef9c3)", border: "1px solid #fde68a" }}
              >
                <div className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 text-sm">
                      {isJa ? "ご予約を受付中です" : "Booking Received — Awaiting Confirmation"}
                    </p>
                    <p className="text-xs mt-0.5 text-amber-700">
                      {isJa
                        ? "スタッフより24時間以内にご連絡し、ご予約を確定いたします。お支払いは現地にてお願いいたします。"
                        : "Our team will call or email you within 24 hours to confirm your booking. Payment is collected on arrival."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--color-teal-50)" }}>
                <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: "var(--color-teal-600)" }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--color-stone-500)" }}>{isJa ? "ツアー日" : "Tour Date"}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-stone-800)" }}>{booking.slot ? formatDate(booking.slot.date, locale) : (booking.comboDate ? formatDate(booking.comboDate, locale) : "—")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "var(--color-teal-50)" }}>
                <Clock className="w-5 h-5 flex-shrink-0" style={{ color: "var(--color-teal-600)" }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--color-stone-500)" }}>{isJa ? "開始時間" : "Start Time"}</p>
                  {booking.isCombo ? (
                    booking.slot && booking.secondarySlot ? (
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-stone-800)" }}>
                          {isJa ? "ラフティング：" : "Rafting: "}{formatTime(booking.slot.startTime)}
                        </p>
                        <p className="text-sm font-semibold" style={{ color: "var(--color-stone-800)" }}>
                          {isJa ? "キャニオニング：" : "Canyoning: "}{formatTime(booking.secondarySlot.startTime)}
                        </p>
                      </div>
                    ) : booking.slot ? (
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-stone-800)" }}>
                          {isJa ? "ラフティング：" : "Rafting: "}{formatTime(booking.slot.startTime)}
                        </p>
                        <p className="text-sm" style={{ color: "var(--color-stone-500)" }}>
                          {isJa ? "キャニオニング：調整中" : "Canyoning: TBC"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold" style={{ color: "var(--color-stone-800)" }}>{isJa ? "自由設定" : "Flexible"}</p>
                    )
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: "var(--color-stone-800)" }}>{booking.slot ? formatTime(booking.slot.startTime) : "—"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl p-3 sm:col-span-2" style={{ background: "var(--color-teal-50)" }}>
                <Users className="w-5 h-5 flex-shrink-0" style={{ color: "var(--color-teal-600)" }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--color-stone-500)" }}>{isJa ? "参加者" : "Participants"}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-stone-800)" }}>{paxParts.join("・")}</p>
                </div>
              </div>
            </div>

            {booking.hasBbq && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-stone-400)" }}>{isJa ? "オプション" : "Add-ons"}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-amber flex items-center gap-1"><Flame className="w-3 h-3" />{isJa ? "バーベキュー" : "BBQ"}</span>
                </div>
              </div>
            )}

            {booking.participants.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-stone-400)" }}>{isJa ? "参加者一覧" : "Participant Names"}</p>
                <div className="divide-y divide-stone-100 rounded-xl overflow-hidden border border-stone-100">
                  {booking.participants.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm" style={{ background: i % 2 === 0 ? "white" : "var(--color-stone-50)" }}>
                      {/* MOBILE OVERFLOW FIX: min-w-0 + truncate prevents a long name from
                          pushing the participant-type badge off the right edge of the card. */}
                      <span className="font-medium min-w-0 truncate mr-2" style={{ color: "var(--color-stone-800)" }}>
                        {p.firstName}{p.lastName ? ` ${p.lastName}` : ""}
                      </span>
                      <span className="badge badge-gray text-xs capitalize flex-shrink-0">{p.participantType.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-2" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--color-stone-500)" }}>{isJa ? "小計" : "Subtotal"}</span>
                <span style={{ color: "var(--color-stone-700)" }}>{formatJpy(booking.subtotalJpy)}</span>
              </div>
              {booking.discountJpy > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 min-w-0" style={{ color: "var(--color-stone-500)" }}>
                    <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{isJa ? "割引" : "Discount"}</span>
                    {/* MOBILE OVERFLOW FIX: promo code badge truncates at max-w so a
                        long code like "SUMMERDEAL2026" cannot push the discount amount off-screen */}
                    {booking.promoCode && (
                      <span
                        className="badge badge-teal ml-1 text-xs truncate"
                        style={{ maxWidth: "100px" }}
                        title={booking.promoCode}
                      >
                        {booking.promoCode}
                      </span>
                    )}
                  </span>
                  <span className="text-green-600 font-medium flex-shrink-0">−{formatJpy(booking.discountJpy)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                <span className="font-bold text-base" style={{ color: "var(--color-stone-900)" }}>{isJa ? "合計" : "Total"}</span>
                <span className="font-bold text-xl" style={{ color: "var(--color-teal-700)" }}>{formatJpy(booking.totalJpy)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. PDF Downloads ── */}
        <section aria-labelledby="pdf-heading">
          <span className="section-label">{isJa ? "書類ダウンロード" : "Documents"}</span>
          <div className="card p-5">
            <h2 id="pdf-heading" className="text-base font-semibold mb-4" style={{ color: "var(--color-stone-700)" }}>
              {isJa ? "PDFをダウンロード" : "Download PDFs"}
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="btn-receipt-pdf"
                className="btn btn-outline btn-sm flex-1"
                disabled={!booking.receiptPdfPath || pdfLoading === "receipt"}
                onClick={() => handlePdf("receipt")}
              >
                {pdfLoading === "receipt" ? <Spinner /> : <FileText className="w-4 h-4" />}
                {isJa ? "領収書" : "Receipt"}
                {!booking.receiptPdfPath && <span className="badge badge-gray ml-1 text-xs">{isJa ? "未発行" : "N/A"}</span>}
              </button>
              <button
                id="btn-waiver-pdf"
                className="btn btn-outline btn-sm flex-1"
                disabled={!booking.waiverPdfPath || pdfLoading === "waiver"}
                onClick={() => handlePdf("waiver")}
              >
                {pdfLoading === "waiver" ? <Spinner /> : <Download className="w-4 h-4" />}
                {isJa ? "免責同意書" : "Waiver"}
                {!booking.waiverPdfPath && <span className="badge badge-gray ml-1 text-xs">{isJa ? "未発行" : "N/A"}</span>}
              </button>
            </div>
          </div>
        </section>

        {/* ── 3. Request Status ── */}
        {activeRequest && (() => {
          const info = getRequestStatusInfo(activeRequest, locale);
          return (
            <section aria-labelledby="request-status-heading">
              <span className="section-label">{isJa ? "リクエスト状況" : "Request Status"}</span>
              <div className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 id="request-status-heading" className="text-sm font-semibold" style={{ color: "var(--color-stone-700)" }}>{info.typeLabel}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-stone-400)" }}>
                      {new Date(activeRequest.createdAt).toLocaleDateString(isJa ? "ja-JP" : "en-US", { timeZone: "Asia/Tokyo" })}
                    </p>
                  </div>
                  <span className={`${info.statusCls} flex items-center gap-1`}>{info.statusIcon}{info.statusLabel}</span>
                </div>

                <p className="text-sm" style={{ color: "var(--color-stone-600)" }}>{info.desc}</p>

                {activeRequest.type === "RESCHEDULE" && activeRequest.requestedNewDate && (
                  <div className="rounded-lg p-3 text-sm flex items-center gap-2" style={{ background: "var(--color-teal-50)" }}>
                    <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-teal-600)" }} />
                    <span style={{ color: "var(--color-teal-800)" }}>
                      {isJa ? "ご希望日：" : "Requested date: "}
                      <strong>{formatDate(activeRequest.requestedNewDate, locale)}</strong>
                      {activeRequest.requestedNewTime && ` ${formatTime(activeRequest.requestedNewTime)}`}
                    </span>
                  </div>
                )}

                {activeRequest.suggestedRefundJpy != null && (
                  <div className="rounded-lg p-3 text-sm flex items-start gap-2" style={{ background: "#dcfce7", border: "1px solid #bbf7d0" }}>
                    <Wallet className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">{isJa ? "返金予定額：" : "Suggested refund: "}{formatJpy(activeRequest.suggestedRefundJpy)}</p>
                      {activeRequest.refundPolicyNote && <p className="text-green-700 text-xs mt-0.5">{activeRequest.refundPolicyNote}</p>}
                    </div>
                  </div>
                )}

                {activeRequest.adminDecisionNote && (
                  <div className="rounded-lg p-3 text-sm" style={{ background: "var(--color-stone-50)", border: "1px solid var(--color-stone-200)" }}>
                    <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "var(--color-stone-400)" }}>{isJa ? "スタッフからのメモ" : "Note from our team"}</p>
                    {/* MOBILE OVERFLOW FIX: break-words prevents a long URL or unbroken
                        string in an admin note from causing horizontal scroll on mobile. */}
                    <p className="break-words" style={{ color: "var(--color-stone-700)" }}>{activeRequest.adminDecisionNote}</p>
                  </div>
                )}

                {activeRequest.guestMessage && (
                  <div className="rounded-lg p-3 text-sm" style={{ background: "var(--color-stone-50)", border: "1px solid var(--color-stone-200)" }}>
                    <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "var(--color-stone-400)" }}>{isJa ? "お客様のメッセージ" : "Your message"}</p>
                    {/* MOBILE OVERFLOW FIX: same break-words guard for guest-entered text */}
                    <p className="break-words" style={{ color: "var(--color-stone-700)" }}>{activeRequest.guestMessage}</p>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* ── 4. Manage Actions ── */}
        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
          <section aria-labelledby="actions-heading">
            <span className="section-label">{isJa ? "予約の変更・キャンセル" : "Manage Booking"}</span>
            <div className="card p-5 space-y-4">
              <div>
                <h2 id="actions-heading" className="text-base font-semibold" style={{ color: "var(--color-stone-800)" }}>
                  {isJa ? "ご要望はありますか？" : "Need to make changes?"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-stone-500)" }}>
                  {isBlocked
                    ? isJa ? "現在リクエストを審査中のため、新しいリクエストはお受けできません。" : "A request is currently under review. New requests are disabled until it is resolved."
                    : isJa ? "日程変更またはキャンセルのリクエストを送ることができます。" : "You can request a reschedule or cancellation below."}
                </p>
              </div>

              {isBlocked && (
                <div className="rounded-xl p-3 flex items-center gap-2 text-sm" style={{ background: "#fef9c3", border: "1px solid #fde68a" }}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  <p className="text-amber-800">{isJa ? "リクエストが処理されるまでお待ちください。" : "Please wait until your current request is resolved."}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {/* ── Reschedule button — Task 1: only enabled for CONFIRMED + PAID bookings ── */}
                {booking.isCombo ? (
                  <div className="flex-1 flex flex-col gap-1">
                    <div
                      className="btn w-full justify-center gap-2 cursor-not-allowed"
                      style={{
                        background: "var(--color-stone-100)",
                        color: "var(--color-stone-400)",
                        border: "1px solid var(--color-border-light)",
                      }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>{isJa ? "電話で日程変更" : "Call to Reschedule"}</span>
                    </div>
                    <p className="text-xs text-center" style={{ color: "var(--color-stone-500)", fontWeight: 500 }}>
                      {isJa
                        ? "※ コラボパッケージの日程変更はお電話にて承ります"
                        : "Combo reschedules must be handled over the phone."}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-1">
                    <button
                      id="btn-reschedule"
                      className="btn btn-outline w-full"
                      disabled={isBlocked || isPending || !isRescheduleAllowed}
                      onClick={() => { setActionError(null); setSuccessMsg(null); setShowReschedule(true); }}
                      title={
                        !isRescheduleAllowed
                          ? isJa
                            ? "日程変更は支払済みのご予約のみご利用いただけます"
                            : "Rescheduling is only available for fully paid bookings"
                          : undefined
                      }
                    >
                      <RefreshCw className="w-4 h-4" />
                      {isJa ? "日程変更リクエスト" : "Request Reschedule"}
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </button>
                    {/* Task 1: Inline note when reschedule is not available */}
                    {!isBlocked && !isRescheduleAllowed && (
                      <p className="text-xs text-center" style={{ color: "var(--color-stone-400)" }}>
                        {isJa
                          ? "※ 日程変更はお支払い済みの確定予約のみ対応しています"
                          : "Rescheduling is only available for fully paid, confirmed bookings."}
                      </p>
                    )}
                  </div>
                )}

                {/* ── Cancel button — Task 2: always unrestricted ── */}
                <button
                  id="btn-cancel"
                  className="btn btn-ghost flex-1"
                  disabled={isBlocked || isPending}
                  onClick={() => { setActionError(null); setSuccessMsg(null); setShowCancel(true); }}
                  style={{ color: "#dc2626" }}
                >
                  <Ban className="w-4 h-4" />
                  {isJa ? "キャンセルリクエスト" : "Request Cancellation"}
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── 5. Cancellation Policy ── */}
        <section aria-labelledby="policy-heading">
          <span className="section-label">{isJa ? "キャンセルポリシー" : "Cancellation Policy"}</span>
          <div className="card p-5">
            <h2 id="policy-heading" className="sr-only">{isJa ? "キャンセルポリシー" : "Cancellation Policy"}</h2>
            {/* MOBILE OVERFLOW FIX: overflow-x-hidden prevents the policy <pre> block
                from causing a horizontal scrollbar on narrow screens when the content
                has long lines. whitespace-pre-wrap wraps correctly but the pre's
                default overflow:auto can still trigger scrolling without this guard. */}
            <pre
              className="text-sm leading-relaxed whitespace-pre-wrap overflow-x-hidden"
              style={{ fontFamily: "var(--font-sans)", color: "var(--color-stone-600)" }}
            >
              {policyText}
            </pre>
          </div>
        </section>

        <div className="h-6" />
      </div>

      {showReschedule && (
        <RescheduleModal locale={locale} isLoading={isPending} onClose={() => setShowReschedule(false)} onSubmit={handleReschedule} />
      )}
      {showCancel && (
        <CancelModal locale={locale} isLoading={isPending} onClose={() => setShowCancel(false)} onSubmit={handleCancellation} />
      )}
    </>
  );
}
