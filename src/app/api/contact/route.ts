import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyNewInquiry } from "@/lib/services/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10).max(5000),
  locale: z.enum(["en", "ja"]).default("en"),
  activityInterest: z.string().optional(),
  dateInterest: z.string().optional(),
  paxCount: z.number().int().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        subject: parsed.data.subject,
        message: parsed.data.message,
        locale: parsed.data.locale,
        activityInterest: parsed.data.activityInterest,
        dateInterest: parsed.data.dateInterest ? new Date(parsed.data.dateInterest) : null,
        paxCount: parsed.data.paxCount,
      },
    });

    // Notify admin
    notifyNewInquiry(
      parsed.data.name,
      parsed.data.email,
      parsed.data.message,
      submission.id
    ).catch(console.error);

    return NextResponse.json({ success: true, id: submission.id });
  } catch (err) {
    console.error("[/api/contact]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
