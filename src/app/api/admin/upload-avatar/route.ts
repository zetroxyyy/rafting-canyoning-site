/**
 * POST /api/admin/upload-avatar
 *
 * Accepts a multipart/form-data upload with a single `file` field.
 * Validates the session, resizes nothing (raw upload), and stores
 * the image in the public `cms-media` Supabase Storage bucket under
 * the `avatars/` prefix.
 *
 * Returns: { url: string }
 *
 * Used by the Admin Reviews page to attach a profile picture to a
 * Testimonial row (saved as `avatarUrl` in the Prisma model).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadCmsImage } from "@/lib/storage";

// Allowed MIME types for avatar images
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth guard
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, or GIF.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 4 MB." },
        { status: 400 }
      );
    }

    // Convert File → Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build a unique storage path
    const ext  = file.name.split(".").pop() ?? "jpg";
    const id   = crypto.randomUUID();
    const path = `avatars/${id}.${ext}`;

    const publicUrl = await uploadCmsImage(path, buffer, file.type);

    if (!publicUrl) {
      return NextResponse.json(
        { error: "Upload failed — Supabase Storage not configured." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload-avatar] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
