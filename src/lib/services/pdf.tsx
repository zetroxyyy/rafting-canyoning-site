/**
 * PDF Generation Service — @react-pdf/renderer
 *
 * Generates two PDFs per confirmed booking:
 *  1. Receipt PDF  — pricing, activity details, cancellation policy
 *  2. Waiver PDF   — participant list, waiver text, emergency contacts
 *
 * PDFs are:
 *  - Generated synchronously before sending confirmation email
 *  - Uploaded to Supabase Storage bucket "pdfs"
 *  - URL saved on Booking record
 *  - Attached directly to Resend confirmation email
 *
 * Locale: booking.locale only ("en" | "ja")
 * NO Puppeteer. NO Playwright.
 */
import React from "react";
import {
  Document,
  Font,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import { getCancellationPolicyText } from "@/lib/services/refundPolicy";
import {
  ADDRESS_JA,
  ADDRESS_EN,
  MAP_SHORT_LINK,
} from "@/lib/constants/business";

// ─── Font registration ────────────────────────────────────────────────────────
//
// Registered once at module load time (safe for Vercel serverless — the module
// is cached per container, so subsequent warm invocations reuse the font cache).
//
// jsDelivr proxies the notofonts/noto-cjk GitHub repo and serves the OTF with
// correct Content-Type headers.  react-pdf fetches the URL lazily during the
// first renderToBuffer call and caches it in-process.
//
// Regular (weight 400) + Bold (weight 700) are registered as a single family
// so react-pdf can resolve bold text automatically via fontWeight.

Font.register({
  family: "NotoSansJP",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/Japanese/NotoSansCJKjp-Bold.otf",
      fontWeight: 700,
    },
  ],
});

// Disable hyphenation — Japanese text must not be hyphenated.
Font.registerHyphenationCallback((word) => [word]);

// ─── Shared styles ────────────────────────────────────────────────────────────

const TEAL = "#0d9488";
const STONE = "#78716c";
const STONE_LIGHT = "#e7e5e4";
const BLACK = "#1c1917";

// All text uses NotoSansJP which covers every Latin + CJK character in the PDFs.
// Bold text is achieved via fontWeight: 700 (react-pdf resolves to the Bold OTF
// registered above — no need for a separate Helvetica-Bold hack).
const baseStyles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontWeight: 400,
    fontSize: 10,
    color: BLACK,
    padding: 40,
    lineHeight: 1.5,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: TEAL,
    borderBottomStyle: "solid",
    paddingBottom: 12,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    color: TEAL,
    // Explicit bottom margin prevents the large title from
    // visually colliding with the sub-header lines below it.
    marginBottom: 4,
    lineHeight: 1.1,
  },
  headerSub: {
    fontSize: 9,
    color: STONE,
    lineHeight: 1.4,
  },
  headerLeft: {
    // Explicit column direction so Title / Sub / Sub stack vertically.
    flexDirection: "column",
  },
  headerRef: {
    fontSize: 13,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    color: BLACK,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    color: TEAL,
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: STONE_LIGHT,
    borderBottomStyle: "solid",
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  // Label column: slightly narrower so value gets more room.
  // 34 / 66 split gives ~20% more space to values — key for long Japanese text.
  labelCol: {
    width: "34%",
    color: STONE,
    fontSize: 8.5,
    paddingRight: 4,
  },
  valueCol: {
    width: "66%",
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    fontSize: 8.5,
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: STONE_LIGHT,
    borderTopStyle: "solid",
    marginTop: 6,
    paddingTop: 6,
  },
  totalLabel: {
    width: "60%",
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    fontSize: 11,
  },
  totalValue: {
    width: "40%",
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    fontSize: 11,
    color: TEAL,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: STONE_LIGHT,
    borderTopStyle: "solid",
    paddingTop: 8,
    fontSize: 8,
    color: STONE,
    textAlign: "center",
  },
  policyBox: {
    backgroundColor: "#f5f5f4",
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  policyText: {
    fontSize: 8,
    color: STONE,
    lineHeight: 1.6,
  },
  waiverText: {
    fontSize: 9,
    color: BLACK,
    lineHeight: 1.7,
    marginBottom: 8,
  },
  participantCard: {
    borderWidth: 1,
    borderColor: STONE_LIGHT,
    borderStyle: "solid",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  participantName: {
    fontFamily: "NotoSansJP",
    fontWeight: 700,
    fontSize: 10,
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    borderBottomStyle: "solid",
    marginTop: 24,
    marginBottom: 4,
    height: 20,
  },
  signatureLabel: {
    fontSize: 8,
    color: STONE,
  },
  badge: {
    backgroundColor: TEAL,
    color: "#ffffff",
    fontSize: 8,
    padding: "2 6",
    borderRadius: 4,
    marginRight: 4,
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfBookingData {
  reference: string;
  locale: "en" | "ja";
  leadName: string;
  leadEmail: string;
  leadPhone?: string | null;
  activityNameEn: string;
  activityNameJa: string;
  activityType: "RAFTING" | "CANYONING";
  slotDate: string; // "YYYY-MM-DD"
  startTime: string; // "09:00"
  adultCount: number;
  childCount: number;
  hasBbq: boolean;
  subtotalJpy: number;
  discountJpy: number;
  totalJpy: number;
  promoCode?: string | null;
  paymentStatus: string;
  confirmedAt?: Date | null;
  participants: Array<{
    firstName: string;
    lastName?: string | null;
    participantType: "ADULT" | "CHILD";
    age?: number | null;
    waiverAccepted: boolean;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    swimmingConfidence?: string | null;
    medicalNotes?: string | null;
    dietaryNotes?: string | null;
  }>;
  isCombo?: boolean | null;
  secondarySlotTime?: string | null;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatJpy(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function formatDate(dateStr: string, locale: "en" | "ja"): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ─── Receipt PDF ───────────────────────────────────────────────────────────────

function ReceiptDocument({ d }: { d: PdfBookingData }) {
  const isJa = d.locale === "ja";
  const L = {
    title: isJa ? "領収書" : "Booking Receipt",
    activity: isJa ? "アクティビティ" : "Activity",
    date: isJa ? "日程" : "Date",
    time: isJa ? "出発時間" : "Departure Time",
    adults: isJa ? "大人" : "Adults",
    children: isJa ? "子ども" : "Children",
    addons: isJa ? "追加オプション" : "Add-ons",
    bbq: isJa ? "BBQ（現地払い）" : "BBQ (pay on arrival)",
    pricing: isJa ? "料金明細" : "Pricing",
    subtotal: isJa ? "小計" : "Subtotal",
    discount: isJa ? "割引" : "Discount",
    total: isJa ? "お支払い合計" : "Total Paid",
    paymentStatus: isJa ? "支払い状況" : "Payment Status",
    meetingPoint: isJa ? "集合場所" : "Meeting Point",
    meetingAddress: isJa
      ? ADDRESS_JA
      : ADDRESS_EN,
    mapLink: MAP_SHORT_LINK,
    cancellationPolicy: isJa ? "キャンセルポリシー" : "Cancellation Policy",
    footer: isJa
      ? "Dream Adventure をご利用いただきありがとうございます。川でお会いできるのを楽しみにしています！"
      : "Thank you for choosing Dream Adventure. We look forward to seeing you on the river!",
    address: `Dream Adventure | ${ADDRESS_EN}`,
  };

  const activityName = d.isCombo
    ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
    : (isJa ? d.activityNameJa : d.activityNameEn);

  return (
    <Document title={`${L.title} — ${d.reference}`} author="Dream Adventure">
      <Page size="A4" style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <View style={baseStyles.headerLeft}>
            <Text style={baseStyles.headerTitle}>Dream Adventure</Text>
            <Text style={baseStyles.headerSub}>{L.address}</Text>
            <Text style={baseStyles.headerSub}>contact@thedreamadventure.com</Text>
          </View>
          <View>
            <Text style={baseStyles.headerRef}>{d.reference}</Text>
            <Text style={{ ...baseStyles.headerSub, textAlign: "right" }}>{L.title}</Text>
          </View>
        </View>

        {/* Booking Summary */}
        <Text style={baseStyles.sectionTitle}>{isJa ? "ご予約内容" : "Booking Summary"}</Text>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{isJa ? "お名前" : "Guest Name"}</Text>
          <Text style={baseStyles.valueCol}>{d.leadName}</Text>
        </View>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{isJa ? "メールアドレス" : "Email"}</Text>
          <Text style={baseStyles.valueCol}>{d.leadEmail}</Text>
        </View>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{L.activity}</Text>
          <Text style={baseStyles.valueCol}>{activityName}</Text>
        </View>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{L.date}</Text>
          <Text style={baseStyles.valueCol}>{formatDate(d.slotDate, d.locale)}</Text>
        </View>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{L.time}</Text>
          {d.isCombo ? (
            <View style={{ width: "66%" }}>
              <Text style={baseStyles.valueCol}>
                {isJa ? "ラフティング: " : "Rafting: "}{d.startTime}
              </Text>
              {d.secondarySlotTime ? (
                <Text style={{ ...baseStyles.valueCol, marginTop: 2 }}>
                  {isJa ? "キャニオニング: " : "Canyoning: "}{d.secondarySlotTime}
                </Text>
              ) : (
                <Text style={{ ...baseStyles.valueCol, marginTop: 2, color: STONE }}>
                  {isJa ? "キャニオニング: 調整中" : "Canyoning: TBC"}
                </Text>
              )}
            </View>
          ) : (
            <Text style={baseStyles.valueCol}>{d.startTime}</Text>
          )}
        </View>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{L.adults}</Text>
          <Text style={baseStyles.valueCol}>{d.adultCount}</Text>
        </View>
        {d.childCount > 0 && (
          <View style={baseStyles.row}>
            <Text style={baseStyles.labelCol}>{L.children}</Text>
            <Text style={baseStyles.valueCol}>{d.childCount}</Text>
          </View>
        )}

        {/* Add-ons */}
        {d.hasBbq && (
          <>
            <Text style={baseStyles.sectionTitle}>{L.addons}</Text>
            <View style={baseStyles.row}>
              <Text style={baseStyles.labelCol}>•</Text>
              <Text style={baseStyles.valueCol}>{L.bbq}</Text>
            </View>
          </>
        )}

        {/* Pricing */}
        <Text style={baseStyles.sectionTitle}>{L.pricing}</Text>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{L.subtotal}</Text>
          <Text style={baseStyles.valueCol}>{formatJpy(d.subtotalJpy)}</Text>
        </View>
        {d.discountJpy > 0 && (
          <View style={baseStyles.row}>
            <Text style={baseStyles.labelCol}>
              {L.discount}{d.promoCode ? ` (${d.promoCode})` : ""}
            </Text>
            <Text style={{ ...baseStyles.valueCol, color: TEAL }}>
              -{formatJpy(d.discountJpy)}
            </Text>
          </View>
        )}
        <View style={baseStyles.totalRow}>
          <Text style={baseStyles.totalLabel}>{L.total}</Text>
          <Text style={baseStyles.totalValue}>{formatJpy(d.totalJpy)}</Text>
        </View>
        <View style={{ ...baseStyles.row, marginTop: 6 }}>
          <Text style={baseStyles.labelCol}>{L.paymentStatus}</Text>
          <Text style={{ ...baseStyles.valueCol, color: TEAL }}>{d.paymentStatus}</Text>
        </View>

        {/* Meeting Point */}
        <Text style={baseStyles.sectionTitle}>{L.meetingPoint}</Text>
        <Text style={{ fontSize: 9, marginBottom: 2 }}>{L.meetingAddress}</Text>
        <Text style={{ fontSize: 8, color: STONE }}>
          {isJa ? "地図：" : "Map: "}{L.mapLink}
        </Text>

        {/* Cancellation Policy */}
        <Text style={baseStyles.sectionTitle}>{L.cancellationPolicy}</Text>
        <View style={baseStyles.policyBox}>
          <Text style={baseStyles.policyText}>
            {getCancellationPolicyText(d.locale)}
          </Text>
        </View>

        {/* Footer */}
        <Text style={baseStyles.footer}>{L.footer}</Text>
      </Page>
    </Document>
  );
}

// ─── Waiver PDF ───────────────────────────────────────────────────────────────

function WaiverDocument({ d }: { d: PdfBookingData }) {
  const isJa = d.locale === "ja";

  const waiverBodyEn = `ACTIVITY WAIVER AND RELEASE OF LIABILITY

I, the undersigned, understand and acknowledge that:

1. ASSUMPTION OF RISK: Outdoor activities including river rafting and canyoning involve inherent risks including but not limited to: drowning, hypothermia, injury from rocks and equipment, capsizing, and other hazards. I voluntarily assume all such risks.

2. RELEASE: I, for myself and on behalf of all participants listed in this waiver, hereby release Dream Adventure, its guides, staff, and affiliates from any and all liability, claims, demands, and causes of action arising from participation in today's activity.

3. MEDICAL CONDITION: I confirm that all participants are in good physical and mental health and are capable of participating in the activity. Any medical conditions have been disclosed below.

4. PHOTOGRAPHY: I consent to being photographed and filmed during the activity. Media may be used for promotional purposes unless otherwise stated.

5. WEATHER: I understand that activities may be cancelled or modified due to weather or river conditions at the sole discretion of Dream Adventure guides.

By participating, each participant confirms they have read, understood, and agree to this waiver.`;

  const waiverBodyJa = `活動免責同意書

署名者は以下を理解し同意します：

1. リスクの承認：川下り（ラフティング）・キャニオニングなどのアウトドアアクティビティには、溺水、低体温症、岩や装備による負傷、転覆などの固有のリスクが伴います。参加者はこれらのリスクを自己責任で受け入れます。

2. 免責：署名者は自身および以下に記載する全参加者を代表して、Dream Adventure、そのガイド、スタッフおよび関連会社に対し、今回の活動参加に起因するいかなる損害賠償請求も放棄します。

3. 健康状態：全参加者が活動に参加可能な身体的・精神的健康状態にあることを確認します。既往症がある場合は以下に記載してください。

4. 撮影：活動中の写真・映像撮影に同意します。別段の申し出がない限り、プロモーション目的での使用を承諾します。

5. 天候：天候や河川状況によりガイドの判断でアクティビティが中止・変更となる場合があることを理解します。

参加することにより、各参加者は本免責同意書を読み、理解し、同意したことを確認します。`;

  const activityWaiverEn =
    d.activityType === "CANYONING"
      ? "\nCANYONING SPECIFIC: Participants must be confident swimmers. Minimum age is 12 years. Participants confirm they are comfortable with heights and confined spaces."
      : "\nRAFTING SPECIFIC: Participants must be able to follow paddle commands. Children age 6+ are welcome with a guardian.";

  const activityWaiverJa =
    d.activityType === "CANYONING"
      ? "\nキャニオニング補足：参加者は水泳が得意であることが必要です。最低年齢は12歳です。高所や狭い場所に対して問題ないことを確認します。"
      : "\nラフティング補足：パドル操作の指示に従える方が対象です。6歳以上のお子様は保護者同伴で参加可能です。";

  return (
    <Document title={`Waiver — ${d.reference}`} author="Dream Adventure">
      <Page size="A4" style={baseStyles.page}>
        {/* Header */}
        <View style={baseStyles.header}>
          <View style={baseStyles.headerLeft}>
            <Text style={baseStyles.headerTitle}>Dream Adventure</Text>
            <Text style={baseStyles.headerSub}>Numata, Gunma, Japan</Text>
          </View>
          <View>
            <Text style={baseStyles.headerRef}>{d.reference}</Text>
            <Text style={{ ...baseStyles.headerSub, textAlign: "right" }}>
              {isJa ? "活動免責同意書" : "Activity Waiver"}
            </Text>
          </View>
        </View>

        {/* Booking ref info */}
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{isJa ? "お名前" : "Lead Guest"}</Text>
          <Text style={baseStyles.valueCol}>{d.leadName}</Text>
        </View>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{isJa ? "日程" : "Date"}</Text>
          <Text style={baseStyles.valueCol}>{formatDate(d.slotDate, d.locale)}</Text>
        </View>
        <View style={baseStyles.row}>
          <Text style={baseStyles.labelCol}>{isJa ? "アクティビティ" : "Activity"}</Text>
          <Text style={baseStyles.valueCol}>
            {d.isCombo
              ? (isJa ? "ラフティング＋キャニオニング コンボ" : "Rafting + Canyoning Combo")
              : (isJa ? d.activityNameJa : d.activityNameEn)}
          </Text>
        </View>

        {/* Waiver text */}
        <Text style={baseStyles.sectionTitle}>
          {isJa ? "免責同意書本文" : "Waiver Agreement"}
        </Text>
        <Text style={baseStyles.waiverText}>
          {isJa ? waiverBodyJa : waiverBodyEn}
        </Text>
        <Text style={{ ...baseStyles.waiverText, fontFamily: "NotoSansJP", fontWeight: 700 }}>
          {isJa ? activityWaiverJa : activityWaiverEn}
        </Text>

        {/* Participants */}
        <Text style={baseStyles.sectionTitle}>
          {isJa ? "参加者一覧" : "Participants"}
        </Text>
        {d.participants.map((p, i) => (
          <View key={i} style={baseStyles.participantCard}>
            <Text style={baseStyles.participantName}>
              {i + 1}. {p.firstName} {p.lastName ?? ""}
              {p.age ? ` (${isJa ? "年齢" : "Age"}: ${p.age})` : ""}
              {" — "}
              {p.participantType === "ADULT"
                ? isJa ? "大人" : "Adult"
                : isJa ? "子ども" : "Child"}
            </Text>
            {p.emergencyContactName && (
              <Text style={{ fontSize: 8, color: STONE }}>
                {isJa ? "緊急連絡先" : "Emergency Contact"}: {p.emergencyContactName}
                {p.emergencyContactPhone ? ` — ${p.emergencyContactPhone}` : ""}
              </Text>
            )}
            {p.swimmingConfidence && (
              <Text style={{ fontSize: 8, color: STONE }}>
                {isJa ? "水泳レベル" : "Swimming"}: {p.swimmingConfidence}
              </Text>
            )}
            {p.medicalNotes && (
              <Text style={{ fontSize: 8, color: "#b45309" }}>
                {isJa ? "医療メモ" : "Medical notes"}: {p.medicalNotes}
              </Text>
            )}
            {p.dietaryNotes && (
              <Text style={{ fontSize: 8, color: STONE }}>
                {isJa ? "食事制限" : "Dietary notes"}: {p.dietaryNotes}
              </Text>
            )}
            <View style={{ ...baseStyles.row, marginTop: 6, alignItems: "center" }}>
              <Text style={{ fontSize: 8, color: STONE, marginRight: 8 }}>
                {isJa ? "同意状況" : "Waiver"}:
              </Text>
              <Text
                style={{
                  fontSize: 8,
                  color: p.waiverAccepted ? TEAL : "#dc2626",
                  fontFamily: "NotoSansJP",
                  fontWeight: 700,
                }}
              >
                {p.waiverAccepted
                  ? isJa ? "✓ 同意済み" : "✓ Accepted"
                  : isJa ? "✗ 未同意" : "✗ Not accepted"}
              </Text>
            </View>
          </View>
        ))}

        {/* Consent summary */}
        <Text style={baseStyles.sectionTitle}>
          {isJa ? "同意確認" : "Consent Acknowledgement"}
        </Text>
        <Text style={baseStyles.waiverText}>
          {isJa
            ? "本書に署名することにより、上記参加者全員が免責同意書の内容を読み、理解し、同意したことを確認します。"
            : "By signing below, the lead guest confirms that all participants listed have read, understood, and agreed to the waiver terms above."}
        </Text>

        {/* Signature line */}
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: "row", gap: 40 }}>
            <View style={{ flex: 1 }}>
              <View style={baseStyles.signatureLine} />
              <Text style={baseStyles.signatureLabel}>
                {isJa ? "署名（リードゲスト）" : "Signature (Lead Guest)"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={baseStyles.signatureLine} />
              <Text style={baseStyles.signatureLabel}>
                {isJa ? "日付" : "Date"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={baseStyles.footer}>
          {isJa
            ? "Dream Adventure をご利用いただきありがとうございます。川でお会いできるのを楽しみにしています！"
            : "Thank you for choosing Dream Adventure. We look forward to seeing you on the river!"}
        </Text>
      </Page>
    </Document>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Render Receipt PDF to a Buffer.
 */
export async function generateReceiptPdf(data: PdfBookingData): Promise<Buffer> {
  const doc = React.createElement(ReceiptDocument, { d: data });
  const buf = await renderToBuffer(doc as React.ReactElement<DocumentProps>);
  return Buffer.from(buf);
}

/**
 * Render Waiver PDF to a Buffer.
 */
export async function generateWaiverPdf(data: PdfBookingData): Promise<Buffer> {
  const doc = React.createElement(WaiverDocument, { d: data });
  const buf = await renderToBuffer(doc as React.ReactElement<DocumentProps>);
  return Buffer.from(buf);
}
