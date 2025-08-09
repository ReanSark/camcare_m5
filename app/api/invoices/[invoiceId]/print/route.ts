// app/api/invoices/[invoiceId]/print/route.ts
import { NextRequest, NextResponse } from "next/server";
import { databases, IDHelper } from "@/lib/appwriteServer";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import type { Invoice } from "@/types";

type Body = { userId: string; userName?: string | null; note?: string };

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = params;
    const body = (await req.json()) as Body;
    if (!body?.userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // load to ensure exists
    const invDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);
    const inv = invDoc as unknown as Invoice;

    const printedAt = new Date().toISOString();

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, {
      printedBy: body.userId,
      printedByName: body.userName ?? null,
      printedAt,
    });

    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_AUDIT_LOGS,
      IDHelper.unique(),
      {
        invoiceId,
        action: "print",
        changedFields: ["printedBy", "printedAt"],
        performedBy: body.userId,
        timestamp: printedAt,
        note: body.note ?? `Printed invoice by ${body.userName ?? body.userId}`,
      }
    );

    return NextResponse.json({ ok: true, printedAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Print stamp failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
