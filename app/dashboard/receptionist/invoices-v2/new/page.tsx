// app/dashboard/receptionist/invoices-v2/new/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { databases, IDGen } from "@/lib/appwrite.config";
import { COLLECTIONS } from "@/lib/collections";
import { DATABASE_ID } from "@/config/env";
import type {
  Invoice,
  InvoiceItem,
  Settings,
  AppwriteID,
  ISODateString,
} from "@/types";
import { computeTotals, lineSubtotal } from "@/lib/totals";

// ---------- Local helper types ----------
type PatientDoc = {
  $id: AppwriteID;
  fullName: string;
  phone?: string;
  dob?: ISODateString | null;
};

type LabTestDoc = {
  $id: AppwriteID;
  name: string;
  price: number;
};

type DraftItem = {
  type: "lab" | "service" | "pharmacy" | "manual";
  refId?: AppwriteID | null;
  name: string;
  price: number;
  unit: number;
  discount?: number;
  discountType?: InvoiceItem["discountType"];
  discountNote?: string;
  taxable?: boolean; // default true unless overridden by settings
  groupLabel?: string; // "LAB"
  displayOrder?: number;
  labResultId?: AppwriteID | null;
};

type InvoiceCreatePayload = Pick<
  Invoice,
  | "patientId"
  | "currency"
  | "discount"
  | "taxRate"
  | "serviceChargeRate"
  | "docStatus"
  | "paymentStatus"
  | "patientSnapshotName"
  | "patientSnapshotPhone"
  | "patientSnapshotDob"
  | "createdAt"
>;

const FALLBACK_SETTINGS: Pick<
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
> = {
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
};

export default function NewInvoicePage() {
  const router = useRouter();

  // ---------- State ----------
  const [loading, setLoading] = useState<boolean>(false);
  const [patients, setPatients] = useState<PatientDoc[]>([]);
  const [patientFilter, setPatientFilter] = useState<string>("");
  const [patientId, setPatientId] = useState<AppwriteID | "">("");
  const [patientSnapshot, setPatientSnapshot] = useState<{
    name?: string;
    phone?: string;
    dob?: ISODateString;
  }>({});

  const [labTests, setLabTests] = useState<LabTestDoc[]>([]);
  const [labFilter, setLabFilter] = useState<string>("");

  const [settings, setSettings] = useState<typeof FALLBACK_SETTINGS>(
    FALLBACK_SETTINGS
  );

  const [invoiceLevelDiscount, setInvoiceLevelDiscount] = useState<number>(0);

  const [items, setItems] = useState<DraftItem[]>([]);

  // ---------- Effects: load data ----------
  useEffect(() => {
    // Settings (client-readable)
    databases
      .getDocument(DATABASE_ID, COLLECTIONS.SETTINGS, "global")
      .then((doc) => {
        const s = doc as unknown as Settings;
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
        });
      })
      .catch(() => {
        // fallback already set
      });

    // Patients (first page)
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS, [])
      .then((res) => {
        const rows = (res.documents as unknown as PatientDoc[]) || [];
        setPatients(rows);
      })
      .catch(() => setPatients([]));

    // Lab tests (first page)
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.LABTESTCATALOG, [])
      .then((res) => {
        const rows = (res.documents as unknown as LabTestDoc[]) || [];
        setLabTests(rows);
      })
      .catch(() => setLabTests([]));
  }, []);

  // ---------- Derived ----------
  const filteredPatients = useMemo(() => {
    if (!patientFilter.trim()) return patients;
    const q = patientFilter.toLowerCase();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
    );
  }, [patients, patientFilter]);

  const filteredLabTests = useMemo(() => {
    if (!labFilter.trim()) return labTests;
    const q = labFilter.toLowerCase();
    return labTests.filter((t) => t.name.toLowerCase().includes(q));
  }, [labTests, labFilter]);

  const previewTotals = useMemo(() => {
    // convert DraftItem[] to InvoiceItem-like for computeTotals
    const draftAsItems: InvoiceItem[] = items.map((i, idx) => ({
      $id: "" as AppwriteID,
      invoiceId: "" as AppwriteID,
      type: i.type,
      refId: i.refId ?? null,
      name: i.name,
      price: i.price,
      unit: i.unit,
      discount: i.discount ?? 0,
      discountType: i.discountType,
      discountNote: i.discountNote,
      subtotal: lineSubtotal({
        ...i,
        // satisfy InvoiceItem for helper
        invoiceId: "" as AppwriteID,
      } as unknown as InvoiceItem),
      displayOrder: i.displayOrder ?? idx + 1,
      groupLabel: i.groupLabel,
      taxable: i.taxable !== undefined ? i.taxable : settings.defaultItemTaxable,
      labResultId: i.labResultId ?? null,
      createdAt: undefined,
      updatedAt: undefined,
      updatedBy: undefined,
    }));

    return computeTotals({
      items: draftAsItems,
      invoiceDiscount: invoiceLevelDiscount,
      taxRate: settings.taxRate,
      serviceChargeRate: settings.serviceChargeRate,
      settings: {
        // only required bits from Settings used by computeTotals
        roundingMode: settings.roundingMode,
        roundingKHRMode: settings.roundingKHRMode,
        roundingUSDDecimals: settings.roundingUSDDecimals,
        serviceChargeRate: settings.serviceChargeRate,
        taxRate: settings.taxRate,
        calcOrder: settings.calcOrder,
        baseCurrency: settings.baseCurrency,
      } as Settings,
      currency: settings.baseCurrency,
    });
  }, [items, invoiceLevelDiscount, settings]);

  // ---------- Handlers ----------
  const handleSelectPatient = (id: AppwriteID) => {
    setPatientId(id);
    const p = patients.find((x) => x.$id === id);
    if (p) {
      setPatientSnapshot({
        name: p.fullName,
        phone: p.phone,
        dob: p.dob ?? undefined,
      });
    }
  };

  const addLabTest = (t: LabTestDoc) => {
    const taxableDefault =
      settings.nonTaxableTypes?.includes("lab") ? false : settings.defaultItemTaxable;

    setItems((prev) => [
      ...prev,
      {
        type: "lab",
        refId: t.$id,
        name: t.name,
        price: Number(t.price) || 0,
        unit: 1,
        discount: 0,
        taxable: taxableDefault,
        groupLabel: settings.labSectionLabel ?? "LAB",
        displayOrder: prev.length + 1,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, displayOrder: i + 1 }))
    );
  };

  const updateItem = <K extends keyof DraftItem>(
    index: number,
    key: K,
    value: DraftItem[K]
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleCreateDraft = async () => {
    if (!patientId) {
      alert("Please select a patient first.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item (Lab test).");
      return;
    }

    setLoading(true);
    try {
      // 1) Create invoice draft
        const invoicePayload: InvoiceCreatePayload = {
        patientId,
        currency: settings.baseCurrency,
        discount: invoiceLevelDiscount || 0,
        taxRate: settings.taxRate ?? 0,
        serviceChargeRate: settings.serviceChargeRate ?? 0,
        docStatus: "draft",
        paymentStatus: "unpaid",
        patientSnapshotName: patientSnapshot.name,
        patientSnapshotPhone: patientSnapshot.phone,
        patientSnapshotDob: patientSnapshot.dob,
        createdAt: new Date().toISOString(),
        };

      const invDoc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.INVOICES,
        IDGen.unique(),
        invoicePayload
      );
      const invoiceId = (invDoc as { $id: AppwriteID }).$id;

      // 2) Create items
      const promises = items.map((it) =>
        databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.INVOICE_ITEMS,
          IDGen.unique(),
          {
            invoiceId,
            type: it.type,
            refId: it.refId ?? null,
            name: it.name,
            price: Number(it.price) || 0,
            unit: Number(it.unit) || 1,
            discount: Number(it.discount) || 0,
            discountType: it.discountType ?? "manual",
            discountNote: it.discountNote ?? "",
            subtotal: lineSubtotal({
              // cast to InvoiceItem for helper use only
              ...(it as unknown as InvoiceItem),
              invoiceId,
            }),
            displayOrder: it.displayOrder ?? 0,
            groupLabel: it.groupLabel ?? "LAB",
            taxable:
              it.taxable !== undefined
                ? it.taxable
                : settings.defaultItemTaxable,
            labResultId: it.labResultId ?? null,
          }
        )
      );

      await Promise.all(promises);

      alert(`Draft created. Invoice ID: ${invoiceId}`);
      // You can navigate to edit once you create it:
      router.push(`/dashboard/receptionist/invoices-v2/${invoiceId}/edit`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create draft";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------- UI ----------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">New Invoice (v2)</h1>

      {/* Patient selector */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Patient</h2>
        <div className="flex gap-3 items-center">
          <input
            className="border rounded px-3 py-2 w-64"
            placeholder="Search patient by name or phone"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 w-72"
            value={patientId}
            onChange={(e) => handleSelectPatient(e.target.value as AppwriteID)}
          >
            <option value="">— Select Patient —</option>
            {filteredPatients.map((p) => (
              <option key={p.$id} value={p.$id}>
                {p.fullName} {p.phone ? `• ${p.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
        {patientId && (
          <div className="text-sm text-muted-foreground">
            Snapshot will save: <b>{patientSnapshot.name}</b>
            {patientSnapshot.phone ? ` • ${patientSnapshot.phone}` : ""}{" "}
            {patientSnapshot.dob ? ` • DOB: ${patientSnapshot.dob}` : ""}
          </div>
        )}
      </section>

      {/* Lab tests picker */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          {settings.labSectionLabel ?? "LAB"} — Add tests
        </h2>
        <div className="flex gap-3 items-center">
          <input
            className="border rounded px-3 py-2 w-64"
            placeholder="Search lab test"
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredLabTests.map((t) => (
            <button
              key={t.$id}
              type="button"
              onClick={() => addLabTest(t)}
              className="border rounded px-3 py-2 text-left hover:bg-accent"
              title="Add test"
            >
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-muted-foreground">
                {Number(t.price) || 0} {settings.baseCurrency}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Items table */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Items</h2>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No items yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b">
                <tr className="[&>th]:py-2 [&>th]:px-2">
                  <th>Type</th>
                  <th>Name</th>
                  <th className="w-24">Unit</th>
                  <th className="w-28">Price</th>
                  <th className="w-28">Discount</th>
                  <th className="w-24">Taxable</th>
                  <th className="w-28 text-right">Subtotal</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const sub = lineSubtotal({
                    ...(row as unknown as InvoiceItem),
                    invoiceId: "" as AppwriteID,
                  });
                  return (
                    <tr key={idx} className="border-b [&>td]:py-2 [&>td]:px-2">
                      <td className="uppercase">{row.type}</td>
                      <td>{row.name}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          className="border rounded px-2 py-1 w-20"
                          value={row.unit}
                          onChange={(e) =>
                            updateItem(idx, "unit", Math.max(1, Number(e.target.value) || 1))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="border rounded px-2 py-1 w-24"
                          value={row.price}
                          onChange={(e) =>
                            updateItem(idx, "price", Math.max(0, Number(e.target.value) || 0))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          className="border rounded px-2 py-1 w-24"
                          value={row.discount ?? 0}
                          onChange={(e) =>
                            updateItem(idx, "discount", Math.max(0, Number(e.target.value) || 0))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={
                            row.taxable !== undefined
                              ? row.taxable
                              : settings.defaultItemTaxable
                          }
                          onChange={(e) => updateItem(idx, "taxable", e.target.checked)}
                        />
                      </td>
                      <td className="text-right">
                        {sub} {settings.baseCurrency}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-destructive hover:underline"
                          onClick={() => removeItem(idx)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Invoice-level discount & totals */}
      <section className="space-y-3">
        <div className="flex items-center gap-4">
          <label className="text-sm">Invoice Discount</label>
          <input
            type="number"
            min={0}
            className="border rounded px-3 py-2 w-40"
            value={invoiceLevelDiscount}
            onChange={(e) =>
              setInvoiceLevelDiscount(Math.max(0, Number(e.target.value) || 0))
            }
          />
          <div className="ml-auto text-right space-y-1">
            <div className="text-sm">
              Line Sum: <b>{previewTotals.lineSum}</b> {settings.baseCurrency}
            </div>
            <div className="text-sm">
              Service Charge: <b>{previewTotals.serviceChargeAmount}</b>{" "}
              {settings.baseCurrency}
            </div>
            <div className="text-sm">
              Tax: <b>{previewTotals.taxAmount}</b> {settings.baseCurrency}
            </div>
            <div className="text-base font-semibold">
              Total: <b>{previewTotals.totalAmount}</b> {settings.baseCurrency}
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="flex gap-3">
        <button
          type="button"
          className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
          disabled={loading}
          onClick={handleCreateDraft}
        >
          {loading ? "Saving..." : "Save Draft"}
        </button>
        <button
          type="button"
          className="px-4 py-2 rounded border"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </section>
    </div>
  );
}
