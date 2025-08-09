// app/dashboard/receptionist/invoices/[id]/edit/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { account, databases } from "@/lib/appwrite.config";
import { Query } from "appwrite";
import type { Models } from "appwrite";
import { COLLECTIONS } from "@/lib/collections";
import { DATABASE_ID } from "@/config/env";
import type {
  AppwriteID,
  Invoice,
  InvoiceItem,
  InvoicePaymentStatus,
  Settings,
} from "@/types";
import { computeTotals, lineSubtotal } from "@/lib/totals";
import PaymentsPanel from "@/components/invoices-v2/PaymentsPanel";
import AttachmentsPanel from "@/components/invoices-v2/AttachmentsPanel";
import Link from "next/link";

type SettingsPreview = Pick<
  Settings,
  | "baseCurrency"
  | "taxRate"
  | "serviceChargeRate"
  | "calcOrder"
  | "roundingMode"
  | "roundingKHRMode"
  | "roundingUSDDecimals"
  | "labSectionLabel"
  | "defaultItemTaxable"
  | "nonTaxableTypes"
  | "refundStatusPolicy"
>;
const FALLBACK_SETTINGS: SettingsPreview = {
  baseCurrency: "KHR",
  taxRate: 0,
  serviceChargeRate: 0,
  calcOrder: "A",
  roundingMode: "half-up",
  roundingKHRMode: "nearest_100",
  roundingUSDDecimals: 2,
  labSectionLabel: "LAB",
  defaultItemTaxable: true,
  nonTaxableTypes: ["lab"],
  refundStatusPolicy: "anyRefund",
};

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id as AppwriteID;

  const [loading, setLoading] = useState<boolean>(true);
  const [finalizing, setFinalizing] = useState<boolean>(false);
  const [me, setMe] = useState<{ $id: string; name?: string | null } | null>(null);

  const [settings, setSettings] = useState<SettingsPreview>(FALLBACK_SETTINGS);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const canFinalize = useMemo(
    () => !!invoice && invoice.docStatus === "draft" && items.length > 0,
    [invoice, items.length]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Settings
      try {
        const sDoc = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.SETTINGS,
          "global"
        );
        const s = sDoc as unknown as Settings;
        setSettings({
          baseCurrency: s.baseCurrency ?? FALLBACK_SETTINGS.baseCurrency,
          taxRate: s.taxRate ?? 0,
          serviceChargeRate: s.serviceChargeRate ?? 0,
          calcOrder: s.calcOrder ?? "A",
          roundingMode: s.roundingMode ?? "half-up",
          roundingKHRMode: s.roundingKHRMode ?? "nearest_100",
          roundingUSDDecimals: s.roundingUSDDecimals ?? 2,
          labSectionLabel: s.labSectionLabel ?? "LAB",
          defaultItemTaxable:
            s.defaultItemTaxable ?? FALLBACK_SETTINGS.defaultItemTaxable,
          nonTaxableTypes: s.nonTaxableTypes ?? ["lab"],
          refundStatusPolicy: s.refundStatusPolicy ?? "anyRefund",
        });
      } catch {
        // fallback already set
      }

      // Invoice
      const invDoc = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.INVOICES,
        invoiceId
      );
      const inv = invDoc as unknown as Invoice;
      setInvoice(inv);

      // Items
      const list = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.INVOICE_ITEMS,
        [Query.equal("invoiceId", [invoiceId]), Query.orderAsc("displayOrder")]
      );
      const rows = (list.documents as unknown as InvoiceItem[]).map((i, idx) => ({
        ...i,
        unit: i.unit ?? 1,
        price: i.price ?? 0,
        discount: i.discount ?? 0,
        taxable: i.taxable !== false,
        displayOrder: i.displayOrder ?? idx + 1,
      }));
      setItems(rows);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    (async () => {
      try {
        const user: Models.User<Models.Preferences> = await account.get();
        setMe({ $id: user.$id, name: user.name });
      } catch {
        setMe(null);
      }
      fetchAll();
    })();
  }, [fetchAll]);

  const previewTotals = useMemo(() => {
    if (!invoice) {
      return { lineSum: 0, invoiceDiscount: 0, serviceChargeAmount: 0, taxAmount: 0, totalAmount: 0 };
    }
    return computeTotals({
      items,
      invoiceDiscount: invoice.discount ?? 0,
      taxRate: invoice.taxRate ?? settings.taxRate,
      serviceChargeRate: invoice.serviceChargeRate ?? settings.serviceChargeRate,
      settings: {
        roundingMode: settings.roundingMode,
        roundingKHRMode: settings.roundingKHRMode,
        roundingUSDDecimals: settings.roundingUSDDecimals,
        serviceChargeRate: settings.serviceChargeRate,
        taxRate: settings.taxRate,
        calcOrder: settings.calcOrder,
        baseCurrency: settings.baseCurrency,
      } as Settings,
      currency: invoice.currency || settings.baseCurrency,
    });
  }, [items, invoice, settings]);

  async function finalizeInvoice() {
    if (!canFinalize || !invoice) return;
    setFinalizing(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.$id}/finalize`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error || "Finalize failed");
      }
      const data = (await res.json()) as {
        ok: true;
        invoiceNo: string;
        paymentStatus: InvoicePaymentStatus;
        totals: {
          lineSum: number;
          invoiceDiscount: number;
          serviceChargeAmount: number;
          taxAmount: number;
          totalAmount: number;
        };
      };

      // Refresh invoice & items from DB
      await fetchAll();

      alert(`Finalized. Invoice No: ${data.invoiceNo}`);
      // Optionally navigate to view page:
      // router.push(`/dashboard/receptionist/invoices/${invoice.$id}/view`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Finalize failed";
      alert(msg);
    } finally {
      setFinalizing(false);
    }
  }

  async function voidInvoice() {
    if (!invoice || !me?.$id) return;
    const reason = prompt("Reason for voiding? (required)") || "";
    if (!reason.trim()) return;
    const res = await fetch(`/api/invoices/${invoice.$id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: me.$id, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Void failed");
      return;
    }
    await fetchAll();
    alert("Invoice voided.");
  }

  async function toggleArchive(nextVal: boolean) {
    if (!invoice || !me?.$id) return;
    const reason = prompt(nextVal ? "Reason to archive? (optional)" : "Reason to unarchive? (optional)") || "";
    const res = await fetch(`/api/invoices/${invoice.$id}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: me.$id, archived: nextVal, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || "Archive toggle failed");
      return;
    }
    await fetchAll();
  }

  if (loading || !invoice) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Invoice — Edit</h1>
        <p className="text-sm text-muted-foreground mt-2">Loading…</p>
      </div>
    );
    }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoice — Edit</h1>
          <div className="text-sm text-muted-foreground mt-1">
            Status: <b className="uppercase">{invoice.docStatus}</b>
            {" • "}
            Payment: <b className="uppercase">{invoice.paymentStatus}</b>
            {invoice.invoiceNo ? (
              <>
                {" • "}No: <b>{invoice.invoiceNo}</b>
              </>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Patient: <b>{invoice.patientSnapshotName || invoice.patientId}</b>
            {invoice.patientSnapshotPhone ? ` • ${invoice.patientSnapshotPhone}` : ""}
            {invoice.patientSnapshotDob ? ` • DOB: ${invoice.patientSnapshotDob}` : ""}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
            disabled={!canFinalize || finalizing}
            onClick={finalizeInvoice}
            title={canFinalize ? "Finalize invoice" : "Add items before finalizing"}
          >
            {finalizing ? "Finalizing…" : "Finalize"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border disabled:opacity-50"
            disabled={!invoice || invoice.docStatus !== "final"}
            onClick={voidInvoice}
            title="Void invoice (final only)"
          >
            Void
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded border"
            onClick={() => toggleArchive(!(invoice?.isArchived ?? false))}
            title={(invoice?.isArchived ? "Unarchive" : "Archive") + " invoice"}
          >
            {invoice?.isArchived ? "Unarchive" : "Archive"}
          </button>
          {invoice.docStatus === "final" && (
            <Link href={`/dashboard/receptionist/invoices/${invoice.$id}/print`} className="px-4 py-2 rounded border">
              Print View
            </Link>
          )}
          <button
            type="button"
            className="px-4 py-2 rounded border"
            onClick={() => router.back()}
          >
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
                  <th>Type</th>
                  <th>Name</th>
                  <th className="w-20 text-right">Unit</th>
                  <th className="w-24 text-right">Price</th>
                  <th className="w-24 text-right">Discount</th>
                  <th className="w-24 text-center">Taxable</th>
                  <th className="w-28 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const sub = lineSubtotal(it);
                  return (
                    <tr key={it.$id} className="border-b [&>td]:py-2 [&>td]:px-2">
                      <td>{idx + 1}</td>
                      <td className="uppercase">{it.type}</td>
                      <td>{it.name}</td>
                      <td className="text-right">{it.unit}</td>
                      <td className="text-right">{it.price}</td>
                      <td className="text-right">{it.discount ?? 0}</td>
                      <td className="text-center">
                        {it.taxable !== false ? "Yes" : "No"}
                      </td>
                      <td className="text-right">
                        {sub} {invoice.currency || settings.baseCurrency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Totals */}
      <section className="flex flex-col items-end gap-1">
        <div className="text-sm">
          Line Sum: <b>{previewTotals.lineSum}</b> {invoice.currency || settings.baseCurrency}
        </div>
        <div className="text-sm">
          Service Charge: <b>{previewTotals.serviceChargeAmount}</b>{" "}
          {invoice.currency || settings.baseCurrency}
        </div>
        <div className="text-sm">
          Tax: <b>{previewTotals.taxAmount}</b>{" "}
          {invoice.currency || settings.baseCurrency}
        </div>
        <div className="text-base font-semibold">
          Total: <b>{previewTotals.totalAmount}</b>{" "}
          {invoice.currency || settings.baseCurrency}
        </div>
      </section>
        {/* Attachments */}
        <section className="space-y-3">
          <AttachmentsPanel
            invoiceId={invoice.$id}
            canEdit={invoice.docStatus === "final"}
          />
        </section>
        {/* Payments */}
        <section className="space-y-3">
        <PaymentsPanel
            invoiceId={invoice.$id}
            currency={invoice.currency || settings.baseCurrency}
            totalAmount={
            invoice.docStatus === "final"
                ? invoice.totalAmount ?? 0
                : previewTotals.totalAmount
            }
            refundPolicy={settings.refundStatusPolicy}
            canEditPayments={invoice.docStatus === "final"}
            onChange={fetchAll}
        />
        </section>
    </div>
  );
}
