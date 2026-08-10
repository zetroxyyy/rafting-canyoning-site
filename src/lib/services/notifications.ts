/**
 * Notifications service — email (Resend), LINE, WhatsApp.
 * All sends are fire-and-forget; failures are logged but don't break main flow.
 *
 * Email Design Standard — matches the premium postTrip.ts aesthetic:
 *   • Full-bleed gradient teal header (135deg, #0f766e → #0d9488 → #14b8a6)
 *   • Brand eyebrow label + H1 in white on gradient
 *   • White body card with 40px padding
 *   • Teal-tinted (#ccfbf1) summary tables
 *   • Section labels: 11px / 700 / 2px letter-spacing / uppercase / teal
 *   • Stone-950 (#292524) footer with teal links
 *   • Consistent font stack: 'Helvetica Neue', Helvetica, Arial, sans-serif
 */
import { prisma } from "@/lib/prisma";
import {
  ADDRESS_JA,
  ADDRESS_EN,
  BUSINESS_NAME_JA,
  BUSINESS_NAME_EN,
  MAP_SHORT_LINK,
  TRANSIT_DESC_JA,
  TRANSIT_DESC_EN,
} from "@/lib/constants/business";

// ─── Brand Tokens ──────────────────────────────────────────────────────────────

const B = {
  brandColor: "#0d9488",
  brandDark: "#0f766e",
  brandLight: "#14b8a6",
  brandBg: "#ccfbf1",
  textDark: "#1c1917",
  textMid: "#44403c",
  textLight: "#78716c",
  warnBg: "#fef9c3",
  warnBorder: "#fde68a",
  warnText: "#92400e",
  redColor: "#ef4444",
  amberColor: "#d97706",
  outerBg: "#f5f5f4",
  footerBg: "#292524",
  footerMuted: "#78716c",
  footerLabel: "#a8a29e",
};

// ─── Shared Layout Builder ─────────────────────────────────────────────────────
//
// Renders the premium email chrome: outer bg → gradient header → white body → stone footer.
// `accentColor` controls the header gradient and accents (defaults to teal).

interface LayoutOpts {
  lang: string;
  title: string;
  eyebrow: string;          // small ALL-CAPS brand label above h1
  heading: string;          // h1 text (can include emoji)
  subheading: string;       // paragraph under h1 in header
  bodyHtml: string;         // full inner body HTML (tables, CTAs, paragraphs)
  footerAddress: string;    // address line for footer
  headerGradient?: string;  // optional override
}

function premiumLayout(o: LayoutOpts): string {
  const gradient = o.headerGradient
    ?? `linear-gradient(135deg,${B.brandDark} 0%,${B.brandColor} 60%,${B.brandLight} 100%)`;

  return `<!DOCTYPE html>
<html lang="${o.lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${o.title}</title>
</head>
<body style="margin:0;padding:0;background-color:${B.outerBg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${B.outerBg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- ── Header ─────────────────────────────────────────────── -->
          <tr>
            <td style="background:${gradient};border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.75);">${o.eyebrow}</p>
              <h1 style="margin:0 0 12px 0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.25;">${o.heading}</h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.9);line-height:1.65;">${o.subheading}</p>
            </td>
          </tr>

          <!-- ── Body ──────────────────────────────────────────────── -->
          <tr>
            <td style="background:#ffffff;padding:40px;">
              ${o.bodyHtml}
            </td>
          </tr>

          <!-- ── Footer ────────────────────────────────────────────── -->
          <tr>
            <td style="background:${B.footerBg};border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:${B.footerLabel};">Dream Adventure</p>
              <p style="margin:0 0 12px 0;font-size:12px;color:${B.footerMuted};">${o.footerAddress}</p>
              <p style="margin:0;font-size:12px;color:${B.footerMuted};">
                <a href="mailto:contact@thedreamadventure.com" style="color:${B.brandLight};text-decoration:none;">contact@thedreamadventure.com</a>
                &nbsp;|&nbsp;
                <a href="https://thedreamadventure.com" style="color:${B.brandLight};text-decoration:none;">thedreamadventure.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared HTML Fragments ─────────────────────────────────────────────────────

/** Teal-tinted summary table used across multiple templates. */
function summaryTable(rows: Array<{ label: string; value: string; valueStyle?: string }>): string {
  const rowHtml = rows.map((r, i) => {
    const isLast = i === rows.length - 1;
    const borderBottom = isLast ? "" : `border-bottom:1px solid rgba(0,0,0,0.07);`;
    const valueStyle = r.valueStyle ?? `font-size:14px;color:${B.textDark};`;
    return `<tr>
      <td style="padding:10px 0;${borderBottom}font-size:14px;color:${B.textMid};width:140px;font-weight:600;">${r.label}</td>
      <td style="padding:10px 0;${borderBottom}${valueStyle}">${r.value}</td>
    </tr>`;
  }).join("\n");

  return `<div style="background:${B.brandBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    ${rowHtml}
  </table>
</div>`;
}

/** Full-width CTA button matching postTrip style. */
function ctaButton(href: string, label: string, gradient?: string): string {
  const bg = gradient ?? `linear-gradient(135deg,${B.brandDark},${B.brandColor})`;
  return `<div style="text-align:center;margin-bottom:8px;">
  <a href="${href}" target="_blank" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;">${label}</a>
</div>`;
}

/** Section label — small ALL-CAPS uppercase label. */
function sectionLabel(text: string, color = B.brandColor): string {
  return `<p style="margin:0 0 12px 0;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${color};">${text}</p>`;
}

/** Payment notice (yellow amber) matching postTrip style. */
function paymentNotice(isJa: boolean): string {
  if (isJa) {
    return `<div style="background:${B.warnBg};border:1px solid ${B.warnBorder};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
  <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:${B.warnText};">⚠️ お支払いに関する重要なお知らせ</p>
  <p style="margin:0;font-size:13px;color:#a16207;line-height:1.7;">当ツアーではオンライン事前決済は行っておりません。料金はツアー当日の受付にて<strong>「現金またはカード（現地払い）」</strong>、もしくは事前のご希望がある場合は<strong>「銀行振込」</strong>にてお願いいたします。</p>
</div>`;
  }
  return `<div style="background:${B.warnBg};border:1px solid ${B.warnBorder};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
  <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:${B.warnText};">⚠️ Important Payment Information</p>
  <p style="margin:0;font-size:13px;color:#a16207;line-height:1.7;">We do not process payments online. The total fee is collected at our base on the day of your trip via <strong>"Cash or Card on Arrival"</strong>, or beforehand through a manual <strong>"Bank Transfer"</strong> if preferred.</p>
</div>`;
}

/** Gear checklist section. */
function gearChecklist(isJa: boolean): string {
  if (isJa) {
    return `<div style="margin-bottom:28px;">
  ${sectionLabel("持ち物")}
  <ul style="margin:0;padding:0 0 0 20px;line-height:1.9;font-size:14px;color:${B.textMid};">
    <li><strong>水着</strong>（ウェットスーツの下に着ます）</li>
    <li><strong>タオル</strong>・着替え用の衣類</li>
    <li>濡れても良いスニーカーまたはマリンシューズ（ベースにてレンタル有）</li>
    <li>ウェットスーツ・ヘルメット・ライフジャケットはすべて<strong>無料提供</strong></li>
    <li>出発予定時刻の <strong>20分前</strong>までにお越しください</li>
  </ul>
</div>`;
  }
  return `<div style="margin-bottom:28px;">
  ${sectionLabel("What to Bring")}
  <ul style="margin:0;padding:0 0 0 20px;line-height:1.9;font-size:14px;color:${B.textMid};">
    <li><strong>Swimwear</strong> (to wear under the wetsuit)</li>
    <li><strong>Towel</strong> and a change of clothes</li>
    <li>Wading shoes or old sneakers that can get wet (rental footwear available at base)</li>
    <li>Wetsuit, helmet &amp; life jacket are all <strong>provided free</strong></li>
    <li>Please arrive at least <strong>20 minutes early</strong></li>
  </ul>
</div>`;
}

/** Access directions section. */
function accessDirections(isJa: boolean): string {
  if (isJa) {
    return `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
  ${sectionLabel("アクセス情報")}
  <p style="margin:0 0 8px 0;font-size:14px;color:${B.textDark};font-weight:600;"><a href="${MAP_SHORT_LINK}" target="_blank" style="color:${B.brandColor};text-decoration:underline;">${ADDRESS_JA} (Dream Adventure ベース)</a></p>
  <ul style="margin:4px 0 0 0;padding:0 0 0 20px;font-size:13px;color:${B.textMid};line-height:1.8;">
    <li>${TRANSIT_DESC_JA}</li>
    <li>関越自動車道でのアクセスも便利です（無料駐車場あり）</li>
  </ul>
</div>`;
  }
  return `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
  ${sectionLabel("Getting Here")}
  <p style="margin:0 0 8px 0;font-size:14px;color:${B.textDark};font-weight:600;"><a href="${MAP_SHORT_LINK}" target="_blank" style="color:${B.brandColor};text-decoration:underline;">${ADDRESS_EN} (Dream Adventure Base)</a></p>
  <ul style="margin:4px 0 0 0;padding:0 0 0 20px;font-size:13px;color:${B.textMid};line-height:1.8;">
    <li>${TRANSIT_DESC_EN}</li>
    <li>Kan-Etsu Expressway is also convenient (free parking at base)</li>
  </ul>
</div>`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BookingNotificationData {
  bookingId?: string;
  to: string;
  locale: "en" | "ja";
  reference: string;
  leadName: string;
  activityName: string;
  date: string;
  startTime: string;
  adultCount: number;
  childCount: number;
  totalJpy: number;
  hasBbq: boolean;
  slotDate?: Date;
  appUrl?: string;
  isCombo?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getDisplayStartTime(startTime: string, isCombo?: boolean, locale: "en" | "ja" = "en"): string {
  if (isCombo) {
    return locale === "ja" ? "時間未定 - お電話にて調整" : "Flexible - To be confirmed via phone";
  }
  return startTime;
}

function paxLine(adultCount: number, childCount: number, isJa: boolean): string {
  if (isJa) {
    const parts = [`大人 ${adultCount}名`];
    if (childCount > 0) parts.push(`子ども ${childCount}名`);
    return parts.join(" / ");
  }
  const parts = [`${adultCount} Adult${adultCount !== 1 ? "s" : ""}`];
  if (childCount > 0) parts.push(`${childCount} Child${childCount !== 1 ? "ren" : ""}`);
  return parts.join(" / ");
}

function getEmailPortalUrl(appUrl: string, locale: "en" | "ja", reference: string, email: string): string {
  const path = locale === "ja" ? `/manage/${reference}` : `/en/manage/${reference}`;
  return `${appUrl}${path}?email=${encodeURIComponent(email)}`;
}

// ─── Template 1: Booking Request Received ─────────────────────────────────────

function bookingRequestReceivedHtml(d: BookingNotificationData): string {
  const isJa = d.locale === "ja";
  const appUrl = d.appUrl ?? "https://thedreamadventure.com";
  const portalUrl = getEmailPortalUrl(appUrl, d.locale, d.reference, d.to);
  const displayTime = getDisplayStartTime(d.startTime, d.isCombo, d.locale);

  const tableRows = [
    { label: isJa ? "予約番号" : "Reference", value: `<strong style="color:${B.brandColor};font-size:15px;">${d.reference}</strong>` },
    { label: isJa ? "アクティビティ" : "Activity", value: d.activityName },
    { label: isJa ? "希望日程" : "Requested Date", value: d.date },
    { label: isJa ? "希望出発時間" : "Departure", value: displayTime },
    { label: isJa ? "参加人数" : "Participants", value: paxLine(d.adultCount, d.childCount, isJa) },
    ...(d.hasBbq ? [{ label: isJa ? "BBQオプション" : "BBQ Add-on", value: `<span style="color:${B.amberColor};font-weight:600;">${isJa ? "希望する (現地決済)" : "Requested (Pay on Arrival)"}</span>` }] : []),
    { label: isJa ? "合計概算" : "Est. Total", value: `<strong style="font-size:16px;">¥${d.totalJpy.toLocaleString("ja-JP")}</strong>` },
  ];

  const bodyHtml = isJa
    ? `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>${d.leadName} 様</strong>、このたびは Dream Adventure をご予約いただき誠にありがとうございます。</p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">ご予約リクエストを正常に受け付けました。<strong>担当スタッフより空き状況と決済方法についてご連絡いたします。</strong>今しばらくお待ちください。</p>
${summaryTable(tableRows)}
${accessDirections(isJa)}
<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">ご同行者様の安全同意書（デジタル免責同意）のご入力や、ご予約詳細の確認は下記ポータルからお進みください。</p>
${ctaButton(portalUrl, "予約を管理する →")}`
    : `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>Dear ${d.leadName},</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">Thank you for choosing Dream Adventure! Your reservation request has been received. <strong>Our team will contact you shortly to confirm availability and payment details.</strong></p>
${summaryTable(tableRows)}
${accessDirections(isJa)}
<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">To fill out participant digital waivers or view your booking details, please visit your secure guest portal below.</p>
${ctaButton(portalUrl, "Manage Your Booking →")}`;

  return premiumLayout({
    lang: isJa ? "ja" : "en",
    title: isJa ? `ご予約リクエストを受領いたしました — ${d.reference}` : `Reservation Request Received — ${d.reference}`,
    eyebrow: isJa ? BUSINESS_NAME_JA : BUSINESS_NAME_EN,
    heading: isJa ? "リクエストを受け付けました 📋" : "Request Received! 📋",
    subheading: isJa
      ? `${d.leadName} 様のご予約リクエストをお受けしました。スタッフより折り返しご連絡いたします。`
      : `Hi ${d.leadName} — we've received your reservation request and our team will be in touch soon.`,
    bodyHtml,
    footerAddress: isJa ? ADDRESS_JA : ADDRESS_EN,
  });
}

// ─── Template 2: Booking Confirmed ────────────────────────────────────────────

function bookingConfirmationHtml(d: BookingNotificationData): string {
  const isJa = d.locale === "ja";
  const appUrl = d.appUrl ?? "https://thedreamadventure.com";
  const portalUrl = getEmailPortalUrl(appUrl, d.locale, d.reference, d.to);
  const displayTime = getDisplayStartTime(d.startTime, d.isCombo, d.locale);

  const tableRows = [
    { label: isJa ? "予約番号" : "Reference", value: `<strong style="color:${B.brandColor};font-size:15px;">${d.reference}</strong>` },
    { label: isJa ? "アクティビティ" : "Activity", value: d.activityName },
    { label: isJa ? "予約日" : "Date", value: d.date },
    { label: isJa ? "出発時間" : "Departure", value: `<strong>${displayTime}</strong>` },
    { label: isJa ? "参加人数" : "Participants", value: paxLine(d.adultCount, d.childCount, isJa) },
    ...(d.hasBbq ? [{ label: isJa ? "BBQオプション" : "BBQ Add-on", value: `<span style="color:${B.amberColor};font-weight:600;">${isJa ? "申し込む (現地決済)" : "Requested (Pay on Arrival)"}</span>` }] : []),
    { label: isJa ? "合計金額" : "Total", value: `<strong style="font-size:17px;">¥${d.totalJpy.toLocaleString("ja-JP")}</strong>` },
  ];

  const bodyHtml = isJa
    ? `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>${d.leadName} 様</strong>、ご予約が確定いたしました！当日のご参加を心よりお待ちしております。</p>
${summaryTable(tableRows)}
${paymentNotice(isJa)}
${gearChecklist(isJa)}
${accessDirections(isJa)}
<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">ご予約詳細の確認、同行者様情報の入力、ご変更のご要望は下記ポータルからいつでもご対応いただけます。</p>
${ctaButton(portalUrl, "予約を管理する →")}`
    : `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>Dear ${d.leadName},</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">Your booking with Dream Adventure is <strong>confirmed!</strong> We're thrilled to have you joining us on the water. Here's everything you need to know before the big day.</p>
${summaryTable(tableRows)}
${paymentNotice(isJa)}
${gearChecklist(isJa)}
${accessDirections(isJa)}
<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">Fill out participant waivers, check your booking details, or make changes anytime via your secure guest portal.</p>
${ctaButton(portalUrl, "Manage Your Booking →")}`;

  return premiumLayout({
    lang: isJa ? "ja" : "en",
    title: isJa ? `ご予約確定 — ${d.reference}` : `Booking Confirmed — ${d.reference}`,
    eyebrow: isJa ? BUSINESS_NAME_JA : BUSINESS_NAME_EN,
    heading: isJa ? "ご予約が確定しました ✅" : "You're Booked! ✅",
    subheading: isJa
      ? `${d.leadName} 様のご予約（${d.reference}）が正式に確定いたしました。当日ガイドチーム一同お待ちしております！`
      : `Hi ${d.leadName} — your booking (${d.reference}) is officially confirmed. Our guide crew can't wait to see you!`,
    bodyHtml,
    footerAddress: isJa ? ADDRESS_JA : ADDRESS_EN,
  });
}

// ─── Template 3: 24-Hour Reminder ────────────────────────────────────────────

function reminder24hHtml(d: BookingNotificationData): string {
  const isJa = d.locale === "ja";
  const appUrl = d.appUrl ?? "https://thedreamadventure.com";
  const portalUrl = getEmailPortalUrl(appUrl, d.locale, d.reference, d.to);
  const displayTime = getDisplayStartTime(d.startTime, d.isCombo, d.locale);

  const tableRows = [
    { label: isJa ? "予約番号" : "Reference", value: `<strong style="color:${B.brandColor};">${d.reference}</strong>` },
    { label: isJa ? "アクティビティ" : "Activity", value: d.activityName },
    { label: isJa ? "日付" : "Date", value: `<strong>${isJa ? `明日 (${d.date})` : `Tomorrow — ${d.date}`}</strong>` },
    { label: isJa ? "集合・出発" : "Departure", value: `<strong>${displayTime}${isJa ? "（20分前集合）" : " (arrive 20 min early)"}</strong>` },
    { label: isJa ? "参加人数" : "Participants", value: paxLine(d.adultCount, d.childCount, isJa) },
  ];

  const paymentReminderHtml = isJa
    ? `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("お支払いについて", B.textLight)}
    <p style="margin:0;font-size:14px;color:${B.textMid};line-height:1.8;">当日受付にて<strong>「現金」</strong>または<strong>「カード・電子マネー」</strong>でお支払いいただけます。</p>
  </div>`
    : `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("Payment Reminder", B.textLight)}
    <p style="margin:0;font-size:14px;color:${B.textMid};line-height:1.8;">If not yet settled, payment can be made at our base check-in counter via <strong>Cash or Card</strong>.</p>
  </div>`;

  const weatherNoteHtml = isJa
    ? `<p style="font-size:13px;color:${B.textLight};line-height:1.8;margin:0 0 28px 0;font-style:italic;">※ツアーは原則雨天決行ですが、台風やダム放流など安全確保が不可能な場合は中止の判断を行う場合があります。中止が決定した際はメールまたはお電話にてお知らせいたします。</p>`
    : `<p style="font-size:13px;color:${B.textLight};line-height:1.8;margin:0 0 28px 0;font-style:italic;">* Tours run rain or shine. In case of extreme weather or hazardous conditions, we may cancel for safety. We will notify you immediately via email or phone.</p>`;

  const waiverNoteHtml = isJa
    ? `<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">デジタル安全同意書のご入力がお済みでない方は、ツアー開始前に下記ポータルよりご登録をお願いいたします。</p>`
    : `<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">If you haven't yet completed the digital participant waivers, please do so before arriving at the base using the portal below.</p>`;

  const bodyHtml = isJa
    ? `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>${d.leadName} 様</strong>、いよいよ明日はツアー当日です！最終スケジュールをご確認ください。</p>
${summaryTable(tableRows)}
${paymentReminderHtml}
${gearChecklist(isJa)}
${accessDirections(isJa)}
${weatherNoteHtml}
${waiverNoteHtml}
${ctaButton(portalUrl, "予約を管理する →")}`
    : `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>Dear ${d.leadName},</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">Your Dream Adventure trip is <strong>tomorrow!</strong> Our guide crew is pumped and ready to show you an incredible time. Here's your final briefing.</p>
${summaryTable(tableRows)}
${paymentReminderHtml}
${gearChecklist(isJa)}
${accessDirections(isJa)}
${weatherNoteHtml}
${waiverNoteHtml}
${ctaButton(portalUrl, "Manage Your Booking →")}`;

  return premiumLayout({
    lang: isJa ? "ja" : "en",
    title: isJa ? `明日のご予約リマインダー — ${d.reference}` : `See You Tomorrow — ${d.reference}`,
    eyebrow: isJa ? BUSINESS_NAME_JA : BUSINESS_NAME_EN,
    heading: isJa ? "明日お会いしましょう！🌊" : "See You Tomorrow! 🌊",
    subheading: isJa
      ? `${d.leadName} 様、ガイドチーム一同、明日のご参加を楽しみにお待ちしております。`
      : `Hi ${d.leadName} — the whole Dream Adventure team is ready for tomorrow. Here's your final briefing!`,
    bodyHtml,
    footerAddress: isJa ? ADDRESS_JA : ADDRESS_EN,
  });
}

// ─── Template 4: Booking Cancelled ────────────────────────────────────────────

function bookingCancelledHtml(d: BookingNotificationData, cancelledBy: string): string {
  const isJa = d.locale === "ja";
  const appUrl = d.appUrl ?? "https://thedreamadventure.com";
  const portalUrl = getEmailPortalUrl(appUrl, d.locale, d.reference, d.to);

  const tableRows = [
    { label: isJa ? "予約番号" : "Reference", value: `<strong style="color:${B.redColor};font-size:15px;">${d.reference}</strong>` },
    { label: isJa ? "アクティビティ" : "Activity", value: d.activityName },
    { label: isJa ? "予約日" : "Date", value: d.date },
    { label: isJa ? "状況" : "Status", value: `<strong style="color:${B.redColor};">${isJa ? "キャンセル済み" : "CANCELLED"}</strong>` },
  ];

  // Use a muted red gradient for the header to signal cancellation
  const cancelGradient = `linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#b91c1c 100%)`;

  const refundNoteHtml = isJa
    ? `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("返金について", B.textLight)}
    <p style="margin:0;font-size:14px;color:${B.textMid};line-height:1.8;">事前に銀行振込等でお支払いいただいている場合は、担当コンシェルジュより別途ご連絡のうえ返金処理いたします。現地払い（現金・カード）を選択されていた場合は、ご請求はございません。</p>
  </div>`
    : `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("Refund Information", B.textLight)}
    <p style="margin:0;font-size:14px;color:${B.textMid};line-height:1.8;">If you prepaid via bank transfer, our concierge team will contact you directly to arrange your refund. For pay-on-arrival bookings, no charges were processed and no action is required.</p>
  </div>`;

  const bodyHtml = isJa
    ? `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>${d.leadName} 様</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">ご予約（予約番号：<strong>${d.reference}</strong>）のキャンセル手続きが完了いたしました。</p>
${summaryTable(tableRows)}
${refundNoteHtml}
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">またのご利用をスタッフ一同心よりお待ちしております。群馬の大自然で次の冒険をご一緒できることを楽しみにしています。</p>
${ctaButton(portalUrl, "予約詳細を確認する →", `linear-gradient(135deg,#44403c,#57534e)`)}`
    : `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>Dear ${d.leadName},</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">We're writing to confirm that your reservation (<strong>${d.reference}</strong>) has been successfully cancelled.</p>
${summaryTable(tableRows)}
${refundNoteHtml}
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">We hope to welcome you back for another adventure in Gunma's incredible nature. The river will always be here when you're ready!</p>
${ctaButton(portalUrl, "View Booking Details →", `linear-gradient(135deg,#44403c,#57534e)`)}`;

  void cancelledBy; // used in admin alert, not displayed in email

  return premiumLayout({
    lang: isJa ? "ja" : "en",
    title: isJa ? `ご予約キャンセル完了 — ${d.reference}` : `Booking Cancelled — ${d.reference}`,
    eyebrow: isJa ? BUSINESS_NAME_JA : BUSINESS_NAME_EN,
    heading: isJa ? "キャンセルが完了しました" : "Booking Cancelled",
    subheading: isJa
      ? `${d.leadName} 様のご予約（${d.reference}）のキャンセル手続きが完了いたしました。`
      : `Hi ${d.leadName} — your booking (${d.reference}) has been cancelled. We're sorry to see you go.`,
    bodyHtml,
    footerAddress: isJa ? ADDRESS_JA : ADDRESS_EN,
    headerGradient: cancelGradient,
  });
}

// ─── Template 5: Refund Issued ────────────────────────────────────────────────

function refundIssuedHtml(d: BookingNotificationData, refundAmountJpy: number): string {
  const isJa = d.locale === "ja";
  const appUrl = d.appUrl ?? "https://thedreamadventure.com";
  const portalUrl = getEmailPortalUrl(appUrl, d.locale, d.reference, d.to);

  const tableRows = [
    { label: isJa ? "予約番号" : "Reference", value: `<strong style="color:${B.brandColor};">${d.reference}</strong>` },
    { label: isJa ? "アクティビティ" : "Activity", value: d.activityName },
    { label: isJa ? "予約日" : "Date", value: d.date },
    {
      label: isJa ? "ご返金額" : "Amount Refunded",
      value: `<strong style="font-size:22px;color:${B.brandColor};">¥${refundAmountJpy.toLocaleString("ja-JP")}</strong>`,
    },
  ];

  const processingNoteHtml = isJa
    ? `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("返金処理について", B.textLight)}
    <p style="margin:0;font-size:14px;color:${B.textMid};line-height:1.8;">返金は銀行振込にてお手続きいたします。銀行の処理状況によっては、口座への反映に<strong>2〜3営業日</strong>かかる場合がございます。ご不明な点はお気軽にお問い合わせください。</p>
  </div>`
    : `<div style="background:${B.outerBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("Processing Timeline", B.textLight)}
    <p style="margin:0;font-size:14px;color:${B.textMid};line-height:1.8;">Refunds are issued via bank transfer. Depending on banking clearing timeframes, it may take <strong>2–3 business days</strong> to appear in your account. Please contact us if you have any questions.</p>
  </div>`;

  // Green-tinted gradient to signal "money back"
  const refundGradient = `linear-gradient(135deg,#065f46 0%,#047857 50%,#059669 100%)`;

  const bodyHtml = isJa
    ? `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>${d.leadName} 様</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">ご予約（予約番号：<strong>${d.reference}</strong>）に対して、返金処理が完了いたしましたのでお知らせいたします。</p>
${summaryTable(tableRows)}
${processingNoteHtml}
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">ご不便をおかけしたことを深くお詫び申し上げます。またのご利用を心よりお待ちしております。</p>
${ctaButton(portalUrl, "予約詳細を確認する →", `linear-gradient(135deg,#065f46,#047857)`)}`
    : `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>Dear ${d.leadName},</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">We're writing to confirm that your refund for booking <strong>${d.reference}</strong> has been processed.</p>
${summaryTable(tableRows)}
${processingNoteHtml}
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">We're sorry we couldn't host you this time, and we hope to welcome you back to Gunma's rivers in the future.</p>
${ctaButton(portalUrl, "View Booking Details →", `linear-gradient(135deg,#065f46,#047857)`)}`;

  return premiumLayout({
    lang: isJa ? "ja" : "en",
    title: isJa ? `ご返金処理完了 — ${d.reference}` : `Refund Issued — ${d.reference}`,
    eyebrow: isJa ? BUSINESS_NAME_JA : BUSINESS_NAME_EN,
    heading: isJa ? "返金処理が完了しました 💸" : "Refund Processed 💸",
    subheading: isJa
      ? `${d.leadName} 様への返金（¥${refundAmountJpy.toLocaleString("ja-JP")}）の処理が完了いたしました。`
      : `Hi ${d.leadName} — your refund of ¥${refundAmountJpy.toLocaleString()} has been processed.`,
    bodyHtml,
    footerAddress: isJa ? ADDRESS_JA : ADDRESS_EN,
    headerGradient: refundGradient,
  });
}

// ─── Template 6: Payment Failed ───────────────────────────────────────────────

function paymentFailedHtml(d: BookingNotificationData): string {
  const isJa = d.locale === "ja";
  const appUrl = d.appUrl ?? "https://thedreamadventure.com";
  const portalUrl = getEmailPortalUrl(appUrl, d.locale, d.reference, d.to);

  // Amber gradient to signal "needs attention" (not catastrophic like red)
  const amberGradient = `linear-gradient(135deg,#78350f 0%,#92400e 50%,#b45309 100%)`;

  const optionsHtml = isJa
    ? `<div style="background:${B.brandBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("お支払い方法のご案内")}
    <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:${B.textMid};line-height:1.9;">
      <li><strong>現地払い（現金・カード）：</strong>ツアー当日の受付にてお支払い可能です。</li>
      <li><strong>銀行振込：</strong>事前ご送金をご希望の場合はお問い合わせください。</li>
      <li>キャンセル自動処理はございませんのでご安心ください。</li>
    </ul>
  </div>`
    : `<div style="background:${B.brandBg};border-radius:12px;padding:20px 24px;margin-bottom:28px;">
    ${sectionLabel("Payment Options")}
    <ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:${B.textMid};line-height:1.9;">
      <li><strong>Cash or Card on Arrival:</strong> Pay directly at our base on the day of your trip.</li>
      <li><strong>Bank Transfer:</strong> Contact us to arrange a manual bank transfer in advance.</li>
      <li>Your reservation remains intact — no automatic cancellation has occurred.</li>
    </ul>
  </div>`;

  const bodyHtml = isJa
    ? `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>${d.leadName} 様</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">ご予約（予約番号：<strong>${d.reference}</strong>）のオンライン決済処理が正常に完了しませんでした。<br>ご安心ください — ご予約スロットはそのまま保持されております。</p>
${optionsHtml}
<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">お支払い方法のご変更や銀行口座情報のご確認は、下記ポータルよりお進みください。</p>
${ctaButton(portalUrl, "予約を管理する →", `linear-gradient(135deg,${B.brandDark},${B.brandColor})`)}`
    : `<p style="font-size:16px;color:${B.textDark};line-height:1.8;margin:0 0 24px 0;"><strong>Dear ${d.leadName},</strong></p>
<p style="font-size:15px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">Your online payment for booking <strong>${d.reference}</strong> was not processed successfully. <br>Don't worry — your reservation slot remains intact and has <strong>not been cancelled.</strong></p>
${optionsHtml}
<p style="font-size:14px;color:${B.textMid};line-height:1.8;margin:0 0 28px 0;">To update payment details or view your booking, please visit your guest portal below.</p>
${ctaButton(portalUrl, "Manage Your Booking →", `linear-gradient(135deg,${B.brandDark},${B.brandColor})`)}`;

  return premiumLayout({
    lang: isJa ? "ja" : "en",
    title: isJa ? `お支払い処理エラー — ${d.reference}` : `Payment Issue — ${d.reference}`,
    eyebrow: isJa ? BUSINESS_NAME_JA : BUSINESS_NAME_EN,
    heading: isJa ? "お支払い処理エラー ⚠️" : "Payment Notice ⚠️",
    subheading: isJa
      ? `${d.leadName} 様、オンライン決済が完了しませんでした。ご予約は保持されておりますのでご安心ください。`
      : `Hi ${d.leadName} — your online payment didn't go through, but your booking is still safe.`,
    bodyHtml,
    footerAddress: isJa ? ADDRESS_JA : ADDRESS_EN,
    headerGradient: amberGradient,
  });
}

// ─── Email Sender ──────────────────────────────────────────────────────────────

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  bookingId?: string;
  event: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = '"Dream Adventure" <booking@thedreamadventure.com>';

  if (!apiKey || apiKey === "re_placeholder") {
    console.log(`[Email:${opts.event}] Resend not configured — skipping`, {
      to: opts.to,
    });
    await logNotification({
      bookingId: opts.bookingId,
      event: opts.event,
      channel: "EMAIL",
      recipient: opts.to,
      subject: opts.subject,
      status: "skipped",
    });
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    await logNotification({
      bookingId: opts.bookingId,
      event: opts.event,
      channel: "EMAIL",
      recipient: opts.to,
      subject: opts.subject,
      status: "sent",
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Email:${opts.event}] Failed:`, errMsg);
    await logNotification({
      bookingId: opts.bookingId,
      event: opts.event,
      channel: "EMAIL",
      recipient: opts.to,
      subject: opts.subject,
      status: "failed",
      errorMsg: errMsg,
    });
  }
}

// ─── LINE Sender ───────────────────────────────────────────────────────────────

async function sendLineMessage(message: string, bookingId?: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.LINE_ADMIN_USER_ID; // Admin's LINE user ID for alerts

  if (!token || !userId) {
    console.log("[LINE] Not configured — skipping");
    return;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text: message }],
      }),
    });

    if (!res.ok) throw new Error(`LINE API error: ${res.status}`);

    await logNotification({
      bookingId,
      event: "ADMIN_ALERT",
      channel: "LINE",
      recipient: userId,
      body: message,
      status: "sent",
    });
  } catch (err) {
    console.error("[LINE] Failed:", err);
  }
}

// ─── WhatsApp Sender ───────────────────────────────────────────────────────────

async function sendWhatsAppMessage(message: string, bookingId?: string): Promise<void> {
  const key = process.env.WHATSAPP_API_KEY;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const adminPhone = process.env.WHATSAPP_ADMIN_PHONE; // e.g. "81901234567"

  if (!key || !phoneId || !adminPhone) {
    console.log("[WhatsApp] Not configured — skipping");
    return;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: adminPhone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    if (!res.ok) throw new Error(`WhatsApp API error: ${res.status}`);

    await logNotification({
      bookingId,
      event: "ADMIN_ALERT",
      channel: "WHATSAPP",
      recipient: adminPhone,
      body: message,
      status: "sent",
    });
  } catch (err) {
    console.error("[WhatsApp] Failed:", err);
  }
}

// ─── Notification Logger ───────────────────────────────────────────────────────

async function logNotification(opts: {
  bookingId?: string;
  event: string;
  channel: string;
  recipient: string;
  subject?: string;
  body?: string;
  status: "sent" | "failed" | "skipped";
  errorMsg?: string;
}): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        bookingId: opts.bookingId,
        event: opts.event as never,
        channel: opts.channel as never,
        recipient: opts.recipient,
        subject: opts.subject,
        body: opts.body,
        status: opts.status,
        errorMsg: opts.errorMsg,
      },
    });
  } catch {
    // Never break main flow
  }
}

// ─── Admin Alert Helper ────────────────────────────────────────────────────────

async function sendAdminAlert(message: string, bookingId?: string): Promise<void> {
  await Promise.allSettled([
    sendLineMessage(message, bookingId),
    sendWhatsAppMessage(message, bookingId),
  ]);
}

// ─── Public Notification Functions ────────────────────────────────────────────

export async function notifyBookingConfirmed(
  data: BookingNotificationData
): Promise<void> {
  const isJa = data.locale === "ja";
  const subject = isJa
    ? `ご予約確定のお知らせ — ${data.reference}`
    : `Booking Confirmed — ${data.reference}`;

  // Email to guest
  await sendEmail({
    to: data.to,
    subject,
    html: bookingConfirmationHtml(data),
    bookingId: data.bookingId,
    event: "BOOKING_CONFIRMED",
  });

  // LINE + WhatsApp alert to admin
  const displayTime = getDisplayStartTime(data.startTime, data.isCombo, "en");
  const alertMsg = `✅ NEW BOOKING\n${data.reference}\n${data.leadName}\n${data.activityName} — ${data.date} ${displayTime}\nAdults: ${data.adultCount} | Children: ${data.childCount}\nTotal: ¥${data.totalJpy.toLocaleString()}`;
  await sendAdminAlert(alertMsg, data.bookingId);
}

export async function notifyPaymentFailed(
  data: BookingNotificationData
): Promise<void> {
  const isJa = data.locale === "ja";
  const subject = isJa
    ? `お支払い処理エラー — ${data.reference}`
    : `Payment Process Error — ${data.reference}`;

  const html = paymentFailedHtml(data);

  await sendEmail({
    to: data.to,
    subject,
    html,
    bookingId: data.bookingId,
    event: "PAYMENT_FAILED",
  });

  const alertMsg = `❌ PAYMENT FAILED\n${data.reference}\n${data.leadName} — ${data.to}`;
  await sendAdminAlert(alertMsg, data.bookingId);
}

export async function notifyBookingCancelled(
  data: BookingNotificationData,
  cancelledBy: string
): Promise<void> {
  const isJa = data.locale === "ja";
  const subject = isJa
    ? `ご予約キャンセル完了のお知らせ — ${data.reference}`
    : `Booking Cancelled — ${data.reference}`;

  const html = bookingCancelledHtml(data, cancelledBy);

  await sendEmail({
    to: data.to,
    subject,
    html,
    bookingId: data.bookingId,
    event: "BOOKING_CANCELLED",
  });

  const alertMsg = `🚫 BOOKING CANCELLED\n${data.reference}\n${data.leadName}\nCancelled by: ${cancelledBy}`;
  await sendAdminAlert(alertMsg, data.bookingId);
}

export async function notifyReminder24h(
  data: BookingNotificationData
): Promise<void> {
  const isJa = data.locale === "ja";
  const subject = isJa
    ? `明日のご予約リマインダー — ${data.reference}`
    : `See You Tomorrow — ${data.reference}`;

  await sendEmail({
    to: data.to,
    subject,
    html: reminder24hHtml(data),
    bookingId: data.bookingId,
    event: "REMINDER_24H",
  });
}

export async function notifyRefundIssued(
  data: BookingNotificationData,
  refundAmountJpy: number
): Promise<void> {
  const isJa = data.locale === "ja";
  const subject = isJa
    ? `ご返金処理完了のお知らせ — ${data.reference}`
    : `Refund Issued — ${data.reference}`;

  const html = refundIssuedHtml(data, refundAmountJpy);

  await sendEmail({
    to: data.to,
    subject,
    html,
    bookingId: data.bookingId,
    event: "REFUND_ISSUED",
  });
}

export async function notifyNewInquiry(
  name: string,
  email: string,
  message: string,
  submissionId: string
): Promise<void> {
  void submissionId;
  const alertMsg = `📩 NEW INQUIRY\nFrom: ${name} (${email})\nMessage: ${message.slice(0, 100)}${message.length > 100 ? "..." : ""}`;
  await sendAdminAlert(alertMsg);
}

export async function notifyBookingRequestReceived(
  data: BookingNotificationData
): Promise<void> {
  const isJa = data.locale === "ja";
  const subject = isJa
    ? `ご予約リクエストを受領いたしました — ${data.reference}`
    : `Reservation Request Received — ${data.reference}`;

  await sendEmail({
    to: data.to,
    subject,
    html: bookingRequestReceivedHtml(data),
    bookingId: data.bookingId,
    event: "BOOKING_REQUEST_RECEIVED",
  });

  const displayTime = getDisplayStartTime(data.startTime, data.isCombo, "en");
  const alertMsg = `📩 NEW RESERVATION REQUEST\n${data.reference}\n${data.leadName}\n${data.activityName} — ${data.date} ${displayTime}\nAdults: ${data.adultCount} | Children: ${data.childCount}\nTotal: ¥${data.totalJpy.toLocaleString()}`;
  await sendAdminAlert(alertMsg, data.bookingId);
}
