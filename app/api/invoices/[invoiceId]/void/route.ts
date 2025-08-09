// app/api/invoices/[invoiceId]/void/route.ts
import { NextRequest, NextResponse } from "next/server";
import { databases, IDHelper } from "@/lib/appwriteServer";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import type { Invoice } from "@/types";

type Body = { userId: string; reason?: string };

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = params;
    const body = (await req.json()) as Body;
    if (!body?.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const invDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);
    const inv = invDoc as unknown as Invoice;

    if (inv.docStatus === "void") {
      return NextResponse.json({ error: "Invoice already void." }, { status: 400 });
    }
    if (inv.docStatus !== "final") {
      return NextResponse.json({ error: "Only FINAL invoices can be voided." }, { status: 400 });
    }

    const now = new Date().toISOString();

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, {
      docStatus: "void",
    });

    await databases.createDocument(DATABASE_ID, COLLECTIONS.INVOICE_AUDIT_LOGS, IDHelper.unique(), {
      invoiceId,
      action: "void",
      changedFields: ["docStatus"],
      performedBy: body.userId,
      timestamp: now,
      note: body.reason ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Void failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
