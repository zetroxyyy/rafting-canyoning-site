import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import { Train, Car, ExternalLink, MapPin, Clock, Phone } from "lucide-react";
import type { Metadata } from "next";
import { MAP_EMBED_SRC, MAP_SHORT_LINK, TRANSIT_DESC_EN, TRANSIT_DESC_JA } from "@/lib/constants/business";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return {
    title: isJa ? "アクセス・集合場所" : "Access & Directions to Base",
    description: isJa
      ? `ドリームアドベンチャーベースへのアクセス方法。${TRANSIT_DESC_JA}。無料駐車場完備。`
      : `Directions to Dream Adventure base in Gunma. ${TRANSIT_DESC_EN}. Free parking available.`,
    alternates: {
      canonical: locale === "ja" ? "/access" : `/en/access`,
      languages: {
        en: "/en/access",
        ja: "/access",
        "x-default": "/access",
      },
    },
  };
}

export default async function AccessPage() {
  const t = await getTranslations("access");
  const locale = await getLocale();

  return (
    <div className="section bg-white">
      <div className="container-site max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="section-label">{locale === "en" ? "Access" : "アクセス"}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">{t("title")}</h1>
          <p className="text-stone-500">{t("intro")}</p>
        </div>

        {/* Transport cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* By Train */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-teal-100)" }}
              >
                <Train className="w-5 h-5" style={{ color: "var(--color-teal-700)" }} />
              </div>
              <h2 className="font-bold text-stone-900">{t("by_train")}</h2>
            </div>
            <div className="space-y-4 text-sm text-stone-600">
              {locale === "en" ? (
                <>
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      Option 1: By Shinkansen
                    </h3>
                    <div className="pl-3 space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>Tokyo Station → Jomo-Kogen Station (Joetsu Shinkansen)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
                        <p className="text-stone-500 font-mono">Approx. 75 minutes</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>From Jomo-Kogen Station, take a local bus or taxi to the base.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      Option 2: By Local Train
                    </h3>
                    <div className="pl-3 space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>Tokyo/Ueno Station → Numata Station (via JR Joetsu Line from Takasaki)</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
                        <p className="text-stone-500 font-mono">Approx. 3 hours</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>From Numata Station, our base is {TRANSIT_DESC_EN} (taxi available).</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-teal-100)" }}>
                    <p style={{ color: "var(--color-teal-800)" }}>{t("transfer_note")}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                      ルート1：新幹線をご利用の場合
                    </h3>
                    <div className="pl-3 space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>東京駅 → 上毛高原駅（JR上越新幹線）</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
                        <p className="text-stone-500 font-mono">約75分</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>上毛高原駅下車後、路線バスまたはタクシーでベースまでお越しください。</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      ルート2：在来線をご利用の場合
                    </h3>
                    <div className="pl-3 space-y-1">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>東京・上野駅 → 水上駅（JR高崎線＆上越線経由）</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
                        <p className="text-stone-500 font-mono">約3時間</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                        <p>水上駅下車後、徒歩またはタクシーですぐです。</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-teal-100)" }}>
                    <p style={{ color: "var(--color-teal-800)" }}>{t("transfer_note")}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* By Car */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-teal-100)" }}
              >
                <Car className="w-5 h-5" style={{ color: "var(--color-teal-700)" }} />
              </div>
              <h2 className="font-bold text-stone-900">{t("by_car")}</h2>
            </div>
            <div className="space-y-3 text-sm text-stone-600">
              {locale === "en" ? (
                <>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                    <p>Kan-Etsu Expressway → Tsukiyono IC</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
                    <p className="text-stone-400">Approx. 2 hours from central Tokyo</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                    <p>Free parking available at our base</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                    <p>関越自動車道 → 月夜野IC</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
                    <p className="text-stone-400">東京都心から約2時間</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                    <p>ベース施設に無料駐車場完備</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Google Maps embed */}
        <div className="h-[380px] overflow-hidden rounded-2xl shadow-lg border border-stone-200 mb-6">
          <iframe
            src={MAP_EMBED_SRC}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Dream Adventure Gunma location"
            aria-label="Google Maps showing Gunma, Japan"
          />
        </div>

        {/* Actions row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={MAP_SHORT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            id="google-maps-link"
            className="btn btn-outline flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            {t("map")}
          </a>
          <a
            href="tel:090-3338-1375"
            id="access-call-us"
            className="btn btn-primary flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            {locale === "en" ? "Call Us" : "お電話"}
          </a>
        </div>
      </div>
    </div>
  );
}
