"use client";

import { useState, useTransition } from "react";
import {
  Plus, Pencil, Trash2, Check, X, Loader2, ToggleLeft, ToggleRight,
} from "lucide-react";
import {
  createPromo, updatePromo, togglePromo, deletePromo,
  type PromoRow, type PromoInput,
} from "@/app/actions/admin/promos";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

const CATEGORIES = ["SEASONAL", "EARLY_BIRD", "FAMILY", "GROUP", "REFERRAL"];

const emptyForm = (): PromoInput => ({
  code: "", type: "PERCENT", value: 0, category: "SEASONAL",
  isActive: true, maxUses: null, validFrom: null, validUntil: null, descriptionEn: null,
});

// ─── Inline form row ──────────────────────────────────────────────────────────

function PromoForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: PromoInput;
  onSave: (v: PromoInput) => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
}) {
  const [f, setF] = useState<PromoInput>(initial);
  const set = <K extends keyof PromoInput>(k: K, v: PromoInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 mt-2">
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

      {/* Code */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Code</label>
          <input className="input w-full font-mono uppercase text-sm" value={f.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="SUMMER25" />
        </div>
        <div>
          <label className="label text-xs">Category</label>
          <select className="input w-full text-sm" value={f.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Type + Value */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Type</label>
          <select className="input w-full text-sm" value={f.type}
            onChange={(e) => set("type", e.target.value as "PERCENT" | "FIXED")}>
            <option value="PERCENT">Percentage (%)</option>
            <option value="FIXED">Fixed (¥)</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Value</label>
          <input className="input w-full text-sm" type="number" min={1}
            max={f.type === "PERCENT" ? 100 : undefined} value={f.value || ""}
            onChange={(e) => set("value", parseInt(e.target.value) || 0)}
            placeholder={f.type === "PERCENT" ? "10" : "1000"} />
        </div>
      </div>

      {/* Max uses + dates */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Max Uses</label>
          <input className="input w-full text-sm" type="number" min={1}
            value={f.maxUses ?? ""} placeholder="Unlimited"
            onChange={(e) => set("maxUses", e.target.value ? parseInt(e.target.value) : null)} />
        </div>
        <div>
          <label className="label text-xs">Valid From</label>
          <input className="input w-full text-sm" type="date"
            value={f.validFrom ?? ""}
            onChange={(e) => set("validFrom", e.target.value || null)} />
        </div>
        <div>
          <label className="label text-xs">Valid Until</label>
          <input className="input w-full text-sm" type="date"
            value={f.validUntil ?? ""}
            onChange={(e) => set("validUntil", e.target.value || null)} />
        </div>
      </div>

      {/* Description + Active */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Description (optional)</label>
          <input className="input w-full text-sm" value={f.descriptionEn ?? ""}
            onChange={(e) => set("descriptionEn", e.target.value || null)}
            placeholder="Summer 2026 discount" />
        </div>
        <div className="flex items-end pb-1">
          <button type="button"
            onClick={() => set("isActive", !f.isActive)}
            className={cn("flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors",
              f.isActive
                ? "bg-teal-50 border-teal-300 text-teal-700"
                : "bg-stone-50 border-stone-200 text-stone-500")}>
            {f.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {f.isActive ? "Active" : "Inactive"}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={() => onSave(f)} disabled={saving || !f.code || !f.value}
          className="btn btn-primary btn-sm flex items-center gap-1">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
        <button onClick={onCancel} className="btn btn-ghost btn-sm flex items-center gap-1">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PromoManager({ initialPromos }: { initialPromos: PromoRow[] }) {
  const router = useRouter();
  const [promos, setPromos] = useState<PromoRow[]>(initialPromos);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();
  const [, start] = useTransition();

  const refresh = () => router.refresh();

  // Create
  const handleCreate = (input: PromoInput) => {
    start(async () => {
      setCreateError(undefined);
      const res = await createPromo(input);
      if ("error" in res) { setCreateError(res.error); return; }
      setShowCreate(false);
      refresh();
      // Optimistic: re-fetch would happen via router.refresh() which triggers RSC reload
    });
  };

  // Update
  const handleUpdate = (id: string, input: PromoInput) => {
    start(async () => {
      setEditError(undefined);
      const res = await updatePromo(id, input);
      if ("error" in res) { setEditError(res.error); return; }
      setEditingId(null);
      refresh();
    });
  };

  // Toggle active
  const handleToggle = (id: string, current: boolean) => {
    start(async () => {
      await togglePromo(id, !current);
      setPromos((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !current } : p));
    });
  };

  // Delete / deactivate
  const handleDelete = (id: string, usedCount: number) => {
    const msg = usedCount > 0
      ? `This code has been used ${usedCount} time(s). It will be deactivated rather than deleted to preserve booking history. Continue?`
      : "Delete this promo code? This cannot be undone.";
    if (!confirm(msg)) return;
    start(async () => {
      await deletePromo(id);
      setPromos((prev) => usedCount > 0
        ? prev.map((p) => p.id === id ? { ...p, isActive: false } : p)
        : prev.filter((p) => p.id !== id)
      );
    });
  };

  return (
    <div>
      {/* Header + create button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-stone-400">{promos.length} code{promos.length !== 1 ? "s" : ""}</p>
        {!showCreate && (
          <button id="create-promo-btn" onClick={() => setShowCreate(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Code
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <PromoForm
          initial={emptyForm()}
          onSave={handleCreate}
          onCancel={() => { setShowCreate(false); setCreateError(undefined); }}
          saving={false}
          error={createError}
        />
      )}

      {/* Promo list */}
      {promos.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">
          No promo codes yet. Click &ldquo;New Code&rdquo; to create one.
        </div>
      ) : (
        <div className="space-y-2 mt-3">
          {promos.map((p) => (
            <div key={p.id}>
              {/* Row */}
              {editingId !== p.id ? (
                <div className={cn(
                  "flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors",
                  p.isActive ? "bg-white border-stone-200" : "bg-stone-50 border-stone-100 opacity-60"
                )}>
                  <div className="flex items-center gap-4 flex-wrap min-w-0">
                    <span className="font-mono font-bold text-stone-900 text-sm">{p.code}</span>
                    <span className={cn("badge text-xs", p.isActive ? "badge-teal" : "badge-gray")}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-stone-600 font-medium">
                      {p.type === "PERCENT" ? `${p.value}%` : `¥${p.value.toLocaleString()}`}
                    </span>
                    <span className="text-xs text-stone-400">{p.category}</span>
                    {p.validUntil && (
                      <span className="text-xs text-stone-400">until {p.validUntil}</span>
                    )}
                    <span className="text-xs text-stone-400">
                      {p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ""} uses
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => handleToggle(p.id, p.isActive)}
                      title={p.isActive ? "Deactivate" : "Activate"}
                      className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                      {p.isActive
                        ? <ToggleRight className="w-4 h-4 text-teal-500" />
                        : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingId(p.id)}
                      title="Edit"
                      className="p-1.5 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id, p.usedCount)}
                      title={p.usedCount > 0 ? "Deactivate (has uses)" : "Delete"}
                      className="p-1.5 rounded hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit form */
                <PromoForm
                  initial={{
                    code: p.code, type: p.type, value: p.value,
                    category: p.category, isActive: p.isActive,
                    maxUses: p.maxUses, validFrom: p.validFrom,
                    validUntil: p.validUntil, descriptionEn: p.descriptionEn,
                  }}
                  onSave={(input) => handleUpdate(p.id, input)}
                  onCancel={() => { setEditingId(null); setEditError(undefined); }}
                  saving={false}
                  error={editError}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
