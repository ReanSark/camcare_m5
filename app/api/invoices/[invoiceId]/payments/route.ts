import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { databases, IDHelper } from "@/lib/appwriteServer";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import { getSettings } from "@/lib/settings";
import type {
  Invoice,
  InvoicePayment,
  PaymentMethod,
  Settings,
  InvoicePaymentStatus,
} from "@/types";

type Body = {
  userId: string;
  type: "payment" | "refund";
  amount: number;
  method: PaymentMethod;
  paidAt?: string; // ISO
  note?: string;
  currency?: string;
};

function derivePaymentStatus(
  payments: ReadonlyArray<InvoicePayment>,
  total: number,
  settings: Settings
): InvoicePaymentStatus {
  const paid = payments.filter(p => p.type === "payment").reduce((s, p) => s + (p.amount || 0), 0);
  const refunded = payments.filter(p => p.type === "refund").reduce((s, p) => s + (p.amount || 0), 0);

  if (settings.refundStatusPolicy === "anyRefund" && refunded > 0) return "refunded";
  if (settings.refundStatusPolicy === "netNegative" && paid - refunded < 0) return "refunded";

  const net = paid - refunded;
  if (net <= 0) return "unpaid";
  if (net < total) return "partial";
  return "paid";
}

export async function POST(req: NextRequest, { params }: { params: { invoiceId: string } }) {
  try {
    const { invoiceId } = params;
    const body = (await req.json()) as Body;

    // Basic validations
    if (!body?.userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    if (body.type !== "payment" && body.type !== "refund") {
      return NextResponse.json({ error: "type must be 'payment' or 'refund'" }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!(amount > 0)) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });

    // Load invoice + settings
    const invDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);
    const invoice = invDoc as unknown as Invoice;

    if (invoice.docStatus !== "final") {
      return NextResponse.json({ error: "Only FINAL invoices can accept payments/refunds." }, { status: 400 });
    }

    const settings = await getSettings();

    // Create payment/refund
    const paidAtISO = body.paidAt ? new Date(body.paidAt).toISOString() : new Date().toISOString();
    const currency = body.currency || invoice.currency || settings.baseCurrency || "KHR";

    const payDoc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_PAYMENTS,
      IDHelper.unique(),
      {
        invoiceId,
        type: body.type,
        amount,
        currency,
        method: body.method,
        paidAt: paidAtISO,
        note: body.note ?? "",
      }
    );

    // Recompute payment status
    const list = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_PAYMENTS, [
      Query.equal("invoiceId", [invoiceId]),
      Query.limit(200),
    ]);
    const payments = (list.documents as unknown as InvoicePayment[]) || [];

    const total = invoice.totalAmount ?? 0;
    const paymentStatus = derivePaymentStatus(payments, total, settings);
    const refundedAmount = payments
      .filter(p => p.type === "refund")
      .reduce((s, p) => s + (p.amount || 0), 0);

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, {
      paymentStatus,
      refundedAmount,
    });

    // Audit
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_AUDIT_LOGS,
      IDHelper.unique(),
      {
        invoiceId,
        action: body.type === "payment" ? "add-payment" : "refund",
        changedFields: ["payments", "paymentStatus", "refundedAmount"],
        performedBy: body.userId,
        timestamp: paidAtISO,
        note: body.note ?? "",
      }
    );

    return NextResponse.json({
      ok: true,
      paymentId: (payDoc as { $id: string }).$id,
      paymentStatus,
      refundedAmount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create payment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
