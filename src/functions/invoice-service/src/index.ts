import { Databases, Query } from "node-appwrite";
import { getServerClient, COL, DB_ID } from "../shared/appwrite";
import { nextNumber } from "../shared/numbering";
import { calcInvoiceTotals, roundCurrency } from "../shared/money";
import type { Invoice, Settings } from "../shared/types";
import { writeInvoiceAudit } from "../shared/audit";

/** ---- Minimal types to avoid `any` ---- */
interface HeadersLike {
  get(name: string): string | null;
}
interface RequestLike {
  json(): Promise<unknown>;
  headers: HeadersLike;
}
interface ResponseLike {
  json(body: unknown, status?: number): void;
}
interface FnContext {
  req: RequestLike;
  res: ResponseLike;
}

type InvoiceDoc = Invoice & { $id: string };
type ListResult<T> = { documents: T[] };

/** Helpers */
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isType = (doc: unknown, type: "payment" | "refund"): boolean =>
  (doc as { type?: unknown }).type === type;
const amt = (doc: unknown): number => num((doc as { amount?: unknown }).amount);

/** Compute totals and persist on the invoice (no `any`) */
async function computeAndPersistTotals(
  databases: Databases,
  invoice: InvoiceDoc,
  settings: Settings,
  actorId: string
): Promise<void> {
  // Load items
  const itemsList = (await databases.listDocuments(
    DB_ID,
    COL.InvoiceItems,
    [Query.equal("invoiceId", [invoice.$id]), Query.limit(200)]
  )) as unknown as ListResult<Record<string, unknown>>;

  const items = itemsList.documents.map((d) => ({
    price: num(d.price),
    unit: num(d.unit),
    discount: num(d.discount),
    taxable: d.taxable !== false,
  }));

  // Totals
  const totals = calcInvoiceTotals(items, settings);
  const currency = invoice.currency || settings.baseCurrency;
  const totalRounded = roundCurrency(totals.total, currency, settings);

  // Payments aggregation
  const pays = (await databases.listDocuments(
    DB_ID,
    COL.InvoicePayments,
    [Query.equal("invoiceId", [invoice.$id]), Query.limit(200)]
  )) as unknown as ListResult<unknown>;

  const docs = pays.documents as unknown[];
  const paid = docs
    .filter((d) => isType(d, "payment"))
    .map((d) => amt(d))
    .reduce((acc: number, n: number) => acc + n, 0);
  const refunds = docs
    .filter((d) => isType(d, "refund"))
    .map((d) => amt(d))
    .reduce((acc: number, n: number) => acc + n, 0);
  const amountPaid = paid - refunds;
  const amountDue = Math.max(totalRounded - amountPaid, 0);
  const paymentStatus = amountPaid <= 0 ? "unpaid" : amountDue > 0 ? "partial" : "paid";

  // Persist invoice fields
  await databases.updateDocument(DB_ID, COL.Invoices, invoice.$id, {
    totalAmount: totalRounded,
    taxAmount: totals.taxAmount,
    serviceChargeAmount: totals.serviceChargeAmount,
    amountPaid,
    amountDue,
    paymentStatus,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  });

  await writeInvoiceAudit(
    databases,
    invoice.$id,
    actorId,
    "update",
    ["totalAmount", "taxAmount", "serviceChargeAmount", "amountPaid", "amountDue", "paymentStatus"]
  );
}

export default async function main(ctx: FnContext) {
  const { databases } = getServerClient();

  const raw = await ctx.req.json();
  const { op, invoiceId } = (raw ?? {}) as { op?: string; invoiceId?: string };
  const actorId = ctx.req.headers.get("x-user-id") ?? "system";

  if (op !== "finalizeInvoice") return ctx.res.json({ error: "Unsupported op" }, 400);
  if (!invoiceId) return ctx.res.json({ error: "invoiceId required" }, 400);

  // Load invoice + settings
  const invDoc = (await databases.getDocument(
    DB_ID,
    COL.Invoices,
    invoiceId
  )) as unknown as InvoiceDoc;

  const settingsList = (await databases.listDocuments(
    DB_ID,
    COL.Settings,
    [Query.limit(1)]
  )) as unknown as ListResult<unknown>;

  const settings = settingsList.documents[0] as Settings;
  if (!settings) return ctx.res.json({ error: "Settings not found" }, 500);

  // Idempotency: if already final, recompute only
  if (invDoc.docStatus === "final") {
    await computeAndPersistTotals(databases, invDoc, settings, actorId);
    return ctx.res.json({ ok: true, idempotent: true }, 200);
  }

  // Assign invoice number if needed
  if (settings.assignInvoiceNoOn === "finalize") {
    const seq = await nextNumber(databases, settings, "invoice");
    await databases.updateDocument(DB_ID, COL.Invoices, invDoc.$id, { invoiceNo: seq.number });
  }

  // Compute totals and finalize
  await computeAndPersistTotals(databases, invDoc, settings, actorId);

  await databases.updateDocument(DB_ID, COL.Invoices, invDoc.$id, {
    docStatus: "final",
    finalizedAt: new Date().toISOString(),
    finalizedBy: actorId,
  });

  await writeInvoiceAudit(databases, invDoc.$id, actorId, "update", ["docStatus", "finalizedAt", "finalizedBy"]);

  return ctx.res.json({ ok: true }, 200);
}
