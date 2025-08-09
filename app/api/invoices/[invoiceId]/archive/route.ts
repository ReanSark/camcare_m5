// app/api/invoices/[invoiceId]/archive/route.ts
import { NextRequest, NextResponse } from "next/server";
import { databases, IDHelper } from "@/lib/appwriteServer";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";

type Body = { userId: string; archived: boolean; reason?: string };

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = params;
    const body = (await req.json()) as Body;
    if (!body?.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const now = new Date().toISOString();

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, {
      isArchived: !!body.archived,
    });

    await databases.createDocument(DATABASE_ID, COLLECTIONS.INVOICE_AUDIT_LOGS, IDHelper.unique(), {
      invoiceId,
      action: "update",
      changedFields: ["isArchived"],
      performedBy: body.userId,
      timestamp: now,
      note: body.archived ? `Archived${body.reason ? `: ${body.reason}` : ""}` : `Unarchived${body.reason ? `: ${body.reason}` : ""}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Archive toggle failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
