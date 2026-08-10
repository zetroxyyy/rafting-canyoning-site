"use client";

import { useState, useTransition } from "react";
import {
  Shield, Loader2, CheckCircle2, AlertTriangle,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Lock, Tag, Eye, EyeOff,
} from "lucide-react";
import {
  updateSettings,
  updateAdminPassword,
  type AppSettings,
} from "@/app/actions/admin/settings";
import { cn } from "@/lib/cn";
import type { PromoRow } from "@/app/actions/admin/promos";
import PromoManager from "@/components/admin/PromoManager";

// ─── Section wrapper — all closed by default ──────────────────────────────────

function Section({
  icon: Icon, title, description, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-stone-900 text-sm">{title}</p>
            <p className="text-xs text-stone-400 mt-0.5">{description}</p>
          </div>
        </div>
        {open
          ? <ChevronUp   className="w-4 h-4 text-stone-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-stone-100 px-6 py-5">{children}</div>
      )}
    </div>
  );
}

// ─── Feedback ────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "success" | "error";

function Feedback({ status, message }: { status: SaveStatus; message?: string }) {
  if (status === "idle")    return null;
  if (status === "saving")  return (
    <span className="flex items-center gap-1.5 text-xs text-stone-500">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…
    </span>
  );
  if (status === "success") return (
    <span className="flex items-center gap-1.5 text-xs text-teal-600">
      <CheckCircle2 className="w-3.5 h-3.5" />Saved
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-xs text-red-600">
      <AlertTriangle className="w-3.5 h-3.5" />{message ?? "Save failed"}
    </span>
  );
}

function SectionFooter({ status, label, onSave, disabled, message }: {
  status: SaveStatus; label: string; onSave: () => void; disabled?: boolean; message?: string;
}) {
  return (
    <div className="flex items-center justify-between mt-5 pt-4 border-t border-stone-100">
      <Feedback status={status} message={message} />
      <button
        onClick={onSave}
        disabled={disabled || status === "saving"}
        className="btn btn-primary btn-sm"
      >
        {status === "saving" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {label}
      </button>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-stone-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800">{label}</p>
        {hint && <p className="text-xs text-stone-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── PasswordInput — show/hide toggle ────────────────────────────────────────

function PasswordInput({ id, value, onChange, placeholder, autoComplete }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input w-52 text-sm pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── useSave ─────────────────────────────────────────────────────────────────

function useSave() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [msg, setMsg]       = useState<string | undefined>();
  const [, start]           = useTransition();

  const save = (fn: () => Promise<{ success: true } | { error: string }>) => {
    start(async () => {
      setStatus("saving");
      const res = await fn();
      if ("error" in res) { setStatus("error"); setMsg(res.error); }
      else                { setStatus("success"); setMsg(undefined); }
      setTimeout(() => setStatus("idle"), 3500);
    });
  };

  return { status, msg, save };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsSections({
  settings,
  promos,
}: {
  settings: AppSettings;
  promos: PromoRow[];
}) {

  // ── Security — password only ─────────────────────────────────────────────
  const [pw, setPw]       = useState({ newPw: "", confirmPw: "" });
  const [pwMsg, setPwMsg] = useState<string | undefined>();
  const passwordSave = useSave();

  const savePassword = () => {
    if (pw.newPw !== pw.confirmPw) { setPwMsg("Passwords do not match."); return; }
    if (pw.newPw.length < 8)       { setPwMsg("Minimum 8 characters.");   return; }
    setPwMsg(undefined);
    passwordSave.save(() => updateAdminPassword(pw.newPw));
    setPw({ newPw: "", confirmPw: "" });
  };

  // ── System — maintenance + notification emails ────────────────────────────
  const [maintenance, setMaintenance] = useState(settings.maintenanceMode);
  const [emailsRaw, setEmailsRaw]     = useState(settings.notificationEmails.join(", "));
  const [isPromoBannerActive, setIsPromoBannerActive] = useState(settings.isPromoBannerActive);
  const [promoBannerText, setPromoBannerText]         = useState(settings.promoBannerText);
  const [isOffSeasonMode, setIsOffSeasonMode]         = useState(settings.isOffSeasonMode);
  const systemSave = useSave();

  const saveSystem = () =>
    systemSave.save(() =>
      updateSettings({
        maintenanceMode:    maintenance,
        notificationEmails: emailsRaw.split(",").map((e) => e.trim()).filter(Boolean),
        isPromoBannerActive,
        promoBannerText,
        isOffSeasonMode,
      })
    );

  return (
    <div className="space-y-4">

      {/* ── Security — password only ──────────────────────────────────── */}
      <Section
        icon={Lock}
        title="Security"
        description="Update the admin account password."
      >
        <FieldRow label="New Password" hint="Minimum 8 characters">
          <PasswordInput
            id="new-password"
            value={pw.newPw}
            onChange={(v) => setPw((p) => ({ ...p, newPw: v }))}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </FieldRow>
        <FieldRow label="Confirm Password">
          <PasswordInput
            id="confirm-password"
            value={pw.confirmPw}
            onChange={(v) => setPw((p) => ({ ...p, confirmPw: v }))}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </FieldRow>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-stone-100">
          <Feedback status={passwordSave.status} message={pwMsg ?? passwordSave.msg} />
          <button
            id="save-password"
            onClick={savePassword}
            disabled={!pw.newPw || passwordSave.status === "saving"}
            className="btn btn-primary btn-sm"
          >
            {passwordSave.status === "saving"
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : null}
            Update Password
          </button>
        </div>
      </Section>

      {/* ── Promo Code Manager ───────────────────────────────────────────── */}
      <Section
        icon={Tag}
        title="Promo Code Manager"
        description="Create, edit, and deactivate discount codes."
      >
        <PromoManager initialPromos={promos} />
      </Section>

      {/* ── System ───────────────────────────────────────────────────────── */}
      <Section
        icon={Shield}
        title="System"
        description="Maintenance mode and operational notification emails."
      >
        <FieldRow
          label="Maintenance Mode"
          hint={
            maintenance
              ? "⚠ ACTIVE — booking is hidden sitewide"
              : "Disabled — booking is visible"
          }
        >
          <button
            id="toggle-maintenance"
            type="button"
            onClick={() => setMaintenance((m) => !m)}
            aria-pressed={maintenance}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors",
              maintenance
                ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
            )}
          >
            {maintenance
              ? <ToggleRight className="w-5 h-5 text-amber-600" />
              : <ToggleLeft  className="w-5 h-5 text-stone-400" />}
            {maintenance ? "ON" : "OFF"}
          </button>
        </FieldRow>

        {maintenance && (
          <div className="mt-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Maintenance mode is <strong>ON</strong>. Book Now buttons are hidden
              on the public site and direct booking URL access is blocked.
            </span>
          </div>
        )}

        {/* Promo Announcement Bar */}
        <FieldRow
          label="Promo Announcement Bar"
          hint={
            isPromoBannerActive
              ? "ACTIVE — banner displays at top of public pages"
              : "Disabled — banner is hidden"
          }
        >
          <button
            id="toggle-promo-banner"
            type="button"
            onClick={() => setIsPromoBannerActive((a) => !a)}
            aria-pressed={isPromoBannerActive}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors",
              isPromoBannerActive
                ? "bg-teal-50 border-teal-300 text-teal-700 hover:bg-teal-100"
                : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
            )}
          >
            {isPromoBannerActive
              ? <ToggleRight className="w-5 h-5 text-teal-600" />
              : <ToggleLeft  className="w-5 h-5 text-stone-400" />}
            {isPromoBannerActive ? "ON" : "OFF"}
          </button>
        </FieldRow>

        <FieldRow
          label="Announcement Bar Text"
          hint="Text content for the promo banner"
        >
          <input
            id="promo-banner-text"
            type="text"
            value={promoBannerText}
            onChange={(e) => setPromoBannerText(e.target.value)}
            placeholder="Special Offer: Book rafting & canyoning together and save!"
            className="input w-64 text-sm"
          />
        </FieldRow>

        {/* Off-Season Mode */}
        <FieldRow
          label="Off-Season Mode"
          hint={
            isOffSeasonMode
              ? "⚠ ACTIVE — replaces Book Now buttons with off-season message"
              : "Disabled — booking is operational"
          }
        >
          <button
            id="toggle-off-season"
            type="button"
            onClick={() => setIsOffSeasonMode((o) => !o)}
            aria-pressed={isOffSeasonMode}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors",
              isOffSeasonMode
                ? "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
                : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
            )}
          >
            {isOffSeasonMode
              ? <ToggleRight className="w-5 h-5 text-amber-600" />
              : <ToggleLeft  className="w-5 h-5 text-stone-400" />}
            {isOffSeasonMode ? "ON" : "OFF"}
          </button>
        </FieldRow>

        {isOffSeasonMode && (
          <div className="mt-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Off-Season mode is <strong>ON</strong>. The public website will remain fully navigable, but booking flows and "Book Now" buttons will be disabled/replaced with a seasonal conclusion message.
            </span>
          </div>
        )}

        {/* Notification Emails — no leading icon, text never overlapped */}
        <FieldRow
          label="Notification Emails"
          hint="Comma-separated — receives booking alert emails"
        >
          <input
            id="notification-emails"
            type="text"
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            placeholder="booking@thedreamadventure.com"
            className="input w-64 text-sm"
          />
        </FieldRow>

        <SectionFooter
          status={systemSave.status}
          label="Save System Settings"
          onSave={saveSystem}
        />
      </Section>

    </div>
  );
}
