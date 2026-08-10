/**
 * Supabase Storage client singleton.
 * Uses the service role key to bypass RLS for server-side uploads.
 *
 * Buckets:
 *   pdfs        — booking/manifest PDF documents
 *   cms-media   — CMS images (testimonial avatars, blog images, etc.)
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL        ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY       ?? "";

let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin(): ReturnType<typeof createClient> | null {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseAdminInstance;
}

// ─── Bucket names ──────────────────────────────────────────────────────────────

export const PDF_BUCKET       = "pdfs";
export const CMS_MEDIA_BUCKET = "cms-media";

// ─── PDF uploads ──────────────────────────────────────────────────────────────

/**
 * Upload a PDF buffer to Supabase Storage.
 * Returns the public URL and the storage path.
 */
export async function uploadPdf(
  path: string,
  buffer: Buffer
): Promise<{ url: string; path: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn("[Storage] Supabase not configured — skipping PDF upload");
    return { url: "", path };
  }

  const { error } = await admin.storage
    .from(PDF_BUCKET)
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(`[Storage] Upload failed: ${error.message}`);
  }

  const { data: publicUrl } = admin.storage
    .from(PDF_BUCKET)
    .getPublicUrl(path);

  return { url: publicUrl.publicUrl, path };
}

/**
 * Get a signed download URL for a PDF (valid for 1 hour).
 */
export async function getPdfSignedUrl(path: string): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin || !path) return "";

  const { data, error } = await admin.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data) return "";
  return data.signedUrl;
}

// ─── CMS Media uploads ────────────────────────────────────────────────────────

/**
 * Upload an image buffer to the `cms-media` Supabase Storage bucket.
 *
 * `path` should be a unique storage path, e.g. `avatars/<cuid>.webp`.
 * The bucket must be set to **public** in Supabase so the returned
 * URL is directly accessible without authentication.
 *
 * Returns the public URL string.
 */
export async function uploadCmsImage(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.warn("[Storage] Supabase not configured — skipping CMS image upload");
    return "";
  }

  const { error } = await admin.storage
    .from(CMS_MEDIA_BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`[Storage:cms-media] Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = admin.storage
    .from(CMS_MEDIA_BUCKET)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}
