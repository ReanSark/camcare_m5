import { Databases, ID, Query, Models } from "node-appwrite";
import { getServerClient, COL, DB_ID } from "../shared/appwrite";
import { writeInvoiceAudit } from "../shared/audit";
import type { Settings, Invoice } from "../shared/types";

/** ---- Minimal context types (no `any`) ---- */
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

/** Narrowed docs */
type InvoiceDoc = Invoice & Models.Document;
type ListResult<T> = { documents: T[] };

/** Helpers */
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isType = (doc: unknown, type: "payment" | "refund"): boolean =>
  (doc as { type?: unknown }).type === type;
const amt = (doc: unknown): number => num((doc as { amount?: unknown }).amount);

export default async function main(ctx: FnContext) {
  const { databases } = getServerClient();
  const raw = await ctx.req.json();

  const {
    op,
    invoiceId,
    method,
    amount,
    cashSessionId,
    currency,
    fxRateToBase,
    receivedFrom,
    note
  } = (raw ?? {}) as {
    op?: string;
    invoiceId?: string;
    method?: "cash" | "card" | "mobile" | "insurance" | "bank";
    amount?: number;
    cashSessionId?: string;
    currency?: string;
    fxRateToBase?: number;
    receivedFrom?: string;
    note?: string;
  };

  const actorId = ctx.req.headers.get("x-user-id") ?? "system";

  if (op !== "recordPayment") return ctx.res.json({ error: "Unsupported op" }, 400);
  if (!invoiceId || !method || typeof amount !== "number") {
    return ctx.res.json({ error: "invoiceId, method, amount required" }, 400);
  }

  // Load invoice + settings
  const inv = (await databases.getDocument(
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

  // Currency & FX validation
  const payCurrency = currency || inv.currency || settings.baseCurrency;
  let fx = inv.fxRateToBase || fxRateToBase || 1;

  if (settings.fxCapture === "payment" || settings.fxCapture === "both") {
    if (payCurrency !== settings.baseCurrency && typeof fxRateToBase !== "number") {
      return ctx.res.json({ error: "fxRateToBase required for non-base currency payment" }, 400);
    }
    fx = typeof fxRateToBase === "number" ? fxRateToBase : fx;
  }

  // Cash session requirement (optional setting)
  if (settings.requirePaidAtAndCashier && method === "cash" && !cashSessionId) {
    return ctx.res.json({ error: "cashSessionId required for cash payment" }, 400);
  }

  // Create payment row
  const paidAt = new Date().toISOString();
  const paymentDoc = await databases.createDocument(DB_ID, COL.InvoicePayments, ID.unique(), {
    invoiceId,
    cashSessionId,
    type: "payment",
    amount: Number(amount),
    currency: payCurrency,
    fxRateToBase: fx,
    method,
    paidByUserId: actorId,
    receivedFrom,
    paidAt,
    note
  });

  // Re-aggregate payments and refunds
  const pays = (await databases.listDocuments(
    DB_ID,
    COL.InvoicePayments,
    [Query.equal("invoiceId", [invoiceId]), Query.limit(200)]
  )) as unknown as ListResult<unknown>;

  const docs = pays.documents as unknown[];
  const paidSum = docs.filter((d) => isType(d, "payment")).map(amt).reduce((a: number, n: number) => a + n, 0);
  const refundSum = docs.filter((d) => isType(d, "refund")).map(amt).reduce((a: number, n: number) => a + n, 0);

  const amountPaid = paidSum - refundSum;
  const amountDue = Math.max(num(inv.totalAmount) - amountPaid, 0);
  const paymentStatus = amountPaid <= 0 ? "unpaid" : amountDue > 0 ? "partial" : "paid";

  // Patch invoice
  const patch: Partial<Invoice> = {
    amountPaid,
    amountDue,
    paymentStatus,
    updatedAt: new Date().toISOString(),
    updatedBy: actorId,
  };

  if (paymentStatus === "paid" && !inv.paidAt) {
    patch.paidAt = paidAt;
    patch.paidBy = actorId;
  }

  // Note the generic <Invoice> so the SDK accepts our Partial<Invoice>
  await databases.updateDocument<InvoiceDoc>(
    DB_ID,
    COL.Invoices,
    invoiceId,
    patch as Partial<InvoiceDoc>
  );


  await writeInvoiceAudit(
    databases,
    invoiceId,
    actorId,
    "add-payment",
    ["amountPaid", "amountDue", "paymentStatus"]
  );

  return ctx.res.json({ ok: true, paymentId: (paymentDoc as { $id: string }).$id }, 200);
}
