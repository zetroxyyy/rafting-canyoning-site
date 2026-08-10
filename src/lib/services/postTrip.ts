/**
 * postTrip.ts — Shared post-trip notification service.
 *
 * Provides `sendPostTripEmailForBooking(bookingId)` which fires the premium
 * "Thank You + VIP Return Discount" email to the guest.
 *
 * Called by:
 *   1. GET /api/cron/post-trip  — daily cron job (2 days after trip)
 *   2. adminUpdateBookingStatus — when admin manually marks COMPLETED
 *   3. bulkCompleteBookings     — when bulk-completing past trips
 *
 * The function is idempotent-safe: callers should wrap in `.catch()` so
 * email failures never break the main data flow.
 */

import { prisma } from "@/lib/prisma";
import { NotificationEvent, NotificationChannel } from "@prisma/client";
import {
  ADDRESS_JA,
  ADDRESS_EN,
  BUSINESS_NAME_JA,
  BUSINESS_NAME_EN,
} from "@/lib/constants/business";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PostTripEmailOpts {
  locale: "en" | "ja";
  leadName: string;
  reference: string;
  activityNameEn: string;
  activityNameJa: string;
  date: string;          // YYYY-MM-DD
  promoCode: string;
  googleReviewUrl: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PROMO_CODE = "VIPRETURN15";
const GOOGLE_REVIEW_URL =
  process.env.GOOGLE_REVIEW_URL ??
  "https://g.page/r/Cc_9cCoQEpR9EBM/review";

// ─── Email HTML Builder ────────────────────────────────────────────────────────

function buildPostTripHtml(opts: PostTripEmailOpts): { subject: string; html: string } {
  const isJa = opts.locale === "ja";
  const activityName = isJa ? opts.activityNameJa : opts.activityNameEn;

  const brandColor      = "#0d9488";
  const brandColorDark  = "#0f766e";
  const brandColorLight = "#ccfbf1";
  const textDark        = "#1c1917";
  const textMid         = "#44403c";
  const textLight       = "#78716c";

  if (isJa) {
    return {
      subject: `ありがとうございました！${opts.reference} — 次回のご予約に使える特別割引`,
      html: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ご参加ありがとうございました — Dream Adventure</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${brandColorDark} 0%,${brandColor} 60%,#14b8a6 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.75);">${BUSINESS_NAME_JA}</p>
              <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">ご参加ありがとうございました！🎉</h1>
              <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.9);line-height:1.6;">${opts.leadName} 様、素晴らしいアドベンチャーを共に過ごせた喜びを、チーム一同心よりお伝えいたします。</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;">

              <!-- Trip Summary -->
              <div style="background:${brandColorLight};border-radius:12px;padding:20px 24px;margin-bottom:32px;">
                <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${brandColor};">ご参加内容</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:${textMid};width:120px;font-weight:600;">予約番号</td>
                    <td style="padding:4px 0;font-size:14px;color:${textDark};font-weight:700;">${opts.reference}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:${textMid};font-weight:600;">アクティビティ</td>
                    <td style="padding:4px 0;font-size:14px;color:${textDark};">${activityName}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:${textMid};font-weight:600;">ご参加日</td>
                    <td style="padding:4px 0;font-size:14px;color:${textDark};">${opts.date}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size:16px;color:${textDark};line-height:1.8;margin:0 0 16px 0;">群馬の豊かな自然の中で、最高の思い出を一緒に作れたことを誇りに思います。<br>ご参加いただいた皆様の笑顔が、私たちの一番の活力です。</p>
              <p style="font-size:15px;color:${textMid};line-height:1.8;margin:0 0 32px 0;">また、安全にご参加いただけたことを、チーム全員で喜んでおります。引き続き、群馬でのアドベンチャーをどうぞよろしくお願いいたします！</p>

              <!-- Google Review CTA -->
              <div style="background:#f5f5f4;border-radius:14px;padding:28px;margin-bottom:32px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${textLight};">お願い</p>
                <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:${textDark};">Googleでの口コミをお願いします ⭐</h2>
                <p style="margin:0 0 20px 0;font-size:14px;color:${textMid};line-height:1.7;">皆様の率直なご感想が、次の冒険者の背中を押してくれます。<br>ほんの1分で書けるレビューが、私たちにとって大きな励みになります！</p>
                <a href="${opts.googleReviewUrl}" target="_blank" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">⭐ Googleでレビューを書く</a>
              </div>

              <!-- VIP Discount -->
              <div style="border:2px dashed ${brandColor};border-radius:14px;padding:28px;margin-bottom:32px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${brandColor};">リピーター限定特典</p>
                <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:800;color:${textDark};">次回15%OFF 🎁</h2>
                <p style="margin:0 0 16px 0;font-size:14px;color:${textMid};line-height:1.6;">ご再訪の際は、以下のプロモコードを入力して15%割引をお受けください。<br>リピーター様への感謝の気持ちを込めて。</p>
                <div style="background:${brandColorLight};border-radius:10px;padding:16px 24px;display:inline-block;">
                  <p style="margin:0 0 4px 0;font-size:11px;color:${brandColorDark};font-weight:700;letter-spacing:1px;text-transform:uppercase;">プロモコード</p>
                  <p style="margin:0;font-size:28px;font-weight:900;color:${brandColorDark};letter-spacing:3px;">${opts.promoCode}</p>
                </div>
                <p style="margin:12px 0 0 0;font-size:12px;color:${textLight};">ご予約時の「プロモコード」欄にご入力ください。</p>
              </div>

              <div style="text-align:center;margin-bottom:8px;">
                <a href="https://thedreamadventure.com/booking" target="_blank" style="display:inline-block;background:linear-gradient(135deg,${brandColorDark},${brandColor});color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;">再び予約する →</a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#292524;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#a8a29e;">Dream Adventure</p>
              <p style="margin:0 0 12px 0;font-size:12px;color:#78716c;">${ADDRESS_JA}</p>
              <p style="margin:0;font-size:12px;color:#78716c;">
                <a href="mailto:contact@thedreamadventure.com" style="color:#14b8a6;text-decoration:none;">contact@thedreamadventure.com</a>
                &nbsp;|&nbsp;
                <a href="https://thedreamadventure.com" style="color:#14b8a6;text-decoration:none;">thedreamadventure.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    };
  }

  // ─── English ────────────────────────────────────────────────────────────────
  return {
    subject: `Thank You for the Adventure! ${opts.reference} — Your VIP Return Discount Inside`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thank You — Dream Adventure</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${brandColorDark} 0%,${brandColor} 60%,#14b8a6 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.75);">${BUSINESS_NAME_EN}</p>
              <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">What an Adventure! 🎉</h1>
              <p style="margin:0;font-size:16px;color:rgba(255,255,255,0.9);line-height:1.6;">Hi ${opts.leadName} — the whole Dream Adventure team is still buzzing from your session on the water. Thank you for joining us!</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;">

              <!-- Trip Summary -->
              <div style="background:${brandColorLight};border-radius:12px;padding:20px 24px;margin-bottom:32px;">
                <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${brandColor};">Your Adventure</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:${textMid};width:120px;font-weight:600;">Reference</td>
                    <td style="padding:4px 0;font-size:14px;color:${textDark};font-weight:700;">${opts.reference}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:${textMid};font-weight:600;">Activity</td>
                    <td style="padding:4px 0;font-size:14px;color:${textDark};">${activityName}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:14px;color:${textMid};font-weight:600;">Date</td>
                    <td style="padding:4px 0;font-size:14px;color:${textDark};">${opts.date}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size:16px;color:${textDark};line-height:1.8;margin:0 0 16px 0;">Whether you conquered the Tone River rapids or descended hidden canyons, we hope Gunma's incredible nature left you feeling alive and inspired.</p>
              <p style="font-size:15px;color:${textMid};line-height:1.8;margin:0 0 32px 0;">Our entire team works hard to deliver a safe, thrilling, and unforgettable experience. Knowing you chose us for your Japanese adventure means the world to us — truly.</p>

              <!-- Google Review CTA -->
              <div style="background:#f5f5f4;border-radius:14px;padding:28px;margin-bottom:32px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${textLight};">A Small Favour</p>
                <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:800;color:${textDark};">Leave Us a Google Review ⭐</h2>
                <p style="margin:0 0 20px 0;font-size:14px;color:${textMid};line-height:1.7;">Your honest review helps other adventurers discover us and inspires our team to keep raising the bar. It only takes 60 seconds — and we read every single one.</p>
                <a href="${opts.googleReviewUrl}" target="_blank" style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;letter-spacing:0.3px;">⭐ Leave a Google Review</a>
              </div>

              <!-- VIP Discount -->
              <div style="border:2px dashed ${brandColor};border-radius:14px;padding:28px;margin-bottom:32px;text-align:center;">
                <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${brandColor};">Return Adventurer Exclusive</p>
                <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:800;color:${textDark};">15% Off Your Next Trip 🎁</h2>
                <p style="margin:0 0 16px 0;font-size:14px;color:${textMid};line-height:1.6;">Because the best adventures are the ones you come back for. Use the code below at checkout and save 15% on any future booking — our gift to you as a returning adventurer.</p>
                <div style="background:${brandColorLight};border-radius:10px;padding:16px 24px;display:inline-block;">
                  <p style="margin:0 0 4px 0;font-size:11px;color:${brandColorDark};font-weight:700;letter-spacing:1px;text-transform:uppercase;">Promo Code</p>
                  <p style="margin:0;font-size:28px;font-weight:900;color:${brandColorDark};letter-spacing:3px;">${opts.promoCode}</p>
                </div>
                <p style="margin:12px 0 0 0;font-size:12px;color:${textLight};">Enter this code in the Promo Code field when you book online.</p>
              </div>

              <div style="text-align:center;margin-bottom:8px;">
                <a href="https://thedreamadventure.com/en/booking" target="_blank" style="display:inline-block;background:linear-gradient(135deg,${brandColorDark},${brandColor});color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;">Book Your Next Adventure →</a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#292524;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#a8a29e;">Dream Adventure</p>
              <p style="margin:0 0 12px 0;font-size:12px;color:#78716c;">${ADDRESS_EN}</p>
              <p style="margin:0;font-size:12px;color:#78716c;">
                <a href="mailto:contact@thedreamadventure.com" style="color:#14b8a6;text-decoration:none;">contact@thedreamadventure.com</a>
                &nbsp;|&nbsp;
                <a href="https://thedreamadventure.com" style="color:#14b8a6;text-decoration:none;">thedreamadventure.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

// ─── Resend Sender ─────────────────────────────────────────────────────────────

async function sendViaSend(
  to: string,
  subject: string,
  html: string,
  bookingId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = '"Dream Adventure" <booking@thedreamadventure.com>';

  if (!apiKey || apiKey === "re_placeholder") {
    console.log(`[PostTrip] Resend not configured — skipping ${to}`);
    await prisma.notificationLog.create({
      data: {
        bookingId,
        event: NotificationEvent.POST_TRIP_2D,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        subject,
        status: "skipped",
      },
    }).catch(() => {});
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to, subject, html });

    await prisma.notificationLog.create({
      data: {
        bookingId,
        event: NotificationEvent.POST_TRIP_2D,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        subject,
        status: "sent",
      },
    }).catch(() => {});
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[PostTrip] Email failed for ${to}:`, errMsg);
    await prisma.notificationLog.create({
      data: {
        bookingId,
        event: NotificationEvent.POST_TRIP_2D,
        channel: NotificationChannel.EMAIL,
        recipient: to,
        status: "failed",
        errorMsg: errMsg,
      },
    }).catch(() => {});
    throw err; // Re-throw so caller knows it failed
  }
}

// ─── VIP promo upsert ──────────────────────────────────────────────────────────

async function ensureVipPromo(): Promise<void> {
  await prisma.promotion.upsert({
    where: { code: PROMO_CODE },
    update: {},
    create: {
      code: PROMO_CODE,
      type: "PERCENT",
      category: "REFERRAL",
      value: 15,
      isActive: true,
      descriptionEn: "15% return adventurer discount",
      descriptionJa: "15%リピーター割引",
    },
  });
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches a booking from the database, builds the post-trip "Thank You +
 * VIP Discount" email, and fires it via Resend.
 *
 * Safe to call from any context that transitions a booking to COMPLETED.
 * Internally ensures the VIP promo code exists in the DB first.
 *
 * Throws on unrecoverable send error; callers should `.catch()` to keep
 * the main data flow unaffected.
 */
export async function sendPostTripEmailForBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      product: { select: { nameEn: true, nameJa: true } },
      slot:    { select: { date: true } },
    },
  });

  if (!booking) {
    console.warn(`[PostTrip] Booking not found: ${bookingId}`);
    return;
  }

  // Ensure promo exists
  await ensureVipPromo();

  const locale      = (booking.locale as "en" | "ja") ?? "en";
  const slotDateStr = booking.slot?.date.toISOString().slice(0, 10)
    ?? new Date().toISOString().slice(0, 10);

  const activityNameEn = booking.isCombo
    ? "Rafting + Canyoning Combo"
    : booking.product.nameEn;
  const activityNameJa = booking.isCombo
    ? "ラフティング＋キャニオニング コンボ"
    : booking.product.nameJa;

  const { subject, html } = buildPostTripHtml({
    locale,
    leadName: booking.leadName,
    reference: booking.reference,
    activityNameEn,
    activityNameJa,
    date: slotDateStr,
    promoCode: PROMO_CODE,
    googleReviewUrl: GOOGLE_REVIEW_URL,
  });

  await sendViaSend(booking.leadEmail, subject, html, booking.id);
}
