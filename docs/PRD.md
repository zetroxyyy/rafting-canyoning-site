# Dream Adventure — Product Requirements Document (PRD)

> **Version:** 2.0 — Phase 4 Close-out
> **Last updated:** 2026-05-15
> **Stack snapshot:** Next.js 16.2.4 · React 19 · Prisma 7 · Supabase PostgreSQL · Stripe 22 · next-auth v5

---

## 1. Product Overview

**Dream Adventure** is a premium, bilingual (English / Japanese) online booking and operations management platform for an adventure sports operator based in Japan. The platform facilitates:

- **River Rafting** trips (with optional dog companions and BBQ add-ons)
- **Canyoning** trips (no dogs; separate capacity and group logic)
- A complete **Admin Operations Panel** for managing bookings, staff, availability, promotions, and guest requests

The system is deployed on Vercel and uses Supabase PostgreSQL as its database, with Stripe handling all online payments.

---

## 2. User Roles

| Role | Access | Auth Method |
|---|---|---|
| **Guest (Public)** | Books trips, manages their own booking via reference + email | No password — reference-based |
| **Admin** | Full control of all operations | Email + bcrypt password via next-auth v5 |

---

## 3. Core Business Rules

### 3.1 The 48-Hour Booking Cutoff

Online booking is **hard-blocked** at the service layer if the departure slot is fewer than **48 hours** from the moment of booking. This is not just a UI restriction — it is enforced server-side in `src/lib/services/booking.ts`:

```ts
export const BOOKING_CUTOFF_HOURS = 48;

// Departure time is computed in JST (UTC+9)
const departureAt = new Date(`${slotDateStr}T${dbSlot.startTime}:00+09:00`);
const cutoffMs    = BOOKING_CUTOFF_HOURS * 60 * 60 * 1000;
if (departureAt.getTime() - Date.now() < cutoffMs) {
  throw new Error("BOOKING_TOO_LATE");
}
```

- **Admin bookings** (`source=MANUAL`) bypass this cutoff. Admins can book same-day.
- This constant can be adjusted in `SystemSettings` (key: `bookingCutoffHours`) for runtime configuration without a redeploy.

### 3.2 Capacity Model

Each `AvailabilitySlot` has:

| Field | Default | Description |
|---|---|---|
| `maxCapacity` | 28 | Maximum human participants across all rafts |
| `bookedCount` | 0 | Committed pax (post-payment) |
| `bookedDogs` | 0 | Committed dogs (post-payment) |

The **physical breakdown** (enforced in the Manifest Engine only):
- 4 rafts per departure
- Max **7 humans** per raft (not counting the guide)
- Max **1 dog** per raft (Rafting only)
- Max **4 dogs** per slot (2 × slot limit; enforced at booking via `DOG_MAX_PER_SLOT`)

**Canyoning slots have no dog capacity** — the dog guard is entirely skipped.

### 3.3 Seat Hold Flow (Stripe Payments)

The Stripe checkout flow uses a **15-minute seat hold** to prevent double-booking:

```
Guest selects slot
      │
      ▼
createSeatHold()         ← Reserves pax + dogs for 15 min in SeatHold table
      │
      ▼
createBookingWithCheckout() ← Creates PENDING Booking, calls Stripe Checkout API
      │
      ▼
Guest pays on Stripe
      │
      ▼
/api/webhooks/stripe    ← payment_intent.succeeded event
      │
      ▼
confirmPayment()         ← Booking: CONFIRMED, paymentStatus: "PAID",
                           SeatHold: isReleased=true,
                           BookingParticipant records created,
                           Receipt PDF generated, Confirmation email sent
```

If the guest abandons checkout, a **cron job** (`/api/cron/expire-holds`) runs every 5 minutes to release expired holds and mark their bookings as `EXPIRED`.

### 3.4 Payment Status Strings

`Booking.paymentStatus` and `BookingPayment.status` are intentionally **String fields** (not enums) to support granular labels:

| Value | Source |
|---|---|
| `"UNPAID"` | Initial state; PAY_ON_ARRIVAL manual bookings |
| `"PENDING"` | Active Stripe session in progress |
| `"PAID"` | Generic paid (legacy) |
| `"PAID - Stripe"` | Set by Stripe webhook |
| `"PAID - Cash"` | Admin manual payment |
| `"PAID - Credit Card"` | Admin — credit card terminal |
| `"PAID - Bank Transfer"` | Admin — bank transfer |
| `"REFUNDED - Stripe"` | Stripe refund processed |
| `"REFUNDED - Cash"` | Manual cash refund |
| `"PARTIALLY_REFUNDED"` | Partial refund issued |

> **Critical:** Never use the `PaymentStatus` enum (it exists as reference documentation only and is not used on any model field).

### 3.5 Booking Status State Machine

```
WEB booking:
  PENDING → CONFIRMED (on Stripe webhook)
           → EXPIRED  (on hold timeout)
           → CANCELLED (admin or guest request)

MANUAL booking:
  CONFIRMED (created directly, no PENDING)
  CASH_DUE  (confirmed booking, payment to be collected)
  COMPLETED (marked by admin or bulk-complete cron)
  CANCELLED (admin action)
```

---

## 4. The Manifest Engine (Physical Raft Distribution)

The Manifest Engine solves the "Tetris Problem" — distributing booked guests across physical rafts without constraining the public booking flow.

### 4.1 Polymorphic Behavior: Rafting vs. Canyoning

The engine is **activity-type aware** via the `isCanyoning(activityType)` helper in `src/lib/constants/manifest.ts`:

| Feature | Rafting | Canyoning |
|---|---|---|
| Group label | "Raft A / B / C / D" | "Group 1 / 2 / 3 / 4" |
| Dog counter visible | ✅ Yes (🐕 0/1) | ❌ Hidden |
| Dog capacity enforced | ✅ Max 1 per raft | ❌ Not enforced |
| UI terminology | "Send to raft:" | "Send to group:" |
| CSV export labels | "Raft A", "Raft B"... | "Group 1", "Group 2"... |

### 4.2 Manifest Data Flow

```
Admin opens /admin/manifest
      │
      ▼
SlotSelector — shows 7-day rolling window of upcoming slots
      │  (click a slot)
      ▼
ManifestBuilder (Client Component)
  ├── Staging Pool   — unassigned participants (raftAllocationId = null)
  └── Raft/Group Cards — assigned participants per RaftAllocation
      │
      ▼
assignToRaft() Server Action
  ├── Server-side capacity check (humanCount < 7, dogCount < 1 for rafting)
  ├── Prisma update: BookingParticipant.raftAllocationId
  └── revalidatePath("/admin/manifest") + revalidatePath("/admin")
```

### 4.3 CRITICAL Prisma Pattern: Explicit `select` for `raftAllocationId`

When querying `BookingParticipant` records via a nested `include` on a relation, Prisma **omits scalar FK fields** from the result. Always use an explicit `select` block to include `raftAllocationId`:

```ts
// ✅ CORRECT — raftAllocationId is explicitly selected
participants: {
  select: {
    id:               true,
    raftAllocationId: true,
    hasDog:           true,
    // ... other fields
  }
}

// ❌ WRONG — raftAllocationId is omitted, all participants appear unassigned
participants: {
  include: { booking: { select: { reference: true } } }
}
```

This was the root cause of the "Missing Dog" bug where all participants appeared in the unassigned pool.

---

## 5. Guest Self-Service Portal

Guests can manage their own booking at `/manage/[reference]` (authentication via reference number + email match — no password required):

- View booking summary, activity, date, total
- Submit a **Cancellation Request** (`BookingRequest` with `type=CANCELLATION`)
- Submit a **Reschedule Request** (`BookingRequest` with `type=RESCHEDULE`)
- Download their receipt or waiver PDF from Supabase Storage

**Duplicate request prevention:** A guest cannot submit a second request if one is already `PENDING_REVIEW` for that booking.

---

## 6. Admin Panel — Route Map

| Route | Type | Description |
|---|---|---|
| `/admin` | Server Component | Dashboard: KPIs, manifest, pending payments |
| `/admin/bookings` | Server + Client | Booking list with filters, search, bulk actions |
| `/admin/bookings/[id]` | Server + Client | Booking detail: status, payments, notes |
| `/admin/availability` | Server + Client | Calendar slot management |
| `/admin/manifest` | Server + Client | Slot selector → ManifestBuilder |
| `/admin/guides` | Server + Client | Staff roster CRUD |
| `/admin/promotions` | Server + Client | Promo code management |
| `/admin/requests` | Server + Client | Guest cancellation/reschedule approvals |
| `/admin/contacts` | Server + Client | Contact form submissions |
| `/admin/settings` | Server + Client | System-wide settings key-value store |

---

## 7. Public Site — Route Map

All public routes live under `src/app/[locale]/` supporting `en` and `ja` locales via `next-intl`.

| Route | Description |
|---|---|
| `/` | Homepage (hero, activities, testimonials) |
| `/rafting` | Rafting product page |
| `/canyoning` | Canyoning product page |
| `/booking` | Multi-step booking wizard (6 steps) |
| `/booking/success` | Post-payment confirmation page |
| `/manage/[reference]` | Guest self-service portal |
| `/contact` | Contact form |
| `/faq` | FAQ accordion |
| `/about` | About page |
| `/access` | Access/directions page |
| `/terms`, `/privacy` | Legal pages |

---

## 8. Database Schema — Relationship Map

```
Product
  ├── PricingRule[]         (pricing per participant type / addon)
  ├── AvailabilitySlot[]
  │     ├── SeatHold[]
  │     ├── RaftAllocation[]
  │     │     ├── Guide (optional)
  │     │     └── BookingParticipant[] (assigned)
  │     └── Booking[]
  │           ├── BookingParticipant[]
  │           │     └── RaftAllocation? (assigned slot)
  │           ├── BookingPayment[]
  │           ├── BookingMessage[]
  │           ├── BookingRequest[]
  │           ├── AuditLog[]
  │           └── NotificationLog[]
  └── CalendarRule[]

Promotion → Booking[]
Guide     → RaftAllocation[]
AdminUser (standalone — no relations)

SystemSetting (key-value store, standalone)
ContactSubmission (standalone)
FaqItem, Testimonial, ContentPage (standalone CMS models)
```

### 8.1 Key Composite Indexes / Uniques

| Model | Constraint |
|---|---|
| `AvailabilitySlot` | `@@unique([productId, date, startTime])` — one slot per product per time |
| `RaftAllocation` | `@@unique([slotId, raftName])` — one named raft per slot |
| `Booking` | `@unique` on `reference`, `stripePaymentIntentId`, `stripeSessionId` |
| `SeatHold` | `@unique` on `bookingId` — one hold per booking |

---

## 9. Export & Reporting

### 9.1 Manifest CSV (`GET /api/admin/export/manifest`)

| Param | Effect |
|---|---|
| `?slotId=<id>` | Export one specific slot |
| `?date=YYYY-MM-DD` | Export all slots for that date |
| *(no params)* | Export today's slots (JST) |

**Columns:** Date, Time, Product, Group/Raft, Guide, Booking Ref, First Name, Last Name, Type, Age, Has Dog, Medical Notes

- Polymorphic labels (Raft A vs. Group 1)
- UNASSIGNED bucket for unplaced participants
- UTF-8 BOM prepended for Excel compatibility
- RFC-4180 compliant escaping

**Booking statuses included:** `CONFIRMED`, `PENDING`, `CASH_DUE`

### 9.2 Revenue CSV (`GET /api/admin/export/revenue`)

| Param | Effect |
|---|---|
| `?year=YYYY&month=M` | Export that calendar month |
| *(no params)* | Current UTC month |

**Columns:** Date, Booking Reference, Guest Name, Total Revenue (¥), Payment Source

Includes a summary block: Total Income, breakdown by method (Stripe / Cash / Credit Card / Bank Transfer), Net Revenue, Total Refunds.

---

## 10. Timezone Policy

All server-side "today" calculations use **JST (UTC+9)**. Never use `new Date()` raw UTC for operational date boundaries. Pattern:

```ts
const jstOffsetMs = 9 * 60 * 60 * 1_000;
const nowJst      = new Date(Date.now() + jstOffsetMs);
// Use nowJst.getUTCFullYear() / .getUTCMonth() / .getUTCDate() for JST date
```

---

## 11. Notification & Audit Systems

### Audit Log
Every significant state change writes an `AuditLog` record via `src/lib/services/audit.ts`. The `AuditAction` enum defines all valid actions (see `prisma/schema.prisma`). Actions include `MANIFEST_ASSIGNED`, `MANIFEST_CLEARED`, `BOOKING_CANCELLED`, `REFUND_ISSUED`, etc.

### Notifications
`src/lib/services/notifications.ts` sends transactional emails via **Resend**. Events: `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `REFUND_ISSUED`, `REMINDER_24H`, etc.
