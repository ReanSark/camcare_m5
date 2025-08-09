// app/api/invoices/[invoiceId]/attachments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { databases, storage, IDHelper } from "@/lib/appwriteServer";
import { DATABASE_ID, FILES_BUCKET_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = params;

    // Ensure invoice exists
    await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);

    const form = await req.formData();
    const file = form.get("file") as globalThis.File | null;
    const userId = form.get("userId") as string | null;
    const fileType = form.get("fileType") as string | null; // "payment-proof" | "external-receipt" | "other"
    const note = (form.get("note") as string | null) ?? "";

    if (!file || !userId || !fileType) {
      return NextResponse.json({ error: "file, userId, and fileType are required" }, { status: 400 });
    }

    // Upload to Storage (pass Web File directly)
    const uploaded = await storage.createFile(
      FILES_BUCKET_ID,
      IDHelper.unique(),
      file
    );

    // Create attachment doc
    const att = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_ATTACHMENTS,
      IDHelper.unique(),
      {
        invoiceId,
        fileId: uploaded.$id,
        fileType,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        note,
      }
    );

    // Audit
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_AUDIT_LOGS,
      IDHelper.unique(),
      {
        invoiceId,
        action: "create",
        changedFields: ["attachments"],
        performedBy: userId,
        timestamp: new Date().toISOString(),
        note: `Added ${fileType}${note ? `: ${note}` : ""}`,
      }
    );

    return NextResponse.json({ ok: true, attachmentId: att.$id, fileId: uploaded.$id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Attachment upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
