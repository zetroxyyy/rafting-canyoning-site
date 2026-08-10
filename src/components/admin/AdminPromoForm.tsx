"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminPromoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    code: "",
    type: "PERCENT",
    value: "",
    category: "SEASONAL",
    maxUses: "",
    validFrom: "",
    validUntil: "",
    descriptionEn: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase().trim(),
          type: form.type,
          value: parseInt(form.value),
          category: form.category,
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
          descriptionEn: form.descriptionEn || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(`Promo code "${form.code.toUpperCase()}" created!`);
      setForm({ code: "", type: "PERCENT", value: "", category: "SEASONAL", maxUses: "", validFrom: "", validUntil: "", descriptionEn: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
      {success && <p className="text-sm text-teal-600 bg-teal-50 p-2 rounded">{success}</p>}

      <div>
        <label className="label">Code</label>
        <input className="input w-full font-mono uppercase" value={form.code}
          onChange={e => set("code", e.target.value)} required placeholder="SUMMER25" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Type</label>
          <select className="input w-full" value={form.type} onChange={e => set("type", e.target.value)}>
            <option value="PERCENT">Percentage (%)</option>
            <option value="FIXED">Fixed (¥)</option>
          </select>
        </div>
        <div>
          <label className="label">Value</label>
          <input className="input w-full" type="number" value={form.value}
            onChange={e => set("value", e.target.value)} required
            placeholder={form.type === "PERCENT" ? "10" : "1000"} />
        </div>
      </div>

      <div>
        <label className="label">Category</label>
        <select className="input w-full" value={form.category} onChange={e => set("category", e.target.value)}>
          {["SEASONAL", "EARLY_BIRD", "FAMILY", "GROUP", "REFERRAL"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Max Uses (optional)</label>
        <input className="input w-full" type="number" value={form.maxUses}
          onChange={e => set("maxUses", e.target.value)} placeholder="Unlimited" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Valid From</label>
          <input className="input w-full" type="date" value={form.validFrom}
            onChange={e => set("validFrom", e.target.value)} />
        </div>
        <div>
          <label className="label">Valid Until</label>
          <input className="input w-full" type="date" value={form.validUntil}
            onChange={e => set("validUntil", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Description (EN, optional)</label>
        <input className="input w-full" value={form.descriptionEn}
          onChange={e => set("descriptionEn", e.target.value)} placeholder="Summer 2026 discount" />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary w-full cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Promo Code"}
      </button>
    </form>
  );
}
