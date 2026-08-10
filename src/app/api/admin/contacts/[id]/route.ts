/**
 * PATCH /api/admin/contacts/[id]
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  await prisma.contactSubmission.update({
    where: { id },
    data: {
      ...(body.isRead !== undefined && { isRead: body.isRead }),
      ...(body.isReplied !== undefined && { isReplied: body.isReplied }),
      ...(body.adminNote !== undefined && { adminNote: body.adminNote }),
    },
  });

  return NextResponse.json({ success: true });
}
