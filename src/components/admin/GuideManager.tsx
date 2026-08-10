"use client";

/**
 * GuideManager — Enterprise-grade Staff Roster UI
 *
 * Sections:
 *   - AddGuideForm: premium inputs with focus rings, feedback toasts
 *   - Stats strip: active / inactive KPI tiles
 *   - Guide Roster: card-based rows, status pills, polished toggle buttons
 */

import { useState, useTransition } from "react";
import {
  Loader2, Plus, UserCheck, UserX, Phone, User,
  CheckCircle2, XCircle, Shield,
} from "lucide-react";
import { createGuide, toggleGuide, type GuideRow } from "@/app/actions/admin/guides";

// ─── AddGuideForm ─────────────────────────────────────────────────────────────

function AddGuideForm({ onCreated }: { onCreated: (g: GuideRow) => void }) {
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [err,     setErr]     = useState("");
  const [ok,      setOk]      = useState("");
  const [pending, start]      = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk("");
    const trimmedName = name.trim();
    if (!trimmedName) { setErr("Name is required."); return; }
    if (trimmedName.length > 100) { setErr("Name must be under 100 characters."); return; }

    start(async () => {
      const res = await createGuide({ name: trimmedName, phone: phone.trim() || null });
      if ("error" in res) {
        setErr(res.error);
      } else {
        setOk(`"${trimmedName}" added to roster!`);
        setName(""); setPhone("");
        onCreated({ id: res.id, name: trimmedName, phone: phone.trim() || null, isActive: true, createdAt: new Date().toISOString().slice(0, 10) });
        setTimeout(() => setOk(""), 3500);
      }
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Form header */}
      <div className="px-5 py-4 bg-gradient-to-b from-stone-50 to-white border-b border-stone-100">
        <h3 className="font-bold text-stone-800 text-sm flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 text-teal-600" />
          </div>
          Add New Guide
        </h3>
        <p className="text-xs text-stone-400 mt-0.5">Guides are available immediately in the Manifest Builder</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Feedback */}
        {err && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 font-medium">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {err}
          </div>
        )}
        {ok && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-teal-50 border border-teal-100 text-xs text-teal-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            {ok}
          </div>
        )}

        {/* Name field */}
        <div className="space-y-1.5">
          <label htmlFor="guide-name" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
            Full Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <User className="w-3.5 h-3.5 text-stone-300" />
            </div>
            <input
              id="guide-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kenji Tanaka"
              maxLength={100}
              required
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 hover:border-stone-300"
            />
          </div>
        </div>

        {/* Phone field */}
        <div className="space-y-1.5">
          <label htmlFor="guide-phone" className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
            Phone <span className="text-stone-300 font-normal normal-case">(optional)</span>
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Phone className="w-3.5 h-3.5 text-stone-300" />
            </div>
            <input
              id="guide-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+81 90-0000-0000"
              maxLength={30}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 hover:border-stone-300"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {pending ? "Adding…" : "Add Guide"}
        </button>
      </div>
    </form>
  );
}

// ─── Stats Tile ───────────────────────────────────────────────────────────────

function StatTile({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="flex-1 text-center py-4">
      <p className="text-3xl font-extrabold tabular-nums" style={{ color: accent, letterSpacing: "-0.04em" }}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">{label}</p>
    </div>
  );
}

// ─── GuideRowItem ─────────────────────────────────────────────────────────────

function GuideRowItem({ guide, onToggle }: { guide: GuideRow; onToggle: (id: string, next: boolean) => void }) {
  const [pending, start] = useTransition();

  function handleToggle() {
    const next = !guide.isActive;
    start(async () => {
      const res = await toggleGuide(guide.id, next);
      if ("error" in res) console.error("[toggleGuide]", res.error);
      else onToggle(guide.id, next);
    });
  }

  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 border-b border-stone-100 last:border-0 transition-colors duration-150 hover:bg-stone-50/50 ${
        guide.isActive ? "" : "opacity-50"
      }`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        guide.isActive ? "bg-teal-50" : "bg-stone-100"
      }`}>
        <Shield className={`w-4 h-4 ${guide.isActive ? "text-teal-500" : "text-stone-300"}`} />
      </div>

      {/* Name + phone */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-900 leading-tight">{guide.name}</p>
        {guide.phone ? (
          <a
            href={`tel:${guide.phone}`}
            className="text-xs text-stone-400 hover:text-teal-600 transition-colors flex items-center gap-1 mt-0.5 cursor-pointer"
          >
            <Phone className="w-3 h-3 flex-shrink-0" />
            {guide.phone}
          </a>
        ) : (
          <p className="text-xs text-stone-300 mt-0.5">No phone</p>
        )}
      </div>

      {/* Status pill */}
      <div className="flex-shrink-0">
        {guide.isActive ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-400 border border-stone-200">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
            Inactive
          </span>
        )}
      </div>

      {/* Added date */}
      <p className="text-xs text-stone-300 font-mono flex-shrink-0 hidden sm:block">{guide.createdAt}</p>

      {/* Toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        title={guide.isActive ? "Deactivate this guide" : "Activate this guide"}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          guide.isActive
            ? "bg-white text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200 hover:shadow-sm"
            : "bg-white text-teal-600 border-teal-100 hover:bg-teal-50 hover:border-teal-200 hover:shadow-sm"
        }`}
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : guide.isActive ? (
          <UserX className="w-3.5 h-3.5" />
        ) : (
          <UserCheck className="w-3.5 h-3.5" />
        )}
        {pending ? "…" : guide.isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}

// ─── Main GuideManager ────────────────────────────────────────────────────────

export default function GuideManager({ initialGuides }: { initialGuides: GuideRow[] }) {
  const [guides, setGuides] = useState<GuideRow[]>(initialGuides);

  function handleCreated(g: GuideRow) { setGuides((prev) => [g, ...prev]); }
  function handleToggle(id: string, next: boolean) {
    setGuides((prev) => prev.map((g) => (g.id === id ? { ...g, isActive: next } : g)));
  }

  const active   = guides.filter((g) => g.isActive).length;
  const inactive = guides.filter((g) => !g.isActive).length;

  return (
    <div className="grid lg:grid-cols-3 gap-6">

      {/* ── Left column: form + stats ── */}
      <div className="lg:col-span-1 space-y-4">
        <AddGuideForm onCreated={handleCreated} />

        {/* Stats strip */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm flex overflow-hidden">
          <StatTile value={active}   label="Active"   accent="#0d9488" />
          <div className="w-px bg-stone-100 my-4" />
          <StatTile value={inactive} label="Inactive"  accent="#a8a29e" />
          <div className="w-px bg-stone-100 my-4" />
          <StatTile value={guides.length} label="Total" accent="#1c1917" />
        </div>
      </div>

      {/* ── Right column: roster ── */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          {/* Roster header */}
          <div className="px-5 py-4 border-b border-stone-100 bg-gradient-to-b from-stone-50 to-white flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-stone-800">Staff Roster</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {active} active · {inactive} inactive
              </p>
            </div>
            {active > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                <CheckCircle2 className="w-3 h-3" />
                {active} ready
              </span>
            )}
          </div>

          {/* Roster body */}
          {guides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                <UserCheck className="w-7 h-7 text-teal-300" />
              </div>
              <p className="font-semibold text-stone-600 text-sm">No guides yet</p>
              <p className="text-xs text-stone-400 mt-1.5 max-w-xs leading-relaxed">
                Add your first guide using the form. They&apos;ll appear here and become
                available for manifest assignment immediately.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {guides.map((guide) => (
                <GuideRowItem key={guide.id} guide={guide} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
