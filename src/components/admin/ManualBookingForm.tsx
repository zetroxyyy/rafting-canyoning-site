"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clamp } from "@/lib/utils";
import { cn } from "@/lib/cn";
import {
  Minus, Plus, UtensilsCrossed, Loader2, AlertCircle, CheckCircle2, Package,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product { id: string; nameEn: string; activityType: "RAFTING" | "CANYONING" }
interface SlotInfo {
  id: string; startTime: string; remaining: number;
  status: "available" | "limited" | "full" | "special";
  bookedCount: number; maxCapacity: number;
}
interface Participant { participantType: "ADULT" | "CHILD"; firstName: string; lastName: string; age: string }

type PaymentMethod = "PAY_ON_ARRIVAL";
// Manual bookings are always CONFIRMED at booking-status level.
// Payment is always 'Pay on Arrival' — collected physically at the base.
type BookingStatus = "CONFIRMED";
type BookingSource = "MANUAL" | "PHONE";

// ─── Synthetic COMBO product (not in DB; submitted as isCombo:true) ─────────

const COMBO_PRODUCT_ID = "__COMBO__";

// ─── Constants ────────────────────────────────────────────────────────────────

const ADULT_PRICE = 6000;
const CHILD_PRICE = 4000;

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "PAY_ON_ARRIVAL", label: "PENDING — Pay on Arrival (default)" },
];

const BOOKING_STATUSES: { value: BookingStatus; label: string }[] = [
  { value: "CONFIRMED", label: "CONFIRMED — Booking is live" },
];

const BOOKING_SOURCES: { value: BookingSource; label: string; desc: string }[] = [
  { value: "MANUAL", label: "Manual",  desc: "Walk-in, in-person, or admin-created" },
  { value: "PHONE",  label: "Phone",   desc: "Reservation taken over the phone" },
];

function blankParticipant(type: "ADULT" | "CHILD"): Participant {
  return { participantType: type, firstName: "", lastName: "", age: "" };
}

function buildParticipants(adults: number, children: number): Participant[] {
  return [
    ...Array.from({ length: adults },   () => blankParticipant("ADULT")),
    ...Array.from({ length: children }, () => blankParticipant("CHILD")),
  ];
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-stone-900 text-base mb-4 pb-3 border-b border-stone-100">{title}</h3>
      {children}
    </div>
  );
}

// ─── Counter ──────────────────────────────────────────────────────────────────

function Counter({ label, sub, value, min, max, onChange }: {
  label: string; sub?: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div><p className="font-medium text-stone-900 text-sm">{label}</p>{sub && <p className="text-xs text-stone-400">{sub}</p>}</div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(clamp(value - 1, min, max))} disabled={value <= min}
          className="w-8 h-8 rounded-full border-2 flex items-center justify-center disabled:opacity-30 transition-colors"
          style={{ borderColor: "var(--color-teal-300)", color: "var(--color-teal-700)" }}>
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-6 text-center font-bold text-stone-900">{value}</span>
        <button type="button" onClick={() => onChange(clamp(value + 1, min, max))} disabled={value >= max}
          className="w-8 h-8 rounded-full text-white flex items-center justify-center disabled:opacity-30 transition-colors"
          style={{ background: "var(--color-teal-600)" }}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManualBookingForm({ products }: { products: Product[] }) {
  const router = useRouter();

  // ── Core state ──────────────────────────────────────────────────────────────
  // productId is the actual DB product ID, OR "__COMBO__" for a synthetic combo booking.
  const [productId,   setProductId]   = useState<string>("");
  // For non-combo: we track the selected Product object for nameEn / activityType display.
  const [product,     setProduct]     = useState<Product | null>(null);
  const [isComboMode, setIsComboMode] = useState(false);

  const [date,      setDate]      = useState("");
  const [slots,     setSlots]     = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotId,    setSlotId]    = useState("");
  const [adultCount,  setAdultCount]  = useState(1);
  const [childCount,  setChildCount]  = useState(0);
  const [hasBbq,    setHasBbq]    = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([blankParticipant("ADULT")]);
  const [leadName,  setLeadName]  = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadLocale, setLeadLocale] = useState<"en" | "ja">("en");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PAY_ON_ARRIVAL");
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("CONFIRMED");
  const [bookingSource, setBookingSource] = useState<BookingSource>("MANUAL");
  const [adminNote, setAdminNote] = useState("");
  const [manualTotal, setManualTotal] = useState("");
  const [participantErrors, setParticipantErrors] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // ── Derived pricing ────────────────────────────────────────────────────────
  const priceAdult = isComboMode ? 10000 : ADULT_PRICE;
  const priceChild = isComboMode ? 6000 : CHILD_PRICE;
  const subtotal = (adultCount * priceAdult) + (childCount * priceChild);
  const finalTotal = manualTotal !== "" ? parseInt(manualTotal.replace(/\D/g, ""), 10) || 0 : subtotal;

  // ── Sync participants array when counts change ─────────────────────────────
  useEffect(() => {
    setParticipants(buildParticipants(adultCount, childCount));
    setParticipantErrors({});
  }, [adultCount, childCount]);

  // ── Fetch slots when product + date change (non-combo only) ───────────────
  useEffect(() => {
    if (isComboMode || !product || !date) { setSlots([]); setSlotId(""); return; }
    setSlotsLoading(true);
    setSlotId("");
    fetch(`/api/admin/availability/slots?productId=${product.id}&date=${date}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [product, date, isComboMode]);

  // ── Product selection handler ─────────────────────────────────────────────
  const selectProduct = (p: Product) => {
    setProduct(p);
    setProductId(p.id);
    setIsComboMode(false);
    setSlotId("");
    setSlots([]);
  };

  const selectCombo = () => {
    setProduct(null);
    setProductId(COMBO_PRODUCT_ID);
    setIsComboMode(true);
    setSlotId("");
    setSlots([]);
    setDate("");
  };

  // ── Participant field updater ─────────────────────────────────────────────
  const updateParticipant = useCallback((i: number, field: keyof Participant, value: string | boolean) => {
    setParticipants(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
    setParticipantErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
  }, []);

  // ── Validate ages ─────────────────────────────────────────────────────────
  const validateAges = (): boolean => {
    const errors: Record<number, string> = {};
    // For combo mode, use RAFTING min age (6) as the lowest permissible
    const childMin = product?.activityType === "CANYONING" ? 12 : 6;
    participants.forEach((p, i) => {
      const age = parseInt(p.age, 10);
      if (!p.age) return;
      if (isNaN(age)) { errors[i] = "Enter a valid age."; return; }
      if (p.participantType === "ADULT" && age < 18) errors[i] = "Adults must be 18+.";
      if (p.participantType === "CHILD" && age < childMin) errors[i] = `Children must be ${childMin}+ for this activity.`;
      if (p.participantType === "CHILD" && age > 17) errors[i] = "Children must be 17 or younger. Book as Adult.";
    });
    setParticipantErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Combo bookings don't need a slot; standard bookings do.
    if (!isComboMode && (!productId || !slotId || !date)) {
      setSubmitError("Select activity, date and time slot.");
      return;
    }
    if (isComboMode && !productId) {
      setSubmitError("Select an activity package.");
      return;
    }
    if (!leadName.trim() || !leadEmail.trim()) {
      setSubmitError("Lead guest name and email are required.");
      return;
    }
    if (!validateAges()) { setSubmitError("Fix participant age errors below."); return; }

    setSubmitting(true);
    setSubmitError("");

    // For combo mode we use the first rafting product's ID as the productId
    // (the backend will mark isCombo=true and slotId=null)
    const resolvedProductId = isComboMode
      ? (products.find(p => p.activityType === "RAFTING")?.id ?? products[0]?.id ?? "")
      : productId;

    try {
      const res = await fetch("/api/admin/bookings/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: resolvedProductId,
          slotId: isComboMode ? null : slotId,
          isCombo: isComboMode,
          activityType: isComboMode ? "RAFTING" : (product?.activityType ?? "RAFTING"),
          adultCount,
          childCount,
          hasBbq,
          leadName: leadName.trim(),
          leadEmail: leadEmail.trim().toLowerCase(),
          leadPhone: leadPhone.trim() || undefined,
          leadLocale,
          subtotalJpy: subtotal,
          totalJpy: finalTotal,
          paymentMethod,
          bookingStatus,
          bookingSource,
          adminNote: adminNote.trim() || undefined,
          participants: participants.map(p => ({
            participantType: p.participantType,
            firstName: p.firstName.trim(),
            lastName: p.lastName.trim() || undefined,
            age: p.age ? parseInt(p.age, 10) : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to create booking.");
        return;
      }
      router.push(`/admin/bookings/${data.bookingId}`);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Slot badge ─────────────────────────────────────────────────────────────
  const slotBadge = (s: SlotInfo) => {
    if (s.status === "special") return <span className="badge badge-blue text-xs">SPECIAL</span>;
    if (s.remaining <= 4)       return <span className="badge badge-amber text-xs">{s.remaining} left</span>;
    return <span className="badge badge-green text-xs">{s.remaining} left</span>;
  };

  const selectedSlot = slots.find(s => s.id === slotId);
  const selectedLabel = isComboMode
    ? "Combo Package (Rafting + Canyoning)"
    : (product?.nameEn ?? "—");

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-3 gap-6 items-start">

        {/* ── Left col (2/3) ────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Activity */}
          <Card title="1 — Activity Package">
            <div className="grid grid-cols-2 gap-3">
              {products.map(p => (
                <button type="button" key={p.id}
                  onClick={() => selectProduct(p)}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    productId === p.id && !isComboMode
                      ? "border-teal-500 bg-teal-50"
                      : "border-stone-200 hover:border-teal-300"
                  )}>
                  <p className="font-semibold text-stone-900 text-sm">{p.nameEn}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{p.activityType}</p>
                </button>
              ))}

              {/* Combo Package — synthetic option */}
              <button type="button"
                onClick={selectCombo}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all col-span-2",
                  isComboMode
                    ? "border-purple-500 bg-purple-50"
                    : "border-stone-200 hover:border-purple-300"
                )}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: isComboMode ? "#7c3aed" : "#a1a1aa" }} />
                  <p className="font-semibold text-stone-900 text-sm">Combo Package</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: isComboMode ? "#ede9fe" : "#f4f4f5", color: isComboMode ? "#7c3aed" : "#71717a" }}>
                    Rafting + Canyoning
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Multi-day/flexible combo — no specific time slot required. Admin will schedule later.
                </p>
              </button>
            </div>
          </Card>

          {/* 2. Date + Slot — HIDDEN for Combo mode */}
          {!isComboMode && (
            <Card title="2 — Date & Time Slot">
              <div className="space-y-4">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={date}
                    onChange={e => { setDate(e.target.value); setSlotId(""); }}
                    min={new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })} />
                </div>

                {product && date && (
                  slotsLoading ? (
                    <div className="flex items-center gap-2 text-stone-400 text-sm py-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-stone-500">No open slots for this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {slots.map(s => (
                        <button type="button" key={s.id}
                          onClick={() => setSlotId(s.id)}
                          disabled={s.status === "full"}
                          className={cn(
                            "p-3 rounded-xl border-2 text-center transition-all disabled:opacity-40",
                            slotId === s.id
                              ? "border-teal-500 bg-teal-50"
                              : "border-stone-200 hover:border-teal-300"
                          )}>
                          <p className="font-bold text-stone-900">{s.startTime}</p>
                          <div className="mt-1 flex justify-center">{slotBadge(s)}</div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </Card>
          )}

          {/* Combo: informational banner when combo mode active */}
          {isComboMode && (
            <div className="card p-5 flex items-start gap-3"
              style={{ border: "2px solid #ede9fe", background: "#faf5ff" }}>
              <Package className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#7c3aed" }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: "#6d28d9" }}>
                  Combo Package — Flexible Schedule
                </p>
                <p className="text-xs text-stone-500 mt-1">
                  No time slot is required. This booking will appear in the admin panel
                  with an <strong>Awaiting Schedule</strong> status. Assign a date and time after confirming with the guest.
                </p>
              </div>
            </div>
          )}

          {/* 3. Guests */}
          <Card title={isComboMode ? "2 — Guest Details" : "3 — Guest Details"}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">First + Last Name *</label>
                <input className="input" value={leadName} onChange={e => setLeadName(e.target.value)}
                  placeholder="Full name" required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                  placeholder="guest@example.com" required />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                  placeholder="+81 90 0000 0000" />
              </div>
              <div>
                <label className="label">Communication Language</label>
                <select className="input" value={leadLocale} onChange={e => setLeadLocale(e.target.value as "en" | "ja")}>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
            </div>
          </Card>

          {/* 4. Participants */}
          <Card title={isComboMode ? "3 — Participants & Add-ons" : "4 — Participants & Add-ons"}>
            <div className="space-y-1 mb-4 border-b border-stone-100 pb-4">
              <Counter label="Adults" sub="Age 18+" value={adultCount} min={1} max={35} onChange={setAdultCount} />
              <Counter label="Children"
                sub={product?.activityType === "CANYONING" ? "Age 12–17" : "Age 6–17"}
                value={childCount} min={0} max={35} onChange={setChildCount} />
            </div>

            {/* Add-ons */}
            <div className="space-y-3 mb-4 border-b border-stone-100 pb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Optional Add-ons</p>

              <label htmlFor="addon-bbq"
                className={cn("card flex items-start gap-3 p-3 cursor-pointer transition-all",
                  hasBbq ? "outline outline-2 outline-teal-400" : "")}>
                <input id="addon-bbq" type="checkbox" className="mt-1 accent-teal-600 w-4 h-4 flex-shrink-0"
                  checked={hasBbq} onChange={e => setHasBbq(e.target.checked)} />
                <div>
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4" style={{ color: "var(--color-teal-600)" }} />
                    <span className="font-semibold text-sm text-stone-900">BBQ</span>
                    <span className="badge badge-amber text-xs">Pay on arrival</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">Riverside BBQ after activity.</p>
                </div>
              </label>
            </div>

            {/* Per-participant rows */}
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">Participant Details</p>
            <div className="space-y-4">
              {participants.map((p, i) => (
                <div key={i} className="border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("badge text-xs", p.participantType === "ADULT" ? "badge-teal" : "badge-amber")}>
                      {p.participantType}
                    </span>
                    <span className="text-sm font-medium text-stone-700">Participant {i + 1}</span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">First Name *</label>
                      <input className="input" value={p.firstName} required
                        onChange={e => updateParticipant(i, "firstName", e.target.value)}
                        placeholder="First name" />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input className="input" value={p.lastName}
                        onChange={e => updateParticipant(i, "lastName", e.target.value)}
                        placeholder="Last name" />
                    </div>
                    <div>
                      <label className="label">Age</label>
                      <input className={cn("input", participantErrors[i] ? "error" : "")}
                        type="number" min={1} max={99} value={p.age}
                        onChange={e => updateParticipant(i, "age", e.target.value)}
                        placeholder="Age" />
                      {participantErrors[i] && (
                        <p className="field-error">{participantErrors[i]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 5. Payment */}
          <Card title={isComboMode ? "4 — Payment & Status" : "5 — Payment & Status"}>
            <div className="grid sm:grid-cols-2 gap-4">

              {/* Booking Source — radio group */}
              <div className="sm:col-span-2">
                <label className="label">Booking Source</label>
                <div className="flex gap-3 flex-wrap">
                  {BOOKING_SOURCES.map(src => (
                    <label
                      key={src.value}
                      htmlFor={`source-${src.value}`}
                      className={cn(
                        "flex items-start gap-3 flex-1 min-w-[140px] p-3 rounded-xl border-2 cursor-pointer transition-all",
                        bookingSource === src.value
                          ? "border-teal-500 bg-teal-50"
                          : "border-stone-200 hover:border-teal-300 bg-white"
                      )}
                    >
                      <input
                        id={`source-${src.value}`}
                        type="radio"
                        name="bookingSource"
                        value={src.value}
                        checked={bookingSource === src.value}
                        onChange={() => setBookingSource(src.value)}
                        className="mt-0.5 accent-teal-600 shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-stone-900 text-sm">{src.label}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{src.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Payment Method</label>
                <select className="input" value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Booking Status</label>
                <select className="input" value={bookingStatus}
                  onChange={e => setBookingStatus(e.target.value as BookingStatus)}>
                  {BOOKING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Admin Notes (internal only)</label>
                <textarea className="input h-20 resize-none" value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Phone reservation details, special requests, discount reason…" />
              </div>
            </div>
          </Card>

          {/* Error banner */}
          {submitError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}
        </div>

        {/* ── Right col — sticky summary ─────────────────────────────────── */}
        <div className="lg:sticky lg:top-20 space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-stone-900 border-b border-stone-100 pb-3">Summary</h3>

            <SummaryRow label="Activity"  value={selectedLabel} />
            {!isComboMode && <SummaryRow label="Date"      value={date || "—"} />}
            {!isComboMode && <SummaryRow label="Time"      value={selectedSlot?.startTime ?? "—"} />}
            {isComboMode && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Schedule</span>
                <span className="font-medium text-amber-600 text-right">Awaiting</span>
              </div>
            )}
            <SummaryRow label="Adults"    value={String(adultCount)} />
            <SummaryRow label="Children"  value={String(childCount)} />
            {hasBbq && <SummaryRow label="BBQ" value="Pay on arrival" accent />}
            <SummaryRow label="Source"    value={BOOKING_SOURCES.find(s => s.value === bookingSource)?.label ?? ""} />
            <SummaryRow label="Payment"   value={PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label ?? ""} />
            <SummaryRow label="Status"    value={bookingStatus} />

            <div className="border-t border-stone-100 pt-3 space-y-1.5">
              <SummaryRow label="Subtotal" value={`¥${subtotal.toLocaleString()}`} />

              <div>
                <label className="label text-xs">Manual Total Override (¥)</label>
                <input className="input input-sm py-1.5" type="number" min={0}
                  placeholder={String(subtotal)} value={manualTotal}
                  onChange={e => setManualTotal(e.target.value)} />
                <p className="text-xs text-stone-400 mt-0.5">Leave blank to use calculated subtotal.</p>
              </div>

              <div className="flex justify-between pt-2 border-t border-stone-200">
                <span className="font-bold text-stone-900">Total</span>
                <span className="font-bold text-lg" style={{ color: "var(--color-teal-700)" }}>
                  ¥{finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="btn btn-primary w-full mt-2 justify-center">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating Booking…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> {isComboMode ? "Create Combo Booking" : "Create Booking"}</>
              )}
            </button>
          </div>
        </div>

      </div>
    </form>
  );
}

function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className={cn("font-medium text-right max-w-[60%] truncate", accent ? "text-teal-600" : "text-stone-900")}>
        {value}
      </span>
    </div>
  );
}
