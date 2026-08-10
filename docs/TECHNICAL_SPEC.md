# Dream Adventure — Technical Specification

> **Version:** 3.0 — Documentation Strike  
> **Last audited:** July 2026  
> **Stack:** Next.js 16.2.4 · React 19.2.4 · Prisma 7 · Supabase PostgreSQL · next-auth v5 · next-intl v4 · Tailwind CSS v4

---

## 1. Architecture Overview

```
Browser
  │
  ├─── /admin/* ────────────────────────────────────────────────────────────────
  │     next-intl middleware is BYPASSED (matcher excludes /admin)
  │     Auth guard: await auth() in layout.tsx + Server Components
  │     Renders: AdminSidebar + English-only admin panel
  │
  └─── /* (all other routes) ──────────────────────────────────────────────────
        │
        ▼
        next-intl middleware (src/middleware.ts)
        ├── Detects locale from URL prefix (not browser Accept-Language)
        ├── "ja" = default → no prefix, served at /
        └── "en" = secondary → served at /en/*
              │
              ▼
              src/app/[locale]/layout.tsx
              │
              ├── NEXT_PUBLIC_GRAND_OPENING_SOON === "false"?
              │     YES → Full live site with Header/Footer/Content
              │     NO  → ConstructionBlockade (full-screen holding page)
              │
              └── Settings loaded from DB (maintenanceMode, promoBanner, etc.)
```

---

## 2. The i18n System (next-intl v4)

### 2.1 Locale Configuration

**`src/i18n/routing.ts`** — the canonical locale config:

```ts
export const routing = defineRouting({
  locales: ["ja", "en"],
  defaultLocale: "ja",
  localePrefix: "as-needed",  // "ja" has NO prefix → root domain is Japanese
  localeDetection: false,      // Never auto-detect from Accept-Language header
});
```

**`src/middleware.ts`** — must mirror routing.ts exactly:

```ts
export default createMiddleware({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export const config = {
  // Exclude: API routes, Next.js internals, admin, static files
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)',]
};
```

**Critical:** The middleware `matcher` explicitly excludes `/admin` — the admin panel has no locale routing.

### 2.2 URL Structure

| URL | Locale | Notes |
|---|---|---|
| `/` | `ja` | Japanese homepage (default, no prefix) |
| `/rafting` | `ja` | Japanese rafting page |
| `/en` | `en` | English homepage |
| `/en/rafting` | `en` | English rafting page |
| `/ja/*` | — | **Legacy redirect → permanently 301 to `/*`** |

### 2.3 Translation File Structure

Translation files live in `/messages/`:

```
messages/
  ja.json   ← Japanese translations (primary locale — most important for SEO)
  en.json   ← English translations (secondary locale)
```

Keys are structured hierarchically by page/section:

```json
{
  "nav": { "home": "ホーム", "booking": "予約する" },
  "hero": { "headline": "...", "cta_book": "予約する" },
  "booking": { "steps": { "activity": "アクティビティ" } }
}
```

**Usage in code:**

```ts
// Server Component
const t = await getTranslations("hero");
return <h1>{t("headline")}</h1>;

// Client Component
const t = useTranslations("nav");
return <Link>{t("booking")}</Link>;
```

### 2.4 Hreflang / Canonical Setup

In `src/app/[locale]/layout.tsx` → `generateMetadata()`:

```ts
alternates: {
  canonical: isJa ? "/" : "/en",
  languages: {
    en: "/en",
    ja: "/",
  },
},
```

This tells search engines: root `/` is the Japanese canonical, `/en` is the English canonical.

### 2.5 next-intl Plugin Setup

In `next.config.ts`:

```ts
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
```

`src/i18n/request.ts` loads translation messages server-side and validates locale:

```ts
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "ja")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

---

## 3. The Construction Blockade System

### 3.1 How It Works

The blockade is a **fail-safe, server-rendered environment variable gate** in the locale layout:

```tsx
// src/app/[locale]/layout.tsx
{process.env.NEXT_PUBLIC_GRAND_OPENING_SOON === "false" ? (
  /* LIVE SITE — full Next-Intl provider + Header + Footer */
  <NextIntlClientProvider messages={messages}>
    ...
  </NextIntlClientProvider>
) : (
  /* DEFAULT / BLOCKADE — renders for any value other than "false" */
  <ConstructionBlockade />
)}
```

**Fail-safe logic:**
- If the env var is missing → **blockade shown** (safe default)
- If the env var is `"true"` → **blockade shown**
- If the env var is empty `""` → **blockade shown**
- Only `"false"` (exact string) → **live site shown**

### 3.2 ConstructionBlockade Component

**File:** `src/components/ConstructionBlockade.tsx`

- `"use client"` directive (uses CSS animations via inline style injection)
- Full-screen, fixed, `z-index: 9999` — nothing can overlap it
- Design: radial gradient background (`teal-950 → black`), glassmorphism card
- Bilingual: English headline "Site Under Construction" + Japanese `現在、サイトの公開準備中です`
- Animated 5-dot wave bar (`constructionPulse` keyframe, 1.4s staggered)
- The logo (`/public/logo.png`) is displayed prominently
- No links, no navigation, no email capture — intentionally simple

### 3.3 Going Live — Checklist

To launch the site:

1. In Vercel dashboard → Environment Variables
2. Set `NEXT_PUBLIC_GRAND_OPENING_SOON` = `false`
3. Trigger a redeploy (or it will apply on next deployment)
4. Verify at `thedreamadventure.com` — should show the full site

**Do not delete the blockade code.** Set it back to `true` (or remove the var) to re-enable.

---

## 4. Root Layout Architecture

### 4.1 Two-Layout Pattern

Next.js requires a root layout. This project uses a **transparent pass-through root layout**:

```tsx
// src/app/layout.tsx — Root layout (minimal, passes through)
export const metadata: Metadata = {
  title: { template: "%s | Dream Adventure Gunma", default: "Dream Adventure Gunma" },
  description: "Premier river rafting and canyoning in Gunma, Japan.",
  metadataBase: new URL("https://thedreamadventure.com"),
};

export default function RootLayout({ children }) {
  return children;  // ← No HTML shell! Locale layout provides it.
}
```

The actual `<html>` and `<body>` tags are in `src/app/[locale]/layout.tsx`:

```tsx
return (
  <html lang={locale} className={inter.variable}>
    <head>...</head>
    <body>
      {/* Blockade or live site */}
    </body>
  </html>
);
```

### 4.2 Locale Layout Runtime Features

The locale layout fetches settings from the database on every request:

```ts
const [messages, settings] = await Promise.all([
  getMessages(),     // ← Translation messages for the locale
  getSettings(),     // ← SystemSetting key-value pairs from DB
]);
```

Settings that affect layout rendering:
- `maintenanceMode` → shows amber maintenance banner above Header
- `isPromoBannerActive` + `promoBannerText` → shows teal announcement bar
- `isOffSeasonMode` → passed to Header (may affect booking CTA display)

### 4.3 Admin Layout

**File:** `src/app/admin/layout.tsx`

- Checks `await auth()` — redirects to `/admin/login` if not authenticated
- Renders: fixed `AdminSidebar` (224px) + sticky top bar + main content area
- No locale routing, no i18n provider, English-only
- Background color: `#f8faf9` (teal-tinted off-white)

---

## 5. App Router — Rendering Decisions

### 5.1 Decision Tree

```
Component needed?
│
├── Needs useState / useEffect / event handlers?
│     YES → "use client" Client Component
│     NO  → Server Component (default, no directive)
│
├── Needs to mutate data (Prisma write)?
│     YES → Server Action in src/app/actions/ ("use server" file)
│           OR API Route Handler if HTTP response needed
│     NO  → Regular server-side data fetch in Server Component
│
└── Needs HTTP response headers (CSV export, webhooks)?
      YES → API Route Handler (src/app/api/...)
```

### 5.2 Server Action File Rules

Files with `"use server"` **must only export `async` functions**:

```ts
// ❌ FATAL — breaks Turbopack build
"use server";
export const MAX_HUMANS = 7;        // forbidden — not a function
export type RaftName = "Raft A";    // forbidden — not a function
export function helper() {}         // forbidden — not async

// ✅ CORRECT — constants go to src/lib/constants/
// src/lib/constants/manifest.ts (NO "use server" directive)
export const MAX_HUMANS_PER_RAFT = 7;
export function isCanyoning(type: string) { ... }

// src/app/actions/admin/manifest.ts
"use server";
import { MAX_HUMANS_PER_RAFT } from "@/lib/constants/manifest";
export async function assignToRaft(...) { ... }
```

### 5.3 Data Fetching Pattern

```ts
// Server Component — direct Prisma (no API round-trip)
export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  return <Dashboard stats={stats} />;
}

// Client Component — calls Server Action
"use client";
async function handleAssign(pid: string, raftId: string) {
  const res = await assignToRaft(pid, raftId);
  if ("error" in res) toast.error(res.error);
}
```

---

## 6. Database Architecture

### 6.1 Prisma Client Configuration

```prisma
generator client {
  provider      = "prisma-client-js"
  engineType    = "library"        // ← Required for Vercel serverless
  binaryTargets = ["native", "rhel-openssl-3.0.x"]  // ← linux for Vercel
}

datasource db {
  provider = "postgresql"
  // DATABASE_URL  = pgbouncer pooler (runtime — set in Vercel env)
  // DIRECT_URL    = direct connection (prisma db push / migrations only)
}
```

**`src/lib/prisma.ts`** — Singleton client using `@prisma/adapter-pg`:
- Prevents connection pool exhaustion in serverless (Vercel)
- Uses the `pg` driver with pgbouncer compatibility

### 6.2 Key Database Models

| Model | Purpose |
|---|---|
| `Product` | Rafting / Canyoning activity definitions |
| `PricingRule` | Per-participant pricing (deprecated by hardcoded constants) |
| `AvailabilitySlot` | A single departure: date + startTime + capacity |
| `CalendarRule` | Bulk availability rule (date range + days of week) |
| `Booking` | A single guest booking (one activity + date) |
| `BookingParticipant` | Individual person in a booking (name, age, emergency contact) |
| `BookingPayment` | Payment ledger entry (positive = payment, negative = refund) |
| `BookingRequest` | Guest cancellation / reschedule request |
| `SeatHold` | 15-minute temporary seat reservation during Stripe checkout |
| `Promotion` | Promo code (% or fixed discount) |
| `AdminUser` | Admin login credentials |
| `FaqItem` | Public FAQ content |
| `Testimonial` | Guest review for display |
| `ContactSubmission` | Contact form inbox |
| `SystemSetting` | Key-value store for admin-configurable settings |
| `AuditLog` | Immutable log of all admin actions |
| `NotificationLog` | Email delivery history |

### 6.3 SystemSetting Keys

| Key | Type | Default | Effect |
|---|---|---|---|
| `maintenanceMode` | `"true"` / `"false"` | `"false"` | Shows amber maintenance banner |
| `isPromoBannerActive` | `"true"` / `"false"` | `"false"` | Shows teal announcement bar |
| `promoBannerText` | string | — | Text in the announcement bar |
| `isOffSeasonMode` | `"true"` / `"false"` | `"false"` | Affects Header booking CTA |
| `bookingCutoffHours` | number string | `"48"` | Overrides 48h booking cutoff |

---

## 7. Payment Architecture

### 7.1 Stripe Checkout Flow

```
Guest selects activity + slot
  ↓
createSeatHold()
  ├── SeatHold created with 15-minute expiry
  └── AvailabilitySlot.bookedCount NOT yet incremented

createBookingWithCheckout()
  ├── Booking created (status: PENDING, paymentStatus: "PENDING")
  └── stripe.checkout.sessions.create() → returns checkoutUrl

Guest pays on Stripe hosted page
  ↓
POST /api/webhooks/stripe
  └── payment_intent.succeeded event
      confirmPayment()
        ├── Booking.status = CONFIRMED
        ├── Booking.paymentStatus = "PAID - Stripe"
        ├── BookingPayment record created (method: "stripe")
        ├── SeatHold.isReleased = true
        ├── slot.bookedCount += paxCount
        ├── BookingParticipant records created
        ├── Receipt PDF generated + uploaded to Supabase Storage
        └── Confirmation email sent via Resend
```

### 7.2 Hold Expiry Cron

**Route:** `GET /api/cron/expire-holds`

Runs every 5 minutes via Vercel Cron. Finds SeatHolds with `expiresAt < now` and `isReleased = false`, then marks their booking `EXPIRED` and releases the hold.

### 7.3 Payment Status String Values

`Booking.paymentStatus` is a **String** field (not enum). Valid values:

| Value | Source |
|---|---|
| `"PENDING"` | Active Stripe session |
| `"UNPAID"` | Manual booking — pay on arrival |
| `"PAID - Stripe"` | Set by Stripe webhook |
| `"PAID - Cash"` | Admin manual entry |
| `"PAID - Credit Card"` | Admin — card terminal |
| `"PAID - Bank Transfer"` | Admin — bank transfer |
| `"REFUNDED - Stripe"` | Stripe refund processed |
| `"REFUNDED - Cash"` | Cash refund |
| `"PARTIALLY_REFUNDED"` | Partial refund issued |

---

## 8. Authentication (next-auth v5)

**File:** `src/lib/auth.ts`

- Provider: `CredentialsProvider` — email + password
- Session strategy: `jwt`
- Password hashing: `bcryptjs` (compare against `AdminUser.passwordHash`)
- Fallback: If `passwordHash` is null, falls back to `ADMIN_PASSWORD` env var
- Sign-in page: `/admin/login`
- Error page: `/admin/login`
- On success: `AdminUser.lastLoginAt` updated

**Protecting routes:**

```ts
// In Server Components / API routes
const session = await auth();
if (!session) redirect("/admin/login");
```

---

## 9. Environment Variables Reference

| Variable | Used By | Notes |
|---|---|---|
| `NEXT_PUBLIC_GRAND_OPENING_SOON` | `[locale]/layout.tsx` | `"false"` = live; anything else = blockade |
| `DATABASE_URL` | Prisma runtime | pgbouncer pooler URL |
| `DIRECT_URL` | Prisma migrations | Direct PostgreSQL URL |
| `NEXTAUTH_SECRET` | next-auth | JWT signing key |
| `NEXTAUTH_URL` | next-auth | App base URL |
| `STRIPE_SECRET_KEY` | Stripe server | `sk_live_*` or `sk_test_*` |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | `whsec_*` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js client | `pk_live_*` or `pk_test_*` |
| `SUPABASE_URL` | Supabase client | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase client | Server-only — secret |
| `RESEND_API_KEY` | Email delivery | Resend API key |
| `NEXT_PUBLIC_APP_URL` | PDF links, emails | e.g. `https://thedreamadventure.com` |
| `CRON_SECRET` | Cron authentication | Vercel cron bearer token |
| `ADMIN_EMAIL` | Seed + fallback login | Initial admin email |
| `ADMIN_PASSWORD` | Fallback login | Plain text — used if no hash in DB |

---

## 10. Next.js Config — Redirects

**File:** `next.config.ts`

All redirects are `permanent: true` (301). Key rules:

1. **Specific dead-link 404s** (old `/ja/packages/*` URLs) — handled first
2. **Legacy `/ja/*` → `/*`** — catch-all, handles old Japanese prefix URLs  
3. **`/privacy-policy` → `/privacy`** — slug normalization

The `NEXT_PUBLIC_GRAND_OPENING_SOON` pattern is also enabled:

```ts
experimental: {
  serverActions: { bodySizeLimit: "4mb" },  // For PDF uploads
},
serverExternalPackages: ["@react-pdf/renderer", "canvas"],  // PDF server-only
images: {
  remotePatterns: [
    { protocol: "https", hostname: "**.supabase.co" },
    { protocol: "https", hostname: "images.unsplash.com" },
  ],
},
```

---

## 11. File Path Aliases

Configured in `tsconfig.json`:

| Alias | Resolves to |
|---|---|
| `@/lib/*` | `src/lib/*` |
| `@/components/*` | `src/components/*` |
| `@/app/*` | `src/app/*` |
| `@/i18n/*` | `src/i18n/*` |

---

## 12. Build & Deployment

```bash
# Development
npm run dev

# Type check (must pass before any commit)
npm run typecheck

# Production build
npm run build

# Database schema changes (no migration history)
npx prisma db push

# Regenerate Prisma client after schema changes
npx prisma generate

# Seed initial data
npm run seed
```

**Vercel deployment:** Push to `main` branch triggers automatic build on Vercel.

---

*See also: `docs/PRD.md` (business logic), `docs/design.md` (design system), `docs/ADMIN_OPERATIONS.md` (admin workflows)*
