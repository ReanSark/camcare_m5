// app/api/invoices/[invoiceId]/attachments/[attachmentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { databases, storage, IDHelper } from "@/lib/appwriteServer";
import { DATABASE_ID, FILES_BUCKET_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import type { InvoiceAttachment } from "@/types";

export async function DELETE(req: NextRequest, { params }: { params: { invoiceId: string; attachmentId: string } }) {
  try {
    const { invoiceId, attachmentId } = params;
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || "system";

    const attDoc = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_ATTACHMENTS,
      attachmentId
    );
    const att = attDoc as unknown as InvoiceAttachment;

    if (att.invoiceId !== invoiceId) {
      return NextResponse.json({ error: "Attachment does not belong to invoice" }, { status: 400 });
    }

    // Delete file (ignore if already gone)
    try {
      await storage.deleteFile(FILES_BUCKET_ID, att.fileId);
    } catch {}

    // Delete attachment doc
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_ATTACHMENTS,
      attachmentId
    );

    // Audit
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_AUDIT_LOGS,
      IDHelper.unique(),
      {
        invoiceId,
        action: "delete",
        changedFields: ["attachments"],
        performedBy: userId,
        timestamp: new Date().toISOString(),
        note: `Removed attachment ${attachmentId}`,
      }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Attachment delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
