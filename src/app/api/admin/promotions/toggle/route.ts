import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("id") as string;

    if (id) {
      // 1. Look up the REAL current status directly in the database
      const existingPromo = await prisma.promotion.findUnique({
        where: { id },
      });

      if (existingPromo) {
        // 2. Flip whatever the database says it currently is
        await prisma.promotion.update({
          where: { id },
          data: { isActive: !existingPromo.isActive },
        });

        // 3. Clear the Next.js cache so the UI updates instantly
        revalidatePath("/admin/promotions");
      }
    }

    // 4. Send the user right back to the page
    return NextResponse.redirect(new URL("/admin/promotions", req.url));
  } catch (error) {
    console.error("Failed to toggle promo:", error);
    return NextResponse.redirect(new URL("/admin/promotions?error=true", req.url));
  }
}