
import { Client, Databases, Query, ID } from "node-appwrite";

export function getServerClient() {
  const endpoint = process.env.APPWRITE_ENDPOINT!;
  const project = process.env.APPWRITE_PROJECT_ID!;
  const apiKey = process.env.APPWRITE_API_KEY!;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);

  return {
    client,
    databases: new Databases(client)
  };
}

export const DB_ID = process.env.APPWRITE_DATABASE_ID!;

// Collections (env keeps them configurable)
export const COL = {
  Settings: process.env.COL_SETTINGS!,
  Sequences: process.env.COL_SEQUENCES!,
  Invoices: process.env.COL_INVOICES!,
  InvoiceItems: process.env.COL_INVOICE_ITEMS!,
  InvoicePayments: process.env.COL_INVOICE_PAYMENTS!,
  InvoiceAuditLogs: process.env.COL_INVOICE_AUDIT_LOGS!,
};
export { ID, Query };
