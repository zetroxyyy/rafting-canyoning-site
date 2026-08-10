"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { manageBookingSchema, type ManageBookingInput } from "@/lib/schemas";
import { useState } from "react";
import { Search, Loader2, MapPin, Shield } from "lucide-react";

export default function ManagePage() {
  const locale = useLocale() as "en" | "ja";
  const router = useRouter();
  const [notFound, setNotFound] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManageBookingInput>({ resolver: zodResolver(manageBookingSchema) });

  const onSubmit = async (data: ManageBookingInput) => {
    setNotFound(false);
    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/booking/lookup?ref=${data.reference.toUpperCase()}&email=${encodeURIComponent(data.email)}`
      );
      if (res.ok) {
        // Verified — navigate to the portal, passing email as query param for
        // subsequent authenticated API calls within the portal page.
        router.push(
          locale === "ja" ? `/manage/${data.reference.toUpperCase()}?email=${encodeURIComponent(data.email)}` : `/en/manage/${data.reference.toUpperCase()}?email=${encodeURIComponent(data.email)}`
        );
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center px-4 py-16"
      style={{ background: "var(--color-teal-50)" }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)" }}
          >
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">
            {locale === "en" ? "Manage Your Booking" : "ご予約の管理"}
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            {locale === "en"
              ? "Enter your booking reference and email address to access your booking portal."
              : "予約番号とメールアドレスを入力して予約の詳細をご確認ください。"}
          </p>
        </div>

        {/* Lookup card */}
        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label" htmlFor="manage-ref">
                {locale === "en" ? "Booking Reference" : "予約番号"}
              </label>
              <input
                id="manage-ref"
                {...register("reference")}
                className={`input font-mono uppercase ${errors.reference ? "error" : ""}`}
                placeholder="DA-240619-ABCD"
                autoCapitalize="characters"
                autoComplete="off"
              />
              <p className="h-5 mt-1 text-xs text-red-500">
                {errors.reference?.message ?? ""}
              </p>
            </div>

            <div>
              <label className="label" htmlFor="manage-email">
                {locale === "en" ? "Email Address" : "メールアドレス"}
              </label>
              <input
                id="manage-email"
                type="email"
                {...register("email")}
                className={`input ${errors.email ? "error" : ""}`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <p className="h-5 mt-1 text-xs text-red-500">
                {errors.email?.message ?? ""}
              </p>
            </div>

            {/* Not found error */}
            <div
              className={`h-10 flex items-center rounded-xl px-4 text-sm transition-opacity duration-200 ${
                notFound
                  ? "opacity-100 bg-red-50 border border-red-200 text-red-700"
                  : "opacity-0"
              }`}
              aria-live="assertive"
            >
              {locale === "en"
                ? "No booking found. Please check your reference and email."
                : "予約が見つかりませんでした。番号とメールをご確認ください。"}
            </div>

            <button
              type="submit"
              id="manage-find"
              disabled={isSearching}
              className="btn btn-primary w-full justify-center"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  {locale === "en" ? "Find My Booking" : "予約を検索"}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-stone-400 mt-5 flex items-center justify-center gap-1.5">
          <Shield className="w-3 h-3" />
          {locale === "en"
            ? "Your reference and email are used to verify your identity. No password required."
            : "予約番号とメールアドレスで本人確認を行います。パスワード不要です。"}
        </p>
      </div>
    </div>
  );
}
