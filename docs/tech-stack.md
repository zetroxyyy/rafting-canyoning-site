# Dream Adventure — Technology Stack & Architecture

> **Version:** 2.0 — Phase 4 Close-out
> **Last updated:** 2026-05-15

---

## 1. Core Dependency Versions

| Package | Version | Role |
|---|---|---|
| `next` | **16.2.4** | Framework (App Router) |
| `react` | **19.2.4** | UI runtime |
| `react-dom` | **19.2.4** | DOM renderer |
| `typescript` | `^5` | Type safety |
| `tailwindcss` | `^4` | Utility CSS (v4 syntax — `@import "tailwindcss"`) |
| `@tailwindcss/postcss` | `^4` | PostCSS integration for Tailwind v4 |
| `prisma` | `^7.7.0` | ORM + schema management |
| `@prisma/client` | `^7.7.0` | Generated DB client |
| `@prisma/adapter-pg` | `^7.7.0` | Prisma/pg connection adapter |
| `pg` | `^8.20.0` | PostgreSQL driver |
| `next-auth` | `^5.0.0-beta.31` | Admin authentication |
| `@auth/prisma-adapter` | `^2.11.2` | Auth → Prisma session adapter |
| `stripe` | `^22.0.2` | Payment processing (server SDK) |
| `@stripe/stripe-js` | `^9.2.0` | Stripe.js (client-side checkout redirect) |
| `@supabase/supabase-js` | `^2.104.1` | Supabase Storage (PDF hosting) |
| `next-intl` | `^4.9.1` | i18n routing and translations |
| `resend` | `^6.12.0` | Transactional email delivery |
| `zod` | `^4.3.6` | Schema validation |
| `react-hook-form` | `^7.72.1` | Form state management |
| `@hookform/resolvers` | `^5.2.2` | Zod ↔ RHF integration |
| `lucide-react` | `^1.8.0` | Icon library |
| `recharts` | `^3.8.1` | Revenue chart (admin dashboard) |
| `@react-pdf/renderer` | `^4.5.1` | PDF generation (receipts, waivers) |
| `bcryptjs` | `^3.0.3` | Admin password hashing |
| `date-fns` | `^4.1.0` | Date formatting utilities |
| `clsx` | `^2.1.1` | Conditional class merging |
| `tailwind-merge` | `^3.5.0` | Tailwind class conflict resolution |
| `@radix-ui/*` | Various | Accessible headless primitives |

---

## 2. Infrastructure

| Service | Purpose | Notes |
|---|---|---|
| **Vercel** | Hosting + Edge Functions | Serverless — `force-dynamic` where needed |
| **Supabase** | PostgreSQL database | `DATABASE_URL` (pgbouncer pooler), `DIRECT_URL` (direct for migrations) |
| **Supabase Storage** | PDF file storage | Receipts and waiver PDFs |
| **Stripe** | Online payments | Stripe Checkout hosted page; webhook at `/api/webhooks/stripe` |
| **Resend** | Email delivery | Booking confirmations, refund notices |

---

## 3. Next.js App Router Architecture

### 3.1 Directory Structure

```
src/
  app/
    [locale]/          ← Public-facing pages (en / ja via next-intl)
      page.tsx         ← Homepage
      booking/         ← Multi-step booking wizard
      manage/[reference]/ ← Guest self-service portal
      rafting/
      canyoning/
      contact/
      faq/
      ...
    admin/             ← Admin panel (protected by auth middleware)
      page.tsx         ← Dashboard (Server Component)
      bookings/
      manifest/
      guides/
      promotions/
      requests/
      availability/
      settings/
      layout.tsx       ← Auth guard + sidebar + topbar
    api/               ← API Route Handlers
      admin/
        bookings/[id]/route.ts
        export/manifest/route.ts
        export/revenue/route.ts
        export/bookings/route.ts
      booking/
        request/route.ts
      webhooks/
        stripe/route.ts
      cron/
        expire-holds/route.ts
        send-reminders/route.ts
    actions/           ← Server Actions
      admin/
        manifest.ts
        guides.ts
        promos.ts
        settings.ts
        bulkCompleteBookings.ts
  components/
    admin/             ← All interactive admin UI (Client Components)
    public/            ← Public site components
  lib/
    auth.ts            ← next-auth config
    prisma.ts          ← Prisma client singleton
    constants/
      manifest.ts      ← Shared manifest constants (NOT "use server")
    services/
      booking.ts       ← Core booking logic + Stripe checkout
      manualBooking.ts ← Admin manual booking logic
      availability.ts  ← Slot availability queries
      hold.ts          ← SeatHold management
      audit.ts         ← AuditLog writer
      notifications.ts ← Email dispatch via Resend
      pdf.ts           ← @react-pdf/renderer PDF generation
      bookingRequests.ts ← Cancel/reschedule request logic
    schemas/           ← Zod validation schemas
    utils.ts           ← Shared utilities (generateBookingReference, calcSubtotal)
    storage.ts         ← Supabase Storage client (PDF upload/download)
```

### 3.2 Rendering Pattern Decision Tree

```
Is the component purely display (no useState, no event handlers)?
  YES → Server Component (default, no directive needed)
  NO  → Client Component ("use client" at top of file)

Does the function mutate data or call Prisma directly?
  YES → Server Action ("use server" in a dedicated actions/ file)
       OR API Route Handler (src/app/api/...)
  NO  → Regular function / utility

When to use Server Action vs. API Route:
  Server Action:  Admin panel mutations (manifest, guides, promos, settings, bulk ops)
  API Route:      Stripe webhook, cron jobs, CSV exports (need HTTP response object), 
                  public booking request (no auth, needs Response)
```

### 3.3 Server Component Rules

> These are hard constraints enforced by Next.js App Router. Violations cause Vercel build failures.

1. **No event handlers** (`onClick`, `onMouseEnter`, `onChange`, etc.) on any element in a Server Component. Use pure Tailwind `hover:` classes instead.
2. **No `useState`, `useEffect`, or any React hook** — these are Client Component APIs.
3. **Server Actions (`"use server"` files) must ONLY export `async` functions.** No constants, no regular functions, no types. Move shared constants to a non-`"use server"` file (e.g., `src/lib/constants/`).

### 3.4 Data Fetching Pattern

```ts
// Server Component — direct Prisma call (no API round-trip)
export default async function AdminDashboard() {
  const stats = await getDashboardStats();  // calls prisma directly
  return <Dashboard stats={stats} />;
}

// Client Component — calls a Server Action
"use client";
async function handleAssign(pid: string, raftId: string) {
  const res = await assignToRaft(pid, raftId);  // Server Action
  if ("error" in res) showToast(res.error);
}
```

---

## 4. Database Architecture

### 4.1 Prisma Configuration

```prisma
generator client {
  provider      = "prisma-client-js"
  engineType    = "library"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  // DATABASE_URL  = pgbouncer pooler (runtime)
  // DIRECT_URL    = direct connection (migrations only)
}
```

### 4.2 Prisma Client Singleton

Located at `src/lib/prisma.ts`. Uses the `@prisma/adapter-pg` adapter to connect via the `pg` driver — required for Vercel's serverless environment with pgbouncer.

### 4.3 Critical Query Patterns

**Always use explicit `select` when needing FK fields from nested relations:**

```ts
// CORRECT — raftAllocationId included
participants: {
  select: {
    id:               true,
    raftAllocationId: true,   // ← FK field — omitted by plain include
    hasDog:           true,
  }
}

// WRONG — raftAllocationId is silently omitted
participants: {
  include: { booking: { select: { reference: true } } }
}
```

**Never use `{ in: [...] }` on String scalar fields** — Prisma's generated client type-validates this differently than enums:

```ts
// CORRECT — use OR array for String fields
where: {
  OR: [
    { paymentStatus: "PENDING" },
    { paymentStatus: "UNPAID" },
    { paymentStatus: "CASH_DUE" },
  ]
}

// ALSO CORRECT for BookingStatus (which IS an enum)
where: {
  status: { in: ["CONFIRMED", "PENDING", "CASH_DUE"] }
}
```

---

## 5. Authentication

**next-auth v5 (Auth.js beta)** with Prisma adapter.

- Admin routes protected via `await auth()` in Server Components and API route handlers
- No public-facing login — guests access their bookings via reference + email (no session)
- Admin session stored in the database via `@auth/prisma-adapter`
- Password hashing: `bcryptjs`

> **Note:** The next-auth v5 API differs significantly from v4. Always check `node_modules/next/dist/docs/` before modifying auth config.

---

## 6. Payment Architecture

### 6.1 Stripe Checkout Flow

```
1. createBookingWithCheckout()
   └── Creates SeatHold (15 min expiry)
   └── Creates PENDING Booking
   └── Calls stripe.checkout.sessions.create()
   └── Returns checkoutUrl

2. Guest redirected to Stripe hosted page

3. POST /api/webhooks/stripe
   └── Verifies Stripe signature
   └── payment_intent.succeeded → confirmPayment()
       ├── Booking.status = CONFIRMED
       ├── Booking.paymentStatus = "PAID - Stripe"
       ├── BookingPayment record created (method: "stripe")
       ├── SeatHold.isReleased = true
       ├── slot.bookedCount += paxCount
       ├── BookingParticipant records created
       ├── Receipt PDF generated + uploaded to Supabase
       └── Confirmation email sent via Resend
```

### 6.2 Manual Payment Flow (Admin)

```
Admin creates booking via ManualBookingForm
└── createManualBooking() service
    ├── Commits slot capacity directly (no hold)
    ├── Booking.status = CONFIRMED or CASH_DUE
    ├── Booking.paymentStatus = "PAID - Cash" / "PAID - Credit Card" / "UNPAID"
    └── BookingPayment record created (method: "cash" / "credit_card_terminal" / etc.)
```

### 6.3 Refund Flow

```
Admin initiates refund via AdminBookingActions
└── FINALIZE_CANCEL action in /api/admin/bookings/[id]/route.ts
    ├── For Stripe bookings: stripe.refunds.create()
    ├── BookingPayment.create({ amountJpy: -refundAmount }) ← negative = refund ledger entry
    ├── Booking.paymentStatus = "REFUNDED - Stripe" / "REFUNDED - Cash"
    ├── slot.bookedCount -= paxCount (capacity restoration)
    └── Booking.status = CANCELLED
```

---

## 7. i18n (Internationalisation)

**next-intl v4** with locale-based routing.

- Supported locales: `en` (English), `ja` (Japanese)
- All public-facing routes are nested under `src/app/[locale]/`
- Translation files in `messages/en.json` and `messages/ja.json`
- Admin panel is English-only (no locale routing under `/admin`)
- Guest-facing PDFs respect `booking.leadLocale`

---

## 8. Environment Variables

| Variable | Used By | Notes |
|---|---|---|
| `DATABASE_URL` | Prisma (runtime) | pgbouncer pooler URL |
| `DIRECT_URL` | Prisma (migrations) | Direct PostgreSQL URL |
| `NEXTAUTH_SECRET` | next-auth | Cookie signing |
| `NEXTAUTH_URL` | next-auth | App base URL |
| `STRIPE_SECRET_KEY` | Stripe server SDK | `sk_live_*` or `sk_test_*` |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | `whsec_*` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js | `pk_live_*` or `pk_test_*` |
| `SUPABASE_URL` | Storage client | |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage client | Server-only |
| `RESEND_API_KEY` | Email delivery | |
| `NEXT_PUBLIC_APP_URL` | PDF links, email links | e.g. `https://dreamadventure.jp` |
| `CRON_SECRET` | Cron job auth | Vercel cron bearer token |
| `ADMIN_EMAIL` | Admin fallback login | |
| `ADMIN_PASSWORD` | Admin fallback login | Plain text — hashed on first use |

---

## 9. Build & Deployment

```bash
# Development
npm run dev

# Production build (runs prisma db seed before build)
npm run build

# Database schema push (no migration history)
npx prisma db push

# Generate Prisma client after schema changes
npx prisma generate

# Type check only (no emit)
npx tsc --noEmit
```

**Vercel deployment:** Push to `main` triggers automatic build on Vercel. The `build` script runs `prisma db seed && next build`.

---

## 10. File Path Aliases

Configured in `tsconfig.json`:

| Alias | Resolves to |
|---|---|
| `@/lib/*` | `src/lib/*` |
| `@/components/*` | `src/components/*` |
| `@/app/*` | `src/app/*` |
