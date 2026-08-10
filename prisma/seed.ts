/**
 * Prisma seed script — Dream Adventure v5 (Clean Slate, Fast Batch)
 *
 * Strategy:
 *  1. Wipe old test bookings and stale data (FK-safe order).
 *  2. Upsert the two canonical products: River Rafting + Canyoning.
 *  3. Recreate pricing rules.
 *  4. Seed 90 days of availability slots using fast batched raw SQL.
 *  5. Seed admin user, promo code, FAQ items.
 *
 * Run with: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL must be set in environment");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to generate a short CUID-style ID for slots
function uid(): string {
  return (
    "c" +
    Math.random().toString(36).slice(2, 11) +
    Date.now().toString(36)
  );
}

async function main() {
  console.log("🌱 Dream Adventure — Clean seed starting...\n");

  // ── Step 1: Wipe junk data (FK-safe order) ───────────────────────────────────

  console.log("🧹 Wiping old data...");

  await prisma.auditLog.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.bookingRequest.deleteMany({});
  await prisma.bookingParticipant.deleteMany({});
  await prisma.bookingPayment.deleteMany({});
  await prisma.bookingMessage.deleteMany({});
  await prisma.seatHold.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.availabilitySlot.deleteMany({});
  await prisma.pricingRule.deleteMany({});
  await prisma.calendarRule.deleteMany({});

  console.log("   ✓ Old data wiped\n");

  // ── Step 2: Upsert products ───────────────────────────────────────────────────

  console.log("📦 Upserting products...");

  const rafting = await prisma.product.upsert({
    where: { slug: "rafting" },
    update: {
      nameEn: "River Rafting",
      nameJa: "リバーラフティング",
      descriptionEn: "Navigate the powerful Tone River on a guided group raft. Suitable from age 6. Max 21 participants per departure.",
      descriptionJa: "利根川の急流を経験豊富なガイドとともにダウンリバー。6歳以上。1便あたり最大21名。",
      isActive: true,
      sortOrder: 0,
    },
    create: {
      id: "cmo7ffeih0000eguxbmagdoxp",
      slug: "rafting",
      activityType: "RAFTING",
      nameEn: "River Rafting",
      nameJa: "リバーラフティング",
      descriptionEn: "Navigate the powerful Tone River on a guided group raft. Suitable from age 6. Max 21 participants per departure.",
      descriptionJa: "利根川の急流を経験豊富なガイドとともにダウンリバー。6歳以上。1便あたり最大21名。",
      isActive: true,
      sortOrder: 0,
    },
  });

  const canyoning = await prisma.product.upsert({
    where: { slug: "canyoning" },
    update: {
      nameEn: "Canyoning",
      nameJa: "キャニオニング",
      descriptionEn: "Descend waterfalls, slide natural chutes, and explore hidden gorges. Ages 12+. Max 35 participants per departure.",
      descriptionJa: "滝をくぐり、天然の滑り台を滑り、隠れた渓谷を探検。12歳以上。1便あたり最大35名。",
      isActive: true,
      sortOrder: 1,
    },
    create: {
      id: "cmo7fff7m0001eguxz2pbd1sj",
      slug: "canyoning",
      activityType: "CANYONING",
      nameEn: "Canyoning",
      nameJa: "キャニオニング",
      descriptionEn: "Descend waterfalls, slide natural chutes, and explore hidden gorges. Ages 12+. Max 35 participants per departure.",
      descriptionJa: "滝をくぐり、天然の滑り台を滑り、隠れた渓谷を探検。12歳以上。1便あたり最大35名。",
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log("   ✓ River Rafting:", rafting.id);
  console.log("   ✓ Canyoning:    ", canyoning.id, "\n");

  // ── Step 3: Pricing rules ─────────────────────────────────────────────────────

  console.log("💰 Creating pricing rules...");

  await prisma.pricingRule.createMany({
    data: [
      { productId: rafting.id,   participantType: "ADULT", priceJpy: 6000, isAddon: false },
      { productId: rafting.id,   participantType: "CHILD", priceJpy: 4000, isAddon: false },
      { productId: rafting.id,   participantType: "ADULT", priceJpy: 0, isAddon: true, addonSlug: "bbq", isBbq: true },
      { productId: canyoning.id, participantType: "ADULT", priceJpy: 6000, isAddon: false },
      { productId: canyoning.id, participantType: "CHILD", priceJpy: 4000, isAddon: false },
    ],
  });

  console.log("   ✓ Rafting:   Adult ¥6,000 | Child ¥4,000");
  console.log("   ✓ Canyoning: Adult ¥6,000 | Child ¥4,000");
  console.log("   ✓ BBQ add-on: pay on arrival (¥0 online)\n");

  // ── Step 4: Availability slots — batched raw SQL (fast) ──────────────────────
  //
  // Correct departure times: 09:00, 11:30, 13:30
  // Capacities: Rafting = 21, Canyoning = 35
  // We build ALL rows in memory then INSERT in one batched query.

  console.log("📅 Seeding availability slots (90 days, batched)...");

  const TIMES = ["09:00", "11:30", "13:30"];
  const now = new Date();
  const nowUtcMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  // Build all slot rows
  type SlotRow = {
    id: string;
    productId: string;
    date: string;   // ISO date string "YYYY-MM-DD"
    startTime: string;
    maxCapacity: number;
    bookedCount: number;
    status: string;
    isBlocked: boolean;
    condition: string;
    createdAt: string;
    updatedAt: string;
  };

  const slotRows: SlotRow[] = [];
  const isoNow = new Date().toISOString();

  for (let d = 1; d <= 90; d++) {
    const dateMs = nowUtcMs + d * 86_400_000;
    const dateISO = new Date(dateMs).toISOString().slice(0, 10); // "YYYY-MM-DD"

    for (const product of [
      { id: rafting.id,   cap: 21 },
      { id: canyoning.id, cap: 35 },
    ]) {
      for (const time of TIMES) {
        slotRows.push({
          id:           uid(),
          productId:    product.id,
          date:         dateISO,
          startTime:    time,
          maxCapacity:  product.cap,
          bookedCount:  0,
          status:       "OPEN",
          isBlocked:    false,
          condition:    "OPTIMAL",
          createdAt:    isoNow,
          updatedAt:    isoNow,
        });
      }
    }
  }

  // Batch insert in chunks of 100 rows
  const CHUNK = 100;
  let insertedCount = 0;

  for (let i = 0; i < slotRows.length; i += CHUNK) {
    const chunk = slotRows.slice(i, i + CHUNK);

    // Build parameterised VALUES clause
    const params: (string | number | boolean)[] = [];
    const valuePlaceholders = chunk.map((row) => {
      const base = params.length + 1;
      params.push(
        row.id,
        row.productId,
        row.date,
        row.startTime,
        row.maxCapacity,
        row.bookedCount,
        row.status,
        row.isBlocked,
        row.condition,
        row.createdAt,
        row.updatedAt
      );
      return `($${base},$${base+1},$${base+2}::date,$${base+3},$${base+4},$${base+5},$${base+6}::\"SlotStatus\",$${base+7},$${base+8}::\"SlotCondition\",$${base+9}::timestamptz,$${base+10}::timestamptz)`;
    });

    const sql = `
      INSERT INTO "AvailabilitySlot"
        (id, "productId", date, "startTime", "maxCapacity", "bookedCount", status, "isBlocked", condition, "createdAt", "updatedAt")
      VALUES ${valuePlaceholders.join(",")}
      ON CONFLICT ("productId", date, "startTime") DO UPDATE
        SET "maxCapacity" = EXCLUDED."maxCapacity",
            status        = EXCLUDED.status,
            "updatedAt"   = EXCLUDED."updatedAt"
    `;

    await prisma.$executeRawUnsafe(sql, ...params);
    insertedCount += chunk.length;
    process.stdout.write(`\r   Progress: ${insertedCount}/${slotRows.length} slots`);
  }

  console.log(`\n   ✓ ${slotRows.length} slots seeded (Rafting cap: 21, Canyoning cap: 35)\n`);

  // ── Step 5: Admin user ────────────────────────────────────────────────────────

  console.log("👤 Upserting admin user...");

  await prisma.adminUser.upsert({
    where: { email: "admin@thedreamadventure.com" },
    update: {},
    create: {
      email: "admin@thedreamadventure.com",
      name:  "Dream Adventure Admin",
      role:  "admin",
      isActive: true,
    },
  });

  console.log("   ✓ admin@thedreamadventure.com\n");

  // ── Step 6: Promo code ────────────────────────────────────────────────────────

  console.log("🎫 Upserting promo codes...");

  await prisma.promotion.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      category: "SEASONAL",
      value: 10,
      maxUses: 100,
      isActive: true,
      descriptionEn: "10% welcome discount",
      descriptionJa: "10%ウェルカム割引",
    },
  });

  await prisma.promotion.upsert({
    where: { code: "VIPRETURN15" },
    update: {},
    create: {
      code: "VIPRETURN15",
      type: "PERCENT",
      category: "REFERRAL",
      value: 15,
      isActive: true,
      descriptionEn: "15% return adventurer discount",
      descriptionJa: "15%リピーター割引",
    },
  });

  console.log("   ✓ WELCOME10 (10% off)");
  console.log("   ✓ VIPRETURN15 (15% off)\n");

  // ── Step 7: FAQ items (concierge model) ──────────────────────────────────────

  console.log("❓ Seeding FAQ items...");

  await prisma.faqItem.deleteMany({});

  const faqs = [
    {
      id: "seed-faq-booking-0",
      category: "booking",
      questionEn: "How do I book?",
      questionJa: "予約はどうすればよいですか？",
      answerEn:   "Submit your request online. Our team will call you to confirm your schedule. No payment is required online.",
      answerJa:   "オンラインでリクエストを送信してください。スタッフがお電話にてスケジュールを確認します。オンライン決済は不要です。",
    },
    {
      id: "seed-faq-payment-0",
      category: "payment",
      questionEn: "How do I pay?",
      questionJa: "お支払い方法を教えてください",
      answerEn:   "We operate a 'Call to Confirm / Pay on Arrival' model. No online payments. Full payment is collected in cash or card at our base on the day.",
      answerJa:   "「お電話で確認・現地払い」モデルを採用しています。オンライン決済は不要で、当日ベースにて現金またはカードでお支払いいただきます。",
    },
    {
      id: "seed-faq-safety-0",
      category: "safety",
      questionEn: "Is experience required?",
      questionJa: "経験は必要ですか？",
      answerEn:   "No experience needed for rafting. Canyoning participants should be comfortable with heights and water.",
      answerJa:   "ラフティングは未経験でも大丈夫です。キャニオニングは高所や水が苦手でない方が対象です。",
    },
    {
      id: "seed-faq-eligibility-0",
      category: "eligibility",
      questionEn: "What are the age requirements?",
      questionJa: "年齢制限はありますか？",
      answerEn:   "River Rafting: minimum age 6, max 21 per departure. Canyoning: minimum age 12, max 35 per departure.",
      answerJa:   "リバーラフティング：6歳以上、最大21名。キャニオニング：12歳以上、最大35名。",
    },
    {
      id: "seed-faq-weather-0",
      category: "weather",
      questionEn: "What happens if cancelled due to weather?",
      questionJa: "悪天候でキャンセルになった場合はどうなりますか？",
      answerEn:   "Since payment is on arrival, there are no charges. We'll contact you early and arrange a free reschedule.",
      answerJa:   "現地払いのため費用は一切発生しません。できるだけ早くご連絡し、無料で日程変更にて対応します。",
    },
    {
      id: "seed-faq-bbq-0",
      category: "bbq",
      questionEn: "Is BBQ included?",
      questionJa: "BBQは料金に含まれますか？",
      answerEn:   "BBQ is a pay-on-arrival riverside add-on. Not included in the activity price. Request it at booking.",
      answerJa:   "BBQは現地払いのオプションです。アクティビティ料金には含まれません。予約時にリクエストしてください。",
    },
    {
      id: "seed-faq-cancellation-0",
      category: "cancellation",
      questionEn: "What is the cancellation policy?",
      questionJa: "キャンセルポリシーを教えてください",
      answerEn:   "72+ hours before: free. Less than 24 hours: fee may apply. Since payment is on arrival, no automatic charges.",
      answerJa:   "72時間以上前：無料。24時間未満：キャンセル料が発生する場合があります。現地払いのため自動請求はありません。",
    },
  ];

  for (const faq of faqs) {
    await prisma.faqItem.upsert({
      where: { id: faq.id },
      update: {
        questionEn: faq.questionEn,
        questionJa: faq.questionJa,
        answerEn:   faq.answerEn,
        answerJa:   faq.answerJa,
        isPublished: true,
      },
      create: {
        id:         faq.id,
        category:   faq.category,
        questionEn: faq.questionEn,
        questionJa: faq.questionJa,
        answerEn:   faq.answerEn,
        answerJa:   faq.answerJa,
        isPublished: true,
        sortOrder:  faqs.indexOf(faq),
      },
    });
  }

  console.log(`   ✓ ${faqs.length} FAQ items seeded\n`);

  // ── Summary ──────────────────────────────────────────────────────────────────

  console.log("🎉 Seed complete!\n");
  console.log("   Product IDs (add to .env):");
  console.log(`   NEXT_PUBLIC_RAFTING_PRODUCT_ID="${rafting.id}"`);
  console.log(`   NEXT_PUBLIC_CANYONING_PRODUCT_ID="${canyoning.id}"`);
  console.log("\n   Slots:  09:00 · 11:30 · 13:30");
  console.log("   Rafting capacity:   21 per departure");
  console.log("   Canyoning capacity: 35 per departure");
}

main()
  .catch((e) => {
    console.error("\nSeed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
