// app/dashboard/receptionist/invoices-v2/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { databases } from "@/lib/appwrite.config";
import { Query, Models } from "appwrite";
import { COLLECTIONS } from "@/lib/collections";
import { DATABASE_ID } from "@/config/env";
import type { Invoice, InvoiceDocStatus, InvoicePaymentStatus } from "@/types";

const DOC_STATUS: Array<InvoiceDocStatus | "all"> = ["all", "draft", "final", "void"];
const PAY_STATUS: Array<InvoicePaymentStatus | "all"> = ["all", "unpaid", "partial", "paid", "refunded"];

function fmtYYYYMMDDHHmm(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}`;
}

export default function InvoicesV2ListPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [docStatus, setDocStatus] = useState<InvoiceDocStatus | "all">("all");
  const [payStatus, setPayStatus] = useState<InvoicePaymentStatus | "all">("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const q: string[] = [Query.orderDesc("createdAt"), Query.limit(50)];
        if (docStatus !== "all") q.push(Query.equal("docStatus", [docStatus]));
        if (payStatus !== "all") q.push(Query.equal("paymentStatus", [payStatus]));

        const list = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES, q);
        const docs = (list.documents as Models.Document[]) as unknown as Invoice[];
        if (mounted) setRows(docs);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [docStatus, payStatus]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const a = r.invoiceNo?.toLowerCase() ?? "";
      const b = r.patientSnapshotName?.toLowerCase() ?? "";
      const c = r.patientSnapshotPhone?.toLowerCase() ?? "";
      return a.includes(q) || b.includes(q) || c.includes(q);
    });
  }, [rows, search]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Invoices (v2)</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm">Doc Status</label>
          <select
            className="border rounded px-2 py-1"
            value={docStatus}
            onChange={(e) => setDocStatus(e.target.value as typeof docStatus)}
          >
            {DOC_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Payment</label>
          <select
            className="border rounded px-2 py-1"
            value={payStatus}
            onChange={(e) => setPayStatus(e.target.value as typeof payStatus)}
          >
            {PAY_STATUS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <input
          className="border rounded px-3 py-2 w-72 ml-auto"
          placeholder="Search by invoice no / patient name / phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr className="[&>th]:py-2 [&>th]:px-2">
              <th className="w-40">Invoice No</th>
              <th>Patient</th>
              <th className="w-28">Doc</th>
              <th className="w-28">Payment</th>
              <th className="w-44">Created</th>
              <th className="w-28 text-right">Total</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  No invoices.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.$id} className="border-b [&>td]:py-2 [&>td]:px-2">
                  <td className="font-medium">{row.invoiceNo || "—"}</td>
                  <td>
                    <div className="flex flex-col">
                      <span>{row.patientSnapshotName || row.patientId}</span>
                      {row.patientSnapshotPhone ? (
                        <span className="text-muted-foreground text-xs">
                          {row.patientSnapshotPhone}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="uppercase">{row.docStatus}</td>
                  <td className="uppercase">{row.paymentStatus}</td>
                  <td>{fmtYYYYMMDDHHmm(row.createdAt)}</td>
                  <td className="text-right">
                    {row.totalAmount ?? 0} {row.currency || ""}
                  </td>
                  <td className="text-right">
                    <a
                      href={`/dashboard/receptionist/invoices-v2/${row.$id}/edit`}
                      className="text-primary hover:underline"
                    >
                      Open
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
