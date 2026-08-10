"use client";

import { useTranslations, useLocale } from "next-intl";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, type ContactFormInput } from "@/lib/schemas";
import { useState, useTransition } from "react";
import { Mail, Phone, Send, Loader2, CheckCircle2, Info } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");
  const locale = useLocale() as "en" | "ja";
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormInput>({
    // @ts-expect-error resolver type mismatch due to react-hook-form/zod version diff
    resolver: zodResolver(contactFormSchema),
    defaultValues: { locale: locale as "en" | "ja" },
  });

  const onSubmit = (data: ContactFormInput) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setSuccess(true);
          reset();
        }
      } catch {
        // handled by success false
      }
    });
  };

  const handleFormSubmit = handleSubmit((data) => {
    onSubmit(data as unknown as ContactFormInput);
  });

  return (
    <div className="section bg-white">
      <div className="container-site max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="section-label">{locale === "en" ? "Contact" : "お問い合わせ"}</span>
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-3">{t("title")}</h1>
          <p className="text-stone-500">{t("subtitle")}</p>
        </div>

        {/* Concierge model info banner */}
        <div
          className="rounded-xl p-4 flex items-start gap-3 mb-8 text-sm"
          style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-teal-100)" }}
        >
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--color-teal-600)" }} />
          <p className="text-stone-700 leading-relaxed">
            {locale === "en"
              ? "We operate a \"Call to Confirm / Pay on Arrival\" model. We do not accept payments online. Send us a message or call us directly and our team will confirm your booking by phone. Payment is made in cash or card at our base on the day of your activity."
              : "「お電話で確認・現地払い」モデルを採用しています。オンラインでの決済は行っておりません。お問い合わせいただくと、スタッフがお電話にてご予約内容を確認します。お支払いは当日ベースにて現金またはカードで承ります。"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact channels */}
          <div className="space-y-5">
            {/* Phone — primary */}
            <a
              href="tel:090-3338-1375"
              id="contact-phone"
              className="card p-6 flex items-start gap-4 hover:shadow-md transition-all"
              style={{ borderColor: "var(--color-teal-200)" }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: "var(--color-teal-600)" }}
              >
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">
                  {locale === "en" ? "Call Us" : "お電話"}
                </h3>
                <p className="text-sm text-stone-500 mt-0.5">
                  {locale === "en"
                    ? "Speak directly with our team: 090-3338-1375"
                    : "スタッフに直接お電話ください: 090-3338-1375"}
                </p>
                <span
                  className="inline-flex items-center mt-2 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}
                >
                  {locale === "en" ? "Recommended" : "推奨"}
                </span>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:contact@thedreamadventure.com"
              id="contact-email"
              className="card p-6 flex items-start gap-4 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                style={{ background: "var(--color-teal-600)" }}
              >
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900">{t("email")}</h3>
                <p className="text-sm text-stone-500 mt-0.5 break-all">contact@thedreamadventure.com</p>
                <p className="text-xs text-stone-400 mt-1">
                  {locale === "en" ? "Response within 24 hours" : "24時間以内に返信"}
                </p>
              </div>
            </a>

            {/* Operating hours */}
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--color-teal-50)", border: "1px solid var(--color-teal-100)" }}
            >
              <h3 className="font-semibold text-stone-900 text-sm mb-3">
                {locale === "en" ? "Operating Hours" : "営業時間"}
              </h3>
              <div className="space-y-1 text-sm text-stone-600">
                <div className="flex justify-between">
                  <span>{locale === "en" ? "Daily" : "毎日"}</span>
                  <span className="font-semibold text-stone-900">8:00 AM – 6:00 PM</span>
                </div>
                <p className="text-xs text-stone-400 mt-2">
                  {locale === "en"
                    ? "Season: April through October"
                    : "シーズン：4月〜10月"}
                </p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="card p-6">
            {success ? (
              <div className="h-full flex items-center justify-center text-center py-12">
                <div>
                  <CheckCircle2
                    className="w-12 h-12 mx-auto mb-4"
                    style={{ color: "var(--color-teal-600)" }}
                  />
                  <p className="font-semibold text-stone-900 text-lg">{t("form.success")}</p>
                  <p className="text-stone-500 text-sm mt-2">
                    {locale === "en"
                      ? "We'll call or email you shortly to confirm."
                      : "確認のためにお電話またはメールにてご連絡します。"}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="label" htmlFor="contact-name">{t("form.name")} *</label>
                  <input
                    id="contact-name"
                    {...register("name")}
                    className={`input ${errors.name ? "error" : ""}`}
                  />
                  {errors.name && <p className="field-error">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="contact-email-field">{t("form.email")} *</label>
                  <input
                    id="contact-email-field"
                    type="email"
                    {...register("email")}
                    className={`input ${errors.email ? "error" : ""}`}
                  />
                  {errors.email && <p className="field-error">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="contact-phone-field">{t("form.phone")}</label>
                  <input
                    id="contact-phone-field"
                    type="tel"
                    {...register("phone")}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="contact-subject">{t("form.subject")}</label>
                  <input id="contact-subject" {...register("subject")} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="contact-message">{t("form.message")} *</label>
                  <textarea
                    id="contact-message"
                    {...register("message")}
                    className={`input min-h-[120px] resize-y ${errors.message ? "error" : ""}`}
                  />
                  {errors.message && <p className="field-error">{errors.message.message}</p>}
                </div>
                <button
                  type="submit"
                  id="contact-submit"
                  disabled={isPending}
                  className="btn btn-primary w-full justify-center"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Send className="w-4 h-4" /> {t("form.send")}</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
