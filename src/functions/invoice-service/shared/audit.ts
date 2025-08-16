
import { Databases, ID } from "node-appwrite";
import { DB_ID, COL } from "./appwrite";

export async function writeInvoiceAudit(databases: Databases, invoiceId: string, performedBy: string, action: string, changedFields?: string[], note?: string) {
  try {
    await databases.createDocument(DB_ID, COL.InvoiceAuditLogs, ID.unique(), {
      invoiceId, action, changedFields: changedFields ?? [], performedBy, timestamp: new Date().toISOString(), note
    });
  } catch {}
}
