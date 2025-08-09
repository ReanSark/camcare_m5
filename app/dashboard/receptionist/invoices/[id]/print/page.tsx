// app/dashboard/receptionist/invoices/[id]/print/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { databases, account } from "@/lib/appwrite.config";
import { Query } from "appwrite";
import { COLLECTIONS } from "@/lib/collections";
import { DATABASE_ID } from "@/config/env";
import type { AppwriteID, Invoice, InvoiceItem, InvoicePayment, Settings } from "@/types";
import { computeTotals } from "@/lib/totals";
import type { Models } from "appwrite";

function fmt(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}`;
}

type S0 = Pick<
  Settings,
  | "baseCurrency"
  | "labSectionLabel"
  | "printFooterText"
  | "showDraftWatermark"
  | "roundingMode"
  | "roundingKHRMode"
  | "roundingUSDDecimals"
  | "serviceChargeRate"
  | "taxRate"
  | "calcOrder"
>;
const FALLBACK_SETTINGS: S0 = {
  baseCurrency: "KHR",
  labSectionLabel: "LAB",
  printFooterText: "",
  showDraftWatermark: true,
  roundingMode: "half-up",
  roundingKHRMode: "nearest_100",
  roundingUSDDecimals: 2,
  serviceChargeRate: 0,
  taxRate: 0,
  calcOrder: "A",
};

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = id as AppwriteID;

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ $id: string; name?: string | null } | null>(null);
  const [settings, setSettings] = useState<S0>(FALLBACK_SETTINGS);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // current user for printedBy
        try {
          const profile: Models.User<Models.Preferences> = await account.get();
          setMe({ $id: profile.$id, name: profile.name });
        } catch {
          setMe(null);
        }

        // settings
        try {
          const sDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.SETTINGS, "global");
          const s = sDoc as unknown as Settings;
          setSettings({
            baseCurrency: s.baseCurrency ?? FALLBACK_SETTINGS.baseCurrency,
            labSectionLabel: s.labSectionLabel ?? "LAB",
            printFooterText: s.printFooterText ?? "",
            showDraftWatermark: s.showDraftWatermark ?? true,
            roundingMode: s.roundingMode ?? "half-up",
            roundingKHRMode: s.roundingKHRMode ?? "nearest_100",
            roundingUSDDecimals: s.roundingUSDDecimals ?? 2,
            serviceChargeRate: s.serviceChargeRate ?? 0,
            taxRate: s.taxRate ?? 0,
            calcOrder: s.calcOrder ?? "A",
          });
        } catch {}

        // invoice
        const invDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);
        setInvoice(invDoc as unknown as Invoice);

        // items
        const listItems = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [
          Query.equal("invoiceId", [invoiceId]),
          Query.orderAsc("displayOrder"),
        ]);
        setItems((listItems.documents as unknown as InvoiceItem[]) || []);

        // payments
        const listPays = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_PAYMENTS, [
          Query.equal("invoiceId", [invoiceId]),
          Query.orderDesc("paidAt"),
        ]);
        setPayments((listPays.documents as unknown as InvoicePayment[]) || []);
      } finally {
        setLoading(false);
      }
    })();
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
        printFooterText: settings.printFooterText,
        showDraftWatermark: settings.showDraftWatermark,
        roundingMode: settings.roundingMode,
        roundingKHRMode: settings.roundingKHRMode,
        roundingUSDDecimals: settings.roundingUSDDecimals,
        serviceChargeRate: settings.serviceChargeRate,
        taxRate: settings.taxRate,
        calcOrder: settings.calcOrder,
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
  const outstanding = Math.max(0, (invoice?.totalAmount ?? totals.totalAmount) - net);
  const currency = invoice?.currency || settings.baseCurrency;

  async function markPrinted() {
    if (!me?.$id) {
      alert("Please sign in to stamp printedBy.");
      return;
    }
    const res = await fetch(`/api/invoices/${invoiceId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: me.$id, userName: me.name ?? null }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Failed to mark as printed");
      return;
    }
    // refetch invoice to show printedAt/By
    const invDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId);
    setInvoice(invDoc as unknown as Invoice);
  }

  if (loading || !invoice) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Invoice — Print</h1>
        <p className="text-sm text-muted-foreground mt-2">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative p-6 space-y-4">
      {/* Print CSS + watermark */}
      <style jsx global>{`
        @page { margin: 12mm; }
        @media print {
          html, body { background: #fff !important; }
          body { font-size: 12px; line-height: 1.35; }
          .print\\:hidden { display: none !important; }
          .print\\:tight td, .print\\:tight th { padding: 4px 6px !important; }
          .print-watermark {
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-20deg);
            font-size: 120px;
            font-weight: 700;
            letter-spacing: 4px;
            color: #000;
            opacity: 0.12;
            z-index: 0;
            pointer-events: none;
            user-select: none;
          }
        }
      `}</style>

      {(invoice.docStatus !== "final" && settings.showDraftWatermark) && (
        <div className="print-watermark">DRAFT</div>
      )}
      {/* Actions (hide in print) */}
      <div className="flex gap-2 print:hidden">
        <button type="button" className="px-3 py-1 rounded border" onClick={() => router.back()}>
          Back
        </button>
        <button type="button" className="px-3 py-1 rounded border" onClick={markPrinted}>
          Mark as Printed
        </button>
        <button type="button" className="px-3 py-1 rounded bg-primary text-primary-foreground" onClick={() => window.print()}>
          Print
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoice</h1>
          {invoice.docStatus !== "final" && settings.showDraftWatermark ? (
            <div className="text-sm text-red-600 font-medium">DRAFT</div>
          ) : null}
          <div className="text-sm text-muted-foreground mt-1">
            No: <b>{invoice.invoiceNo || "—"}</b>
            {" • "}Created: {fmt(invoice.createdAt)}
            {invoice.printedAt ? <> {" • "}Printed: {fmt(invoice.printedAt)}</> : null}
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">{invoice.patientSnapshotName || invoice.patientId}</div>
          {invoice.patientSnapshotPhone ? <div className="text-sm">{invoice.patientSnapshotPhone}</div> : null}
          {invoice.patientSnapshotDob ? <div className="text-sm">DOB: {invoice.patientSnapshotDob}</div> : null}
        </div>
      </div>

      {/* Items */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm print:tight">
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
              <tr key={it.$id} className="border-b [&>td]:py-1.5 [&>td]:px-2">
                <td>{idx + 1}</td>
                <td>
                  {it.groupLabel ? <span className="text-xs text-muted-foreground mr-2">[{it.groupLabel}]</span> : null}
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

      {/* Totals */}
      <div className="flex flex-col items-end gap-1">
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
      </div>

      {/* Payments summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded p-2">
          <div className="text-xs text-muted-foreground">Paid</div>
          <div className="text-base font-semibold">{paid} {currency}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-xs text-muted-foreground">Refunded</div>
          <div className="text-base font-semibold">{refunded} {currency}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-xs text-muted-foreground">Outstanding</div>
          <div className="text-base font-semibold">{outstanding} {currency}</div>
        </div>
        <div className="border rounded p-2">
          <div className="text-xs text-muted-foreground">Printed By</div>
          <div className="text-base font-semibold">
            {invoice.printedBy || me?.name || invoice.printedBy || me?.$id || "—"}
          </div>
        </div>
      </div>

      {/* Footer */}
      {settings.printFooterText ? (
        <div className="pt-4 text-xs text-muted-foreground">
          {settings.printFooterText}
        </div>
      ) : null}
    </div>
  );
}
