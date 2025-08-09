// app/dashboard/receptionist/invoices-v2/[id]/view/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { databases, storage } from "@/lib/appwrite.config";
import { Query, Models } from "appwrite";
import { COLLECTIONS } from "@/lib/collections";
import { DATABASE_ID, FILES_BUCKET_ID } from "@/config/env";
import type {
  AppwriteID,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  InvoiceAttachment,
  Settings,
} from "@/types";
import { computeTotals } from "@/lib/totals";

function fmt(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}`;
}

type SettingsPreview = Pick<
  Settings,
  | "baseCurrency"
  | "labSectionLabel"
  | "roundingMode"
  | "roundingKHRMode"
  | "roundingUSDDecimals"
  | "serviceChargeRate"
  | "taxRate"
  | "calcOrder"
  | "printFooterText"
  | "showDraftWatermark"
>;
const FALLBACK_SETTINGS: SettingsPreview = {
  baseCurrency: "KHR",
  labSectionLabel: "LAB",
  roundingMode: "half-up",
  roundingKHRMode: "nearest_100",
  roundingUSDDecimals: 2,
  serviceChargeRate: 0,
  taxRate: 0,
  calcOrder: "A",
  printFooterText: "",
  showDraftWatermark: true,
};

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = id as AppwriteID;

  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<SettingsPreview>(FALLBACK_SETTINGS);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // settings
        try {
          const sDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.SETTINGS, "global");
          const s = sDoc as unknown as Settings;
          if (mounted) {
            setSettings({
              baseCurrency: s.baseCurrency ?? FALLBACK_SETTINGS.baseCurrency,
              labSectionLabel: s.labSectionLabel ?? FALLBACK_SETTINGS.labSectionLabel,
              roundingMode: s.roundingMode ?? FALLBACK_SETTINGS.roundingMode,
              roundingKHRMode: s.roundingKHRMode ?? FALLBACK_SETTINGS.roundingKHRMode,
              roundingUSDDecimals: s.roundingUSDDecimals ?? FALLBACK_SETTINGS.roundingUSDDecimals,
              serviceChargeRate: s.serviceChargeRate ?? FALLBACK_SETTINGS.serviceChargeRate,
              taxRate: s.taxRate ?? FALLBACK_SETTINGS.taxRate,
              calcOrder: s.calcOrder ?? FALLBACK_SETTINGS.calcOrder,
              printFooterText: s.printFooterText ?? FALLBACK_SETTINGS.printFooterText,
              showDraftWatermark: s.showDraftWatermark ?? FALLBACK_SETTINGS.showDraftWatermark,
            });
          }
        } catch {
          // fallback
        }

        // invoice
        const invDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);
        const inv = invDoc as unknown as Invoice;
        if (mounted) setInvoice(inv);

        // items
        const listItems = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.INVOICE_ITEMS,
          [Query.equal("invoiceId", [invoiceId]), Query.orderAsc("displayOrder")]
        );
        if (mounted) {
          setItems((listItems.documents as Models.Document[]) as unknown as InvoiceItem[]);
        }

        // payments
        const listPays = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.INVOICE_PAYMENTS,
          [Query.equal("invoiceId", [invoiceId]), Query.orderDesc("paidAt")]
        );
        if (mounted) {
          setPayments((listPays.documents as Models.Document[]) as unknown as InvoicePayment[]);
        }

        // attachments
        const listAtt = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.INVOICE_ATTACHMENTS,
          [Query.equal("invoiceId", [invoiceId]), Query.orderDesc("uploadedAt")]
        );
        if (mounted) {
          setAttachments((listAtt.documents as Models.Document[]) as unknown as InvoiceAttachment[]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [invoiceId]);

  const totals = useMemo(() => {
    if (!invoice) {
      return { lineSum: 0, invoiceDiscount: 0, serviceChargeAmount: 0, taxAmount: 0, totalAmount: 0 };
    }
    return computeTotals({
      items,
      invoiceDiscount: invoice.discount ?? 0,
      taxRate: invoice.taxRate ?? settings.taxRate,
      serviceChargeRate: invoice.serviceChargeRate ?? settings.serviceChargeRate,
      settings: {
        baseCurrency: settings.baseCurrency,
        labSectionLabel: settings.labSectionLabel,
        roundingMode: settings.roundingMode,
        roundingKHRMode: settings.roundingKHRMode,
        roundingUSDDecimals: settings.roundingUSDDecimals,
        serviceChargeRate: settings.serviceChargeRate,
        taxRate: settings.taxRate,
        calcOrder: settings.calcOrder,
        printFooterText: settings.printFooterText,
        showDraftWatermark: settings.showDraftWatermark,
      } as Settings,
      currency: invoice.currency || settings.baseCurrency,
    });
  }, [invoice, items, settings]);

  const paid = useMemo(
    () => payments.filter(p => p.type === "payment").reduce((s, p) => s + (p.amount || 0), 0),
    [payments]
  );
  const refunded = useMemo(
    () => payments.filter(p => p.type === "refund").reduce((s, p) => s + (p.amount || 0), 0),
    [payments]
  );
  const net = paid - refunded;
  const currency = invoice?.currency || settings.baseCurrency;

  function viewUrl(fileId: string): string {
    return storage.getFileView(FILES_BUCKET_ID, fileId).toString();
  }
  function downloadUrl(fileId: string): string {
    return storage.getFileDownload(FILES_BUCKET_ID, fileId).toString();
  }

  if (loading || !invoice) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Invoice — View</h1>
        <p className="text-sm text-muted-foreground mt-2">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header / actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoice — View</h1>
          <div className="text-sm text-muted-foreground mt-1">
            No: <b>{invoice.invoiceNo || "—"}</b>
            {" • "}Doc: <b className="uppercase">{invoice.docStatus}</b>
            {" • "}Payment: <b className="uppercase">{invoice.paymentStatus}</b>
            {" • "}Created: {fmt(invoice.createdAt)}
            {invoice.printedAt ? <> {" • "}Printed: {fmt(invoice.printedAt)}</> : null}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Patient: <b>{invoice.patientSnapshotName || invoice.patientId}</b>
            {invoice.patientSnapshotPhone ? ` • ${invoice.patientSnapshotPhone}` : ""}
            {invoice.patientSnapshotDob ? ` • DOB: ${invoice.patientSnapshotDob}` : ""}
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.docStatus === "draft" ? (
            <Link href={`/dashboard/receptionist/invoices-v2/${invoice.$id}/edit`} className="px-4 py-2 rounded border">
              Edit Draft
            </Link>
          ) : (
            <Link href={`/dashboard/receptionist/invoices-v2/${invoice.$id}/print`} className="px-4 py-2 rounded border">
              Print View
            </Link>
          )}
          <button type="button" className="px-4 py-2 rounded border" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </div>

      {/* Items */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Items</h2>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No items.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr className="[&>th]:py-2 [&>th]:px-2">
                  <th>#</th>
                  <th>Item</th>
                  <th className="w-24 text-right">Unit</th>
                  <th className="w-28 text-right">Price</th>
                  <th className="w-28 text-right">Discount</th>
                  <th className="w-28 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.$id} className="border-b [&>td]:py-2 [&>td]:px-2">
                    <td>{idx + 1}</td>
                    <td>
                      {it.groupLabel ? (
                        <span className="text-xs text-muted-foreground mr-2">[{it.groupLabel}]</span>
                      ) : null}
                      {it.name}
                    </td>
                    <td className="text-right">{it.unit}</td>
                    <td className="text-right">
                      {it.price} {currency}
                    </td>
                    <td className="text-right">{it.discount ?? 0}</td>
                    <td className="text-right">
                      {it.subtotal} {currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Totals */}
      <section className="flex flex-col items-end gap-1">
        <div className="text-sm">
          Line Sum: <b>{totals.lineSum}</b> {currency}
        </div>
        <div className="text-sm">
          Service Charge: <b>{invoice.serviceChargeAmount ?? totals.serviceChargeAmount}</b> {currency}
        </div>
        <div className="text-sm">
          Tax: <b>{invoice.taxAmount ?? totals.taxAmount}</b> {currency}
        </div>
        <div className="text-base font-semibold">
          Total: <b>{invoice.totalAmount ?? totals.totalAmount}</b> {currency}
        </div>
      </section>

      {/* Payments summary + list (read-only) */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Payments</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border rounded p-3">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="text-base font-semibold">
              {paid} {currency}
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-muted-foreground">Refunded</div>
            <div className="text-base font-semibold">
              {refunded} {currency}
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-muted-foreground">Outstanding</div>
            <div className="text-base font-semibold">
              {Math.max(0, (invoice.totalAmount ?? totals.totalAmount) - (paid - refunded))} {currency}
            </div>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-base font-semibold uppercase">{invoice.paymentStatus}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr className="[&>th]:py-2 [&>th]:px-2">
                <th className="w-24">Type</th>
                <th className="w-24">Method</th>
                <th className="w-28 text-right">Amount</th>
                <th className="w-56">Paid At</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    No payments.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.$id} className="border-b [&>td]:py-2 [&>td]:px-2">
                    <td className="uppercase">{p.type}</td>
                    <td className="uppercase">{p.method}</td>
                    <td className="text-right">
                      {p.amount} {p.currency || currency}
                    </td>
                    <td>{fmt(p.paidAt)}</td>
                    <td>{p.note || ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Attachments (read-only) */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Attachments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr className="[&>th]:py-2 [&>th]:px-2">
                <th className="w-40">Type</th>
                <th>Note</th>
                <th className="w-48">Uploaded At</th>
                <th className="w-40">Uploaded By</th>
                <th className="w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    No attachments.
                  </td>
                </tr>
              ) : (
                attachments.map((att) => (
                  <tr key={att.$id} className="border-b [&>td]:py-2 [&>td]:px-2">
                    <td className="uppercase">{att.fileType}</td>
                    <td>{att.note || ""}</td>
                    <td>{fmt(att.uploadedAt)}</td>
                    <td>{att.uploadedBy}</td>
                    <td className="space-x-2">
                      <a
                        href={storage.getFileView(FILES_BUCKET_ID, att.fileId).toString()}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        View
                      </a>
                      <a
                        href={storage.getFileDownload(FILES_BUCKET_ID, att.fileId).toString()}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {settings.printFooterText ? (
          <div className="pt-4 text-xs text-muted-foreground">{settings.printFooterText}</div>
        ) : null}
      </section>
    </div>
  );
}
