"use client";

/**
 * Admin Reviews Page
 *
 * Manages Prisma `Testimonial` records shown on the public homepage.
 * Features:
 *  - Create / Edit / Delete testimonials
 *  - Avatar image upload → Supabase `cms-media` bucket → stored as `avatarUrl`
 *  - Live avatar preview before save
 *  - Bilingual EN + JA review text
 *  - Publish / Draft toggle
 *  - Table with avatar thumbnail, star rating, preview text, status
 */

import { useState, useEffect, useTransition, useRef } from "react";
import Image from "next/image";
import {
  Star, Plus, Trash2, Edit2, Loader2, CheckCircle2, AlertTriangle,
  ToggleLeft, ToggleRight, X, MessageSquare, Upload, UserCircle2,
} from "lucide-react";
import {
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialPublish,
  type TestimonialInput,
} from "@/app/actions/admin/reviews";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TestimonialRow {
  id:            string;
  authorName:    string;
  authorCountry: string | null;
  avatarUrl:     string | null;
  rating:        number;
  bodyEn:        string;
  bodyJa:        string | null;
  isPublished:   boolean;
  sortOrder:     number;
  createdAt:     Date;
}

// ─── Avatar Upload Helpers ─────────────────────────────────────────────────────

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload-avatar", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.url as string;
}

// ─── AvatarField sub-component ────────────────────────────────────────────────

interface AvatarFieldProps {
  previewUrl:    string;          // current live preview URL (empty = none)
  onUrlChange:   (url: string) => void;
  disabled?:     boolean;
}

function AvatarField({ previewUrl, onUrlChange, disabled }: AvatarFieldProps) {
  const inputRef           = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Invalid file type. Use JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("File too large (max 4 MB).");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      onUrlChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      // Reset the input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
        Profile Picture (Optional)
      </label>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-stone-200 bg-stone-100 flex items-center justify-center flex-shrink-0">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Avatar preview"
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <UserCircle2 className="w-8 h-8 text-stone-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="btn btn-outline btn-sm flex items-center gap-1.5 text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              {previewUrl ? "Replace Photo" : "Upload Photo"}
            </button>
            {previewUrl && (
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onUrlChange("")}
                className="btn btn-sm text-xs text-stone-400 hover:text-red-500 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            JPEG, PNG, WebP, or GIF — max 4 MB
          </p>
          {error && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Upload avatar image"
      />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminReviewsPage() {
  const [reviews, setReviews]   = useState<TestimonialRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isPending, startTransition] = useTransition();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [formOpen,      setFormOpen]      = useState(false);
  const [editingId,     setEditingId]     = useState<string | null>(null);
  const [authorName,    setAuthorName]    = useState("");
  const [authorCountry, setAuthorCountry] = useState("");
  const [avatarUrl,     setAvatarUrl]     = useState("");
  const [rating,        setRating]        = useState(5);
  const [bodyEn,        setBodyEn]        = useState("");
  const [bodyJa,        setBodyJa]        = useState("");
  const [isPublished,   setIsPublished]   = useState(true);

  // ── Status banners ──────────────────────────────────────────────────────────
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ─── Data fetch ────────────────────────────────────────────────────────────

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await getTestimonials();
      setReviews(data as unknown as TestimonialRow[]);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setEditingId(null);
    setAuthorName("");
    setAuthorCountry("");
    setAvatarUrl("");
    setRating(5);
    setBodyEn("");
    setBodyJa("");
    setIsPublished(true);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleOpenEdit = (rev: TestimonialRow) => {
    setEditingId(rev.id);
    setAuthorName(rev.authorName);
    setAuthorCountry(rev.authorCountry || "");
    setAvatarUrl(rev.avatarUrl || "");
    setRating(rev.rating);
    setBodyEn(rev.bodyEn);
    setBodyJa(rev.bodyJa || "");
    setIsPublished(rev.isPublished);
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingId(null);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!authorName.trim()) {
      setErrorMsg("Guest name is required.");
      return;
    }
    if (!bodyEn.trim()) {
      setErrorMsg("English review text is required.");
      return;
    }

    const payload: TestimonialInput = {
      authorName:    authorName.trim(),
      authorCountry: authorCountry.trim() || null,
      avatarUrl:     avatarUrl.trim() || null,
      rating,
      bodyEn:        bodyEn.trim(),
      bodyJa:        bodyJa.trim() || null,
      isPublished,
    };

    startTransition(async () => {
      const res = editingId
        ? await updateTestimonial(editingId, payload)
        : await createTestimonial(payload);

      if (res && "error" in res) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(editingId ? "Review updated successfully!" : "Review created successfully!");
        setFormOpen(false);
        fetchReviews();
      }
    });
  };

  // ─── Publish toggle ────────────────────────────────────────────────────────

  const handleTogglePublish = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await toggleTestimonialPublish(id, !currentStatus);
      if (res && "error" in res) {
        setErrorMsg(res.error);
      } else {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isPublished: !currentStatus } : r))
        );
      }
    });
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) return;

    startTransition(async () => {
      const res = await deleteTestimonial(id);
      if (res && "error" in res) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Review deleted successfully.");
        fetchReviews();
      }
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Customer Reviews
          </h2>
          <p className="text-sm text-stone-500 mt-0.5 font-medium">
            Manage customer testimonials shown on the public homepage.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary btn-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Review
        </button>
      </div>

      {/* ── Success / Error Banners ─────────────────────────────────────────── */}
      {successMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Create / Edit Form ──────────────────────────────────────────────── */}
      {formOpen && (
        <div className="card p-6 border border-teal-100 shadow-sm relative animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Close button */}
          <button
            onClick={handleCloseForm}
            className="absolute right-4 top-4 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            aria-label="Close form"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-sm font-semibold text-stone-900 mb-5">
            {editingId ? "Edit Customer Review" : "Add New Customer Review"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Avatar upload ─────────────────────────────────────────── */}
            <AvatarField
              previewUrl={avatarUrl}
              onUrlChange={setAvatarUrl}
              disabled={isPending}
            />

            <div className="border-t border-stone-100 pt-5" />

            {/* ── Name / Country / Rating ──────────────────────────────── */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. Sarah M."
                  className="input w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Country / Origin (Optional)
                </label>
                <input
                  type="text"
                  value={authorCountry}
                  onChange={(e) => setAuthorCountry(e.target.value)}
                  placeholder="e.g. Australia or 東京"
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                  Rating
                </label>
                {/* Interactive star rating picker */}
                <div className="flex gap-1 items-center h-10">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      className="p-0.5 focus:outline-none"
                    >
                      <Star
                        className={cn(
                          "w-6 h-6 transition-colors",
                          n <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-stone-200 hover:text-amber-200"
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-stone-500 font-medium">
                    {rating}/5
                  </span>
                </div>
              </div>
            </div>

            {/* ── English review text ──────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                English Review Text
              </label>
              <textarea
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                placeholder="Write the English testimonial here..."
                rows={3}
                className="input w-full text-sm"
                required
              />
            </div>

            {/* ── Japanese review text ─────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                Japanese Review Text (Optional)
              </label>
              <textarea
                value={bodyJa}
                onChange={(e) => setBodyJa(e.target.value)}
                placeholder="日本語のレビューを入力してください（任意）..."
                rows={3}
                className="input w-full text-sm"
              />
            </div>

            {/* ── Actions row ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              {/* Publish toggle */}
              <button
                type="button"
                onClick={() => setIsPublished((p) => !p)}
                className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-800"
              >
                {isPublished ? (
                  <ToggleRight className="w-5 h-5 text-teal-600" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-stone-400" />
                )}
                {isPublished ? "Published" : "Draft"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary btn-sm"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  {editingId ? "Save Changes" : "Create Review"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Reviews Table ───────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-stone-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            <p className="text-xs font-semibold uppercase tracking-wider">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 px-4">
            <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h4 className="font-semibold text-stone-900">No reviews found</h4>
            <p className="text-stone-400 text-xs mt-1 max-w-sm mx-auto">
              Add your first review manually using the button above to display customer testimonials on the homepage.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="admin-table" style={{ minWidth: "850px" }}>
              <thead>
                <tr>
                  <th className="w-14 whitespace-nowrap">Avatar</th>
                  <th className="whitespace-nowrap">Guest</th>
                  <th className="whitespace-nowrap">Origin</th>
                  <th className="whitespace-nowrap">Rating</th>
                  <th className="whitespace-nowrap">Review (EN)</th>
                  <th className="whitespace-nowrap">Review (JA)</th>
                  <th className="whitespace-nowrap">Status</th>
                  <th className="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => (
                  <tr key={rev.id}>

                    {/* Avatar thumbnail */}
                    <td className="whitespace-nowrap">
                      {rev.avatarUrl ? (
                        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-stone-200 flex-shrink-0">
                          <Image
                            src={rev.avatarUrl}
                            alt={rev.authorName}
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
                          title="No avatar uploaded"
                        >
                          {rev.authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="whitespace-nowrap">
                      <span className="font-semibold text-stone-900 text-sm">
                        {rev.authorName}
                      </span>
                    </td>

                    {/* Country */}
                    <td className="text-xs text-stone-500 whitespace-nowrap">
                      {rev.authorCountry || "—"}
                    </td>

                    {/* Stars */}
                    <td className="whitespace-nowrap">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3.5 h-3.5",
                              i < rev.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-stone-200"
                            )}
                          />
                        ))}
                      </div>
                    </td>

                    {/* EN preview */}
                    <td className="text-xs text-stone-600 max-w-[200px] truncate whitespace-nowrap">
                      {rev.bodyEn}
                    </td>

                    {/* JA preview */}
                    <td className="text-xs text-stone-400 max-w-[200px] truncate italic whitespace-nowrap">
                      {rev.bodyJa || "—"}
                    </td>

                    {/* Publish badge */}
                    <td className="whitespace-nowrap">
                      <button
                        onClick={() => handleTogglePublish(rev.id, rev.isPublished)}
                        disabled={isPending}
                        className={cn(
                          "badge text-xs transition-all border",
                          rev.isPublished
                            ? "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
                            : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                        )}
                        title={rev.isPublished ? "Click to unpublish" : "Click to publish"}
                      >
                        {rev.isPublished ? "Published" : "Draft"}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(rev)}
                          className="p-1 rounded text-stone-400 hover:text-teal-600 hover:bg-stone-50 transition-all"
                          title="Edit review"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rev.id)}
                          className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-stone-50 transition-all"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
