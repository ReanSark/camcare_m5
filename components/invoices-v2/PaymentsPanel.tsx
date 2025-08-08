// components/invoices-v2/PaymentsPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { databases, IDGen } from "@/lib/appwrite.config";
import { Query } from "appwrite";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import type {
  AppwriteID,
  InvoicePayment,
  InvoicePaymentStatus,
  PaymentMethod,
} from "@/types";

type RefundPolicy = "anyRefund" | "netNegative" | "none";

type Props = {
  invoiceId: AppwriteID;
  currency: string;
  totalAmount?: number; // if draft, pass preview total; if final, pass invoice.totalAmount
  refundPolicy?: RefundPolicy;
  onChange?: () => void; // parent can refetch invoice/items
  canEditPayments?: boolean;
};

function derivePaymentStatus(
  payments: ReadonlyArray<InvoicePayment>,
  total: number,
  policy: RefundPolicy
): InvoicePaymentStatus {
  const paid = payments
    .filter((p) => p.type === "payment")
    .reduce((s, p) => s + (p.amount || 0), 0);
  const refunded = payments
    .filter((p) => p.type === "refund")
    .reduce((s, p) => s + (p.amount || 0), 0);

  if (policy === "anyRefund" && refunded > 0) return "refunded";
  if (policy === "netNegative" && paid - refunded < 0) return "refunded";

  const net = paid - refunded;
  if (net <= 0) return "unpaid";
  if (net < total) return "partial";
  return "paid";
}

// Convert <input type="datetime-local"> value to UTC ISO string
function localDateTimeToISO(v: string): string {
  // v like "2025-08-09T14:30"
  const dt = new Date(v);
  // dt is interpreted in local time; toISOString gives the UTC instant
  return dt.toISOString();
}

export default function PaymentsPanel({
  invoiceId,
  currency,
  totalAmount = 0,
  refundPolicy = "anyRefund",
  onChange,
  canEditPayments = true,
}: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);

  // form state
  const [showForm, setShowForm] = useState<null | "payment" | "refund">(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paidAtLocal, setPaidAtLocal] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${mm}`;
  });
  const [note, setNote] = useState<string>("");

    async function load(): Promise<InvoicePayment[]> {
    setLoading(true);
    try {
      const list = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.INVOICE_PAYMENTS,
        [Query.equal("invoiceId", [invoiceId]), Query.orderDesc("paidAt")]
      );
      const docs = (list.documents as unknown as InvoicePayment[]) || [];
      const normalized = docs.map((p) => ({
        ...p,
        amount: Number(p.amount) || 0,
      }));
      setPayments(normalized);
      return normalized;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const totals = useMemo(() => {
    const paid = payments
      .filter((p) => p.type === "payment")
      .reduce((s, p) => s + (p.amount || 0), 0);
    const refunded = payments
      .filter((p) => p.type === "refund")
      .reduce((s, p) => s + (p.amount || 0), 0);
    const net = paid - refunded;
    const outstanding = Math.max(0, totalAmount - net);
    const status = derivePaymentStatus(payments, totalAmount, refundPolicy);
    return { paid, refunded, net, outstanding, status };
  }, [payments, totalAmount, refundPolicy]);

  async function submit() {
    if (!showForm) return;
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) {
      alert("Amount must be > 0");
      return;
    }

    // 1) create InvoicePayment
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICE_PAYMENTS,
      IDGen.unique(),
      {
        invoiceId,
        type: showForm,
        amount: amt,
        currency,
        method,
        paidAt: localDateTimeToISO(paidAtLocal),
        note,
      }
    );

    // 2) reload payments, compute new status from the fresh list
    const fresh = await load();
    const newStatus = derivePaymentStatus(fresh, totalAmount, refundPolicy);
    const refundedAmount = fresh
      .filter((p) => p.type === "refund")
      .reduce((s, p) => s + (p.amount || 0), 0);

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.INVOICES, invoiceId, {
      paymentStatus: newStatus,
      refundedAmount,
    });

    setShowForm(null);
    setAmount(0);
    setNote("");
    if (onChange) onChange();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Payments</h3>
        {canEditPayments && (
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded border"
            onClick={() => setShowForm("payment")}
          >
            Add Payment
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded border"
            onClick={() => setShowForm("refund")}
          >
            Add Refund
          </button>
        </div>
        )}
      </div>

      {/* Totals summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Paid</div>
          <div className="text-base font-semibold">
            {totals.paid} {currency}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Refunded</div>
          <div className="text-base font-semibold">
            {totals.refunded} {currency}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Outstanding</div>
          <div className="text-base font-semibold">
            {totals.outstanding} {currency}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="text-base font-semibold uppercase">{totals.status}</div>
        </div>
      </div>

      {/* List */}
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
            {loading ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted-foreground">
                  No payments yet.
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
                  <td>{new Date(p.paidAt).toLocaleString()}</td>
                  <td>{p.note || ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Simple inline form */}
      {showForm && canEditPayments && (
        <div className="border rounded p-3 space-y-3">
          <div className="text-sm font-medium">
            {showForm === "payment" ? "Add Payment" : "Add Refund"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs mb-1">Amount</label>
              <input
                type="number"
                min={0}
                className="border rounded px-2 py-1 w-full"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Method</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile</option>
                <option value="insurance">Insurance</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Paid At</label>
              <input
                type="datetime-local"
                className="border rounded px-2 py-1 w-full"
                value={paidAtLocal}
                onChange={(e) => setPaidAtLocal(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs mb-1">Note</label>
              <input
                type="text"
                className="border rounded px-2 py-1 w-full"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder=""
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded bg-primary text-primary-foreground"
              onClick={submit}
            >
              Save
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded border"
              onClick={() => setShowForm(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
