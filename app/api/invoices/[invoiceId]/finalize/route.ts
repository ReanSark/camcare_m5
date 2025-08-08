// app/api/invoices/[invoiceId]/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { databases, IDHelper } from "@/lib/appwriteServer";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import { getSettings } from "@/lib/settings";
import { computeTotals } from "@/lib/totals";
import { getNextInvoiceNo } from "@/lib/sequences";
import type {
  Invoice,
  InvoiceItem,
  InvoicePayment,
  Settings,
  InvoicePaymentStatus,
} from "@/types";

function derivePaymentStatus(
  payments: ReadonlyArray<InvoicePayment>,
  total: number,
  settings: Settings
): InvoicePaymentStatus {
  const paid = payments.filter(p => p.type === "payment").reduce((s, p) => s + (p.amount || 0), 0);
  const refunded = payments.filter(p => p.type === "refund").reduce((s, p) => s + (p.amount || 0), 0);
  if (settings.refundStatusPolicy === "anyRefund" && refunded > 0) return "refunded";
  const net = paid - refunded;
  if (net <= 0) return "unpaid";
  if (net < total) return "partial";
  return "paid";
}

export async function POST(_req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = params;
    const settings = await getSettings();

    // 1) Load invoice
    const invDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);
    const inv = invDoc as unknown as Invoice;
    if (inv.docStatus && inv.docStatus !== "draft") {
      return NextResponse.json({ error: "Only draft invoices can be finalized." }, { status: 400 });
    }

    // 2) Load items for invoice
    const itemsList = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [
      Query.equal("invoiceId", [invoiceId]),
    ]);
    const items = (itemsList.documents as unknown as InvoiceItem[]).map((i) => ({
      ...i,
      unit: i.unit ?? 1,
      price: i.price ?? 0,
      discount: i.discount ?? 0,
      taxable: i.taxable !== false,
    }));

    // 3) Compute totals
    const currency = inv.currency || settings.baseCurrency || "KHR";
    const totals = computeTotals({
      items,
      invoiceDiscount: inv.discount ?? 0,
      taxRate: inv.taxRate ?? settings.taxRate ?? 0,
      serviceChargeRate: inv.serviceChargeRate ?? settings.serviceChargeRate ?? 0,
      settings,
      currency,
    });

    // 4) Generate invoice number
    if ((settings.assignInvoiceNoOn ?? "finalize") !== "finalize") {
      return NextResponse.json({ error: "Settings assignInvoiceNoOn must be 'finalize'." }, { status: 400 });
    }
    const invoiceNo = await getNextInvoiceNo(settings, new Date());

    // 5) Payments so far (to derive status)
    const paysList = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_PAYMENTS, [
      Query.equal("invoiceId", [invoiceId]),
    ]);
    const payments = paysList.documents as unknown as InvoicePayment[];
    const paymentStatus = derivePaymentStatus(payments, totals.totalAmount, settings);

    // 6) Update invoice
    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, {
      invoiceNo,
      currency,
      taxAmount: totals.taxAmount,
      serviceChargeAmount: totals.serviceChargeAmount,
      totalAmount: totals.totalAmount,
      docStatus: "final",
      paymentStatus,
    });

    // 7) Audit log
    await databases.createDocument(DATABASE_ID, COLLECTIONS.INVOICE_AUDIT_LOGS, IDHelper.unique(), {
      invoiceId,
      action: "update",
      changedFields: ["invoiceNo", "totalAmount", "taxAmount", "serviceChargeAmount", "docStatus", "paymentStatus"],
      performedBy: "system",
      timestamp: new Date().toISOString(),
      note: "Finalize invoice",
    });

    return NextResponse.json({
      ok: true,
      invoiceNo,
      totals,
      paymentStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Finalize failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
