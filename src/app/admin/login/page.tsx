"use client";

import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminLoginSchema, type AdminLoginInput } from "@/lib/schemas";
import { useState } from "react";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });

  const onSubmit = async (data: AdminLoginInput) => {
    setServerError("");
    setIsLoading(true);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setServerError("Invalid email or password.");
    } else {
      window.location.assign("/admin");
    }
    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% -10%, #ccfbf1 0%, #f0fdfa 40%, #fafaf9 100%)",
      }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm bg-white rounded-3xl flex flex-col overflow-hidden"
        style={{
          minHeight: "470px",
          border: "1px solid rgba(13,148,136,0.13)",
          boxShadow:
            "0 2px 4px rgb(0 0 0/0.04), 0 12px 40px -8px rgb(13 148 136/0.15)",
        }}
      >
        {/* Teal accent stripe */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{ background: "linear-gradient(90deg,#0d9488,#14b8a6,#0d9488)" }}
        />

        {/* Content */}
        <div className="flex flex-col flex-1 px-8 pt-8 pb-8 gap-5">

          {/* Logo + heading */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)" }}
            >
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Admin Login
              </h1>
              <p className="text-sm text-stone-400 mt-1">
                Dream Adventure Dashboard
              </p>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col flex-1 gap-4"
          >
            {/* Email field */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <label
                htmlFor="admin-email"
                className="text-sm font-medium text-stone-600"
              >
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                {...register("email")}
                placeholder="admin@thedreamadventure.com"
                autoComplete="email"
                className={`input ${errors.email ? "error" : ""}`}
              />
              {/* Fixed-height error line — always in DOM, text fills it when invalid */}
              <p className="h-4 text-xs text-red-500">
                {errors.email?.message ?? ""}
              </p>
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <label
                htmlFor="admin-password"
                className="text-sm font-medium text-stone-600"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPw ? "text" : "password"}
                  {...register("password")}
                  autoComplete="current-password"
                  className={`input pr-11 ${errors.password ? "error" : ""}`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {/* Fixed-height error line — always in DOM */}
              <p className="h-4 text-xs text-red-500">
                {errors.password?.message ?? ""}
              </p>
            </div>

            {/*
              Dedicated server-error area — FIXED height h-8.
              Always rendered. Text appears inside it only when there is an error.
              The Sign In button below NEVER moves.
            */}
            <div
              className={`h-8 flex items-center rounded-lg px-3 text-sm font-medium flex-shrink-0 transition-opacity duration-200 ${
                serverError
                  ? "opacity-100 bg-red-50 border border-red-200 text-red-700"
                  : "opacity-0"
              }`}
              aria-live="assertive"
            >
              {serverError}
            </div>

            {/* Sign In button — mt-auto keeps it at the bottom of the flex column */}
            <button
              type="submit"
              id="admin-login-submit"
              disabled={isLoading}
              className="mt-auto flex-shrink-0 btn btn-primary w-full justify-center py-3.5 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
