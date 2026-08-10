"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

export interface TestimonialInput {
  authorName:    string;
  authorCountry: string | null;
  avatarUrl:     string | null;
  rating:        number;
  bodyEn:        string;
  bodyJa:        string | null;
  isPublished:   boolean;
}

function revalidate() {
  revalidatePath("/admin/reviews");
  revalidatePath("/en");
  revalidatePath("/");
}

export async function getTestimonials() {
  return prisma.testimonial.findMany({
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "desc" }
    ],
  });
}

export async function createTestimonial(
  input: TestimonialInput
): Promise<{ success: true; id: string } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  if (!input.authorName.trim()) return { error: "Guest name is required." };
  if (!input.bodyEn.trim()) return { error: "English review text is required." };
  if (input.rating < 1 || input.rating > 5) return { error: "Rating must be between 1 and 5." };

  try {
    const testimonial = await prisma.testimonial.create({
      data: {
        authorName:    input.authorName.trim(),
        authorCountry: input.authorCountry?.trim() || null,
        avatarUrl:     input.avatarUrl?.trim() || null,
        rating:        input.rating,
        bodyEn:        input.bodyEn.trim(),
        bodyJa:        input.bodyJa?.trim() || null,
        isPublished:   input.isPublished,
      },
    });

    revalidate();
    return { success: true, id: testimonial.id };
  } catch (err) {
    console.error("[createTestimonial]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

export async function updateTestimonial(
  id: string,
  input: Partial<TestimonialInput>
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  if (input.authorName !== undefined && !input.authorName.trim()) {
    return { error: "Guest name is required." };
  }
  if (input.bodyEn !== undefined && !input.bodyEn.trim()) {
    return { error: "English review text is required." };
  }
  if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
    return { error: "Rating must be between 1 and 5." };
  }

  try {
    const data: Record<string, unknown> = {};
    if (input.authorName    !== undefined) data.authorName    = input.authorName.trim();
    if (input.authorCountry !== undefined) data.authorCountry = input.authorCountry?.trim() || null;
    if (input.avatarUrl     !== undefined) data.avatarUrl     = input.avatarUrl?.trim() || null;
    if (input.rating        !== undefined) data.rating        = input.rating;
    if (input.bodyEn        !== undefined) data.bodyEn        = input.bodyEn.trim();
    if (input.bodyJa        !== undefined) data.bodyJa        = input.bodyJa?.trim() || null;
    if (input.isPublished   !== undefined) data.isPublished   = input.isPublished;

    await prisma.testimonial.update({
      where: { id },
      data,
    });

    revalidate();
    return { success: true };
  } catch (err) {
    console.error("[updateTestimonial]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

export async function toggleTestimonialPublish(
  id: string,
  isPublished: boolean
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await prisma.testimonial.update({
      where: { id },
      data: { isPublished },
    });

    revalidate();
    return { success: true };
  } catch (err) {
    console.error("[toggleTestimonialPublish]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}

export async function deleteTestimonial(
  id: string
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await prisma.testimonial.delete({
      where: { id },
    });

    revalidate();
    return { success: true };
  } catch (err) {
    console.error("[deleteTestimonial]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}
