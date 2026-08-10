@AGENTS.md
@docs/claude.md

# Dream Adventure — Development Standards (CLAUDE.md)

> This file defines the code conventions, naming standards, Tailwind patterns, and TypeScript rules for the Dream Adventure codebase.
> **All AI agents and human developers must follow these standards.**

---

## 1. File & Directory Naming Conventions

### 1.1 React Components
- **PascalCase** for all component files: `AdminBookingsTable.tsx`, `ConstructionBlockade.tsx`
- Component name must **exactly match** the file name
- One component per file (no barrel files exporting multiple components)

### 1.2 Server Actions Files
- **camelCase** for action files in `src/app/actions/admin/`: `availability.ts`, `manifest.ts`, `promos.ts`
- Files with `"use server"` must **only** export `async` functions — no constants, types, or sync functions

### 1.3 Service & Utility Files
- **camelCase** in `src/lib/services/`: `booking.ts`, `notifications.ts`, `pdf.tsx`
- **camelCase** in `src/lib/`: `auth.ts`, `utils.ts`, `prisma.ts`
- Constants files in `src/lib/constants/`: `manifest.ts` — never add `"use server"` here

### 1.4 Route Files (App Router)
- Follow Next.js App Router conventions: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`
- Locale segment: `src/app/[locale]/` — lowercase, bracket syntax
- Param segments: `src/app/admin/bookings/[id]/` — lowercase, bracket syntax

### 1.5 Type & Interface Naming
```ts
// ✅ PascalCase interfaces
interface BookingRow { ... }
interface AdminSettings { ... }

// ✅ PascalCase type aliases
type DepartureTime = "09:00" | "11:30" | "13:30";
type ActivityType = "RAFTING" | "CANYONING" | "COMBO";

// ✅ UPPER_SNAKE_CASE for constants
export const BOOKING_CUTOFF_HOURS = 48;
export const DEPARTURE_TIMES = ["09:00", "11:30", "13:30"] as const;
export const PRICING = { RAFTING_ADULT: 6000, ... } as const;

// ❌ NEVER — generic naming or `any`
const data: any = await prisma.booking.findMany();
```

### 1.6 Variable & Function Naming
```ts
// ✅ camelCase for variables and functions
const bookingRef = generateBookingReference();
async function confirmPayment(sessionId: string) { ... }

// ✅ Action verbs for mutation functions
async function createManualBooking(...) { ... }
async function assignToRaft(...) { ... }
async function cancelBooking(...) { ... }

// ✅ get/fetch prefix for query functions
async function getSettings() { ... }
async function getDashboardStats() { ... }
```

---

## 2. Tailwind CSS Patterns

### 2.1 Core Rule — Never Raw Hex in Class Names
```tsx
// ❌ WRONG — Tailwind arbitrary color values
<div className="[background:#0d9488]">
<div className="[color:#134e4a]">

// ✅ CORRECT — semantic design system classes
<div className="bg-teal-600">
<div className="text-teal-950">
```

### 2.2 Design System Class Priority
Always prefer semantic design system classes over ad-hoc utilities:

```tsx
// ❌ WRONG — re-implementing what .card already does
<div className="bg-white rounded-2xl shadow-sm border border-teal-100 hover:shadow-md hover:-translate-y-1 transition-all">

// ✅ CORRECT — use the design system class
<div className="card p-6">
```

Design system classes (defined in `globals.css`):
- `.card` — content panel with teal border + hover lift
- `.btn .btn-primary` / `.btn-outline` / `.btn-ghost` — button variants
- `.badge .badge-teal` / `.badge-amber` / `.badge-red` — status badges
- `.input` — form text input
- `.label` — form label
- `.admin-table` — data table
- `.container-site` — max-width wrapper
- `.section` — section padding
- `.hero-gradient` — homepage hero

### 2.3 Responsive Pattern
Every UI element must be responsive. Use mobile-first progression:

```tsx
// ✅ Mobile-first responsive classes
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<p className="text-sm sm:text-base lg:text-lg">
<div className="p-4 sm:p-6 lg:p-8">
<div className="w-full sm:w-auto">
```

Minimum test widths: **375px** (mobile), **768px** (tablet), **1280px** (desktop).

### 2.4 Stone for Neutral — Never Gray/Slate/Zinc
```tsx
// ❌ WRONG — cool gray variants
<p className="text-gray-500">
<div className="bg-slate-100">

// ✅ CORRECT — warm stone palette
<p className="text-stone-500">
<div className="bg-stone-100">
```

### 2.5 Focus Ring Pattern
```tsx
// ✅ Always pair outline-none with focus-visible:ring
className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"

// ✅ With offset (sidebar links)
className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1"

// ❌ NEVER suppress focus without replacement — breaks keyboard navigation
className="focus:outline-none"
```

### 2.6 Dynamic Values — When `style={{}}` Is Allowed
```tsx
// ✅ Only for truly dynamic values
<div style={{ width: `${capacityPct}%` }}>
<div style={{ background: raftPalette[raftName].accent }}>

// ❌ Never for static colors
<div style={{ backgroundColor: "#0d9488" }}>  // Use bg-teal-600
```

---

## 3. TypeScript Rules

### 3.1 Never Use `any`
```ts
// ❌ FORBIDDEN
const booking: any = await prisma.booking.findUnique(...);
const result: any = {};

// ✅ Let Prisma infer types automatically
const booking = await prisma.booking.findUnique({
  where: { id },
  include: { participants: true },
});

// ✅ Explicit interface if serializing for client
interface BookingRow {
  id: string;
  reference: string;
  status: BookingStatus;
}
```

### 3.2 Server Action Return Pattern
All server actions must return a typed discriminated union — never `throw`:

```ts
// ✅ CORRECT pattern for all server actions
export async function doSomething(
  id: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await prisma.booking.update({ where: { id }, data: { ... } });
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("[doSomething]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

// ✅ Client-side usage
const result = await doSomething(id);
if ("error" in result) {
  toast.error(result.error);
  return;
}
// result is now { success: true }
```

### 3.3 Prisma Query Types
```ts
// ✅ Use Prisma's $inferSelect for table row types
type BookingSelect = Prisma.BookingGetPayload<{
  select: { id: true; reference: true; status: true }
}>;

// ✅ Always explicit select for nested FK scalars
// (Prisma silently omits FK scalars like raftAllocationId in plain include)
participants: {
  select: {
    id: true,
    raftAllocationId: true,  // ← MUST be explicit or it returns null
    firstName: true,
    participantType: true,
  }
}
```

### 3.4 Enum vs. String Field Distinction

**Critical:** `Booking.paymentStatus` is a **String** field, NOT an enum. `Booking.status` IS an enum.

```ts
// ❌ WRONG — { in: } on String fields
where: { paymentStatus: { in: ["PAID", "PENDING"] } }

// ✅ CORRECT — OR array for String fields
where: {
  OR: [
    { paymentStatus: "PAID - Stripe" },
    { paymentStatus: "PAID - Cash" },
  ]
}

// ✅ CORRECT — { in: } IS valid for enum fields
where: { status: { in: ["CONFIRMED", "PENDING"] } }
```

### 3.5 Async Component Pattern (Server Components)

```ts
// ✅ Server Component — async function, no directive needed
export default async function AdminPage() {
  const data = await getBookings();
  return <div>...</div>;
}

// ✅ Server Component with params (Next.js 16 App Router)
export default async function LocaleLayout({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;  // ← params is a Promise in Next.js 16
  ...
}
```

### 3.6 TypeScript Build Must Pass

After every code change:

```bash
npx tsc --noEmit
```

Zero TypeScript errors = done. Never commit code with TypeScript errors.

---

## 4. Component Architecture Patterns

### 4.1 Server vs. Client — The Decision Rule
```
Need useState / useEffect / onClick / onChange?
  YES → "use client" at top of file
  NO  → Server Component (default, no directive)

Need to mutate data / call Prisma?
  YES → "use server" in src/app/actions/ file (export async functions only)
       OR API Route Handler if HTTP Response needed
```

### 4.2 Import Order Convention
```ts
// 1. Next.js built-ins
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

// 2. Third-party libraries
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// 3. Internal — lib
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatJpy } from "@/lib/utils";

// 4. Internal — components
import Header from "@/components/layout/Header";
import AdminSidebar from "@/components/admin/AdminSidebar";

// 5. Types (last)
import type { BookingStatus } from "@prisma/client";
```

### 4.3 Error Boundary Pattern
```tsx
// Every locale route has an error.tsx for graceful degradation
// src/app/[locale]/error.tsx — already implemented
// src/app/global-error.tsx — already implemented
// Do NOT remove these files
```

---

## 5. Business Logic Constants — Never Hardcode Inline

All pricing, timing, and capacity values come from `src/lib/utils.ts`:

```ts
// ✅ Import from utils
import { PRICING, CAPACITY, DEPARTURE_TIMES, BOOKING_CUTOFF_HOURS } from "@/lib/utils";

// ❌ Never inline business constants
const adultPrice = 6000;  // where did 6000 come from? Use PRICING.RAFTING_ADULT
const maxPax = 21;        // Use CAPACITY.RAFTING
```

---

## 6. JST Timezone — Always

```ts
// ❌ WRONG — UTC time, not Japan time
const today = new Date();
const startOfDay = new Date(today.setHours(0, 0, 0, 0));

// ✅ CORRECT — JST (UTC+9)
const jstOffsetMs = 9 * 60 * 60 * 1_000;
const nowJst = new Date(Date.now() + jstOffsetMs);
const year = nowJst.getUTCFullYear();
const month = nowJst.getUTCMonth();
const day = nowJst.getUTCDate();
```

---

## 7. Soft-Delete — Never Hard-Delete

```ts
// ❌ FORBIDDEN — hard delete destroys audit trail
await prisma.guide.delete({ where: { id } });
await prisma.booking.delete({ where: { id } });

// ✅ CORRECT — soft delete
await prisma.guide.update({ where: { id }, data: { isActive: false } });
await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
```

---

*For the full 20-rule AI agent protocol, read `docs/claude.md`.*  
*For architectural patterns and critical gotchas, read `docs/tech-stack.md`.*  
*For design system details, read `docs/design.md`.*
