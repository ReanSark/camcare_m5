// app/dashboard/receptionist/invoices/new/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
// Minimal patient shape for picker + snapshot
type PatientDoc = {
  $id: AppwriteID;
  fullName: string;
  phone?: string;
  dob?: ISODateString | null;
};

// Minimal lab catalog row
type LabTestDoc = {
  $id: AppwriteID;
  name: string;
  price: number;
};

// Minimal service catalog row
type ServiceDoc = {
  $id: AppwriteID;
  name: string;
  basePrice: number;
  taxable?: boolean | null;
};

// Minimal pharmacy product row
type PharmacyProductDoc = {
  $id: AppwriteID;
  name: string;
  price: number;
  sku?: string | null;
  taxable?: boolean | null;
};

// Staged (pre-save) line item model used on this page
type DraftItem = {
  type: "lab" | "service" | "pharmacy" | "manual";
  refId?: AppwriteID | null; // catalog $id when applicable
  name: string;
  price: number;
  unit: number;
  discount?: number;
  discountType?: InvoiceItem["discountType"];
  discountNote?: string;
  taxable?: boolean; // defaults handled at usage
  groupLabel?: string; // visual grouping (LAB/SERVICE/PHARMACY/OTHER)
  displayOrder?: number; // 1..N
  labResultId?: AppwriteID | null;
};

// Payload subset for creating a draft invoice (no $-system keys)
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

// Cambodia-friendly defaults if Settings/global is missing
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
  const loadedRef = useRef(false); // available if you want a Strict Mode run-once guard (currently unused)
  const [loading, setLoading] = useState<boolean>(false);

  // Patient list + filter + selected patient id
  const [patients, setPatients] = useState<PatientDoc[]>([]);
  const [patientFilter, setPatientFilter] = useState<string>("");
  const [patientId, setPatientId] = useState<AppwriteID | "">("");

  // Snapshot of patient (frozen onto invoice)
  const [patientSnapshot, setPatientSnapshot] = useState<{
    name?: string;
    phone?: string;
    dob?: ISODateString;
  }>({});

  // Catalogs + filters (LAB / SERVICE / PHARMACY)
  const [labTests, setLabTests] = useState<LabTestDoc[]>([]);
  const [labFilter, setLabFilter] = useState<string>("");

  const [services, setServices] = useState<ServiceDoc[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string>("");

  const [products, setProducts] = useState<PharmacyProductDoc[]>([]);
  const [productFilter, setProductFilter] = useState<string>("");

  // Settings used for pricing/rounding (loaded from DB, fallback first)
  const [settings, setSettings] = useState<typeof FALLBACK_SETTINGS>(
    FALLBACK_SETTINGS
  );

  // Invoice-level discount (amount, not percent)
  const [invoiceLevelDiscount, setInvoiceLevelDiscount] = useState<number>(0);

  // The single source of truth for staged lines on this page
  const [items, setItems] = useState<DraftItem[]>([]);

  // Inline form state for adding a manual line
  const [manualForm, setManualForm] = useState({
    name: "",
    unit: 1,
    price: 0,
    discount: 0,
    taxable: true,
    groupLabel: "OTHER",
  });

  // ---------- Effects: load data ----------
  useEffect(() => {
    // Settings (client-readable). Merged into fallbacks.
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
        // fallbacks already set
      });

    // Patients (first page for demo)
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS, [])
      .then((res) => {
        const rows = (res.documents as unknown as PatientDoc[]) || [];
        setPatients(rows);
      })
      .catch(() => setPatients([]));

    // Lab tests catalog
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.LABTESTCATALOG, [])
      .then((res) => {
        const rows = (res.documents as unknown as LabTestDoc[]) || [];
        setLabTests(rows);
      })
      .catch(() => setLabTests([]));

    // Services catalog
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.SERVICE_LIST, [])
      .then((res) => {
        const rows = (res.documents as unknown as ServiceDoc[]) || [];
        setServices(rows);
      })
      .catch(() => setServices([]));

    // Pharmacy products catalog
    databases
      .listDocuments(DATABASE_ID, COLLECTIONS.PHARMACY_PRODUCTS, [])
      .then((res) => {
        const rows = (res.documents as unknown as PharmacyProductDoc[]) || [];
        setProducts(rows);
      })
      .catch(() => setProducts([]));
  }, []);

  // ---------- Derived ----------
  // Filtered patients for the select box
  const filteredPatients = useMemo(() => {
    if (!patientFilter.trim()) return patients;
    const q = patientFilter.toLowerCase();
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q)
    );
  }, [patients, patientFilter]);

  // Filtered LAB / SERVICE / PHARMACY lists for their pickers
  const filteredLabTests = useMemo(() => {
    if (!labFilter.trim()) return labTests;
    const q = labFilter.toLowerCase();
    return labTests.filter((t) => t.name.toLowerCase().includes(q));
  }, [labTests, labFilter]);

  const filteredServices = useMemo(() => {
    if (!serviceFilter.trim()) return services;
    const q = serviceFilter.toLowerCase();
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, serviceFilter]);

  const filteredProducts = useMemo(() => {
    if (!productFilter.trim()) return products;
    const q = productFilter.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
  );
  }, [products, productFilter]);

  // Live totals preview: convert DraftItem[] → InvoiceItem-like[] and compute totals
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

  // Choose a default visual group label when item.groupLabel is absent
  function fallbackGroupLabel(type: DraftItem["type"], settings: typeof FALLBACK_SETTINGS): string {
    if (type === "lab") return settings.labSectionLabel ?? "LAB";
    if (type === "service") return "SERVICE";
    if (type === "pharmacy") return "PHARMACY";
    return "OTHER";
  }

  // Combine catalog-backed duplicates by (type, refId); bump unit instead of adding a row
  // Manual items remain separate to preserve free-form entries
  function upsertDraftItem(prev: DraftItem[], incoming: DraftItem): DraftItem[] {
    const isCatalog =
      (incoming.type === "service" || incoming.type === "pharmacy" || incoming.type === "lab") &&
      !!incoming.refId;

    if (isCatalog) {
      const idx = prev.findIndex(
        (it) => it.type === incoming.type && it.refId === incoming.refId
      );
      if (idx >= 0) {
        const existing = prev[idx];
        const merged: DraftItem = {
          ...existing,
          // increment unit; keep existing price/discount/group/taxable
          unit: Math.max(1, (existing.unit || 1) + (incoming.unit || 1)),
        };
        const next = prev.slice();
        next[idx] = merged;
        return next;
      }
    }

    // append as a new row with next displayOrder
    const displayOrder = incoming.displayOrder ?? prev.length + 1;
    return [...prev, { ...incoming, displayOrder }];
  }

  // ---------- Handlers ----------
  // Select patient and capture a snapshot for the invoice
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

  // Add a lab line (non-taxable by default per settings.nonTaxableTypes)
  const addLabTest = (t: LabTestDoc) => {
    const taxableDefault =
      settings.nonTaxableTypes?.includes("lab") ? false : settings.defaultItemTaxable;

    setItems((prev) =>
      upsertDraftItem(prev, {
        type: "lab",
        refId: t.$id,
        name: t.name,
        price: Number(t.price) || 0,
        unit: 1,
        discount: 0,
        taxable: taxableDefault,
        groupLabel: settings.labSectionLabel ?? "LAB",
        displayOrder: prev.length + 1,
      })
    );
  };

  // Add a SERVICE line from catalog
  const addService = (svc: ServiceDoc) => {
    const taxableDefault =
      svc.taxable ?? settings.defaultItemTaxable; // services usually taxable
    setItems((prev) =>
      upsertDraftItem(prev, {
        type: "service",
        refId: svc.$id,
        name: svc.name,
        price: Number(svc.basePrice) || 0,
        unit: 1,
        discount: 0,
        taxable: !!taxableDefault,
        groupLabel: "SERVICE",
        displayOrder: prev.length + 1,
      })
    );
  };

  // Add a PHARMACY line from catalog
  const addPharmacy = (p: PharmacyProductDoc) => {
    const taxableDefault =
      p.taxable ?? settings.defaultItemTaxable; // pharmacy usually taxable
    setItems((prev) =>
      upsertDraftItem(prev, {
        type: "pharmacy",
        refId: p.$id,
        name: p.name, // (optionally include SKU in the UI label later)
        price: Number(p.price) || 0,
        unit: 1,
        discount: 0,
        taxable: !!taxableDefault,
        groupLabel: "PHARMACY",
        displayOrder: prev.length + 1,
      })
    );
  };

  // Add a MANUAL free-form line
  const addManual = (args: {
    name: string;
    price: number;
    unit?: number;
    discount?: number;
    taxable?: boolean;
    groupLabel?: string;
  }) => {
    const unit = Math.max(1, Number(args.unit ?? 1));
    const price = Math.max(0, Number(args.price) || 0);
    const discount = Math.max(0, Number(args.discount ?? 0));
    const taxableDefault =
      typeof args.taxable === "boolean" ? args.taxable : settings.defaultItemTaxable;

    setItems((prev) => [
      ...prev,
      {
        type: "manual",
        refId: null,
        name: args.name.trim(),
        price,
        unit,
        discount,
        taxable: !!taxableDefault,
        groupLabel: args.groupLabel || "OTHER",
        displayOrder: prev.length + 1,
      },
    ]);
  };

  // Remove a line and resequence displayOrder
  const removeItem = (index: number) => {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, displayOrder: i + 1 }))
    );
  };

  // Update a single editable field on a line (unit/price/discount/taxable)
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

  // Persist: create draft invoice → create invoice items → redirect to Edit
  const handleCreateDraft = async () => {
    if (!patientId) {
      alert("Please select a patient first.");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one item (Lab, Service, Pharmacy, or Manual).");
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

      // 2) Create items (compute subtotal + safe displayOrder + fallback groupLabel)
      const promises = items.map((it, idx) =>
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
            displayOrder: it.displayOrder ?? idx + 1,
            groupLabel: it.groupLabel ?? fallbackGroupLabel(it.type, settings),
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
      router.push(`/dashboard/receptionist/invoices/${invoiceId}/edit`);
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
    {/* Page title */}
    <h1 className="text-2xl font-semibold">New Invoice (v2)</h1>

    {/* =========================
        PATIENT SELECTOR
        - Search by name/phone (client-side filter)
        - Select sets patientId and captures a snapshot (name/phone/dob)
       ========================= */}
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Patient</h2>
      <div className="flex gap-3 items-center">
        {/* Patient search box (filters the dropdown below) */}
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search patient by name or phone"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
        />
        {/* Patient dropdown (binds to handleSelectPatient via onChange in your code) */}
        <select
          className="border rounded px-3 py-2 w-72"
          /* value + onChange already wired in your code */
        >
          {/* Options are mapped from filteredPatients; the first empty option lets user clear selection */}
          {/* ... */}
        </select>
      </div>
    </section>

    {/* =========================
        LAB PICKER
        - Quick search over lab tests
        - Clicking a card calls addLabTest (deduped; bumps unit)
       ========================= */}
    <section className="space-y-3">
      <h2 className="text-lg font-medium">
        {/* Uses settings.labSectionLabel when available */}
        {settings.labSectionLabel ?? "LAB"} — Add tests
      </h2>

      {/* Filter for lab tests */}
      <div className="flex gap-3 items-center">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search lab test"
          value={labFilter}
          onChange={(e) => setLabFilter(e.target.value)}
        />
      </div>

      {/* Lab results as clickable cards (each onClick → addLabTest) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* {filteredLabTests.map(...)} renders name + price */}
        {/* ... */}
      </div>
    </section>

    {/* =========================
        SERVICE PICKER
        - Mirrors LAB UI
        - Clicking calls addService (deduped; bumps unit)
       ========================= */}
    <section className="space-y-3">
      <h2 className="text-lg font-medium">SERVICE — Add items</h2>

      {/* Search services by name */}
      <div className="flex gap-3 items-center">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search service by name"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        />
      </div>

      {/* Service cards (onClick → addService) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* {filteredServices.map(...)} renders name + basePrice */}
        {/* ... */}
      </div>
    </section>

    {/* =========================
        PHARMACY PICKER
        - Mirrors SERVICE UI
        - Clicking calls addPharmacy (deduped; bumps unit)
       ========================= */}
    <section className="space-y-3">
      <h2 className="text-lg font-medium">PHARMACY — Add products</h2>

      {/* Search products by name or SKU */}
      <div className="flex gap-3 items-center">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="Search product by name or SKU"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        />
      </div>

      {/* Product cards (onClick → addPharmacy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* {filteredProducts.map(...)} renders name + price (+ SKU if present) */}
        {/* ... */}
      </div>
    </section>

    {/* =========================
        MANUAL ITEM ADDER
        - Free-form row (not deduped)
        - addManual(args) pushes a new DraftItem
       ========================= */}
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Manual item</h2>

      {/* Inline form: name, unit, price, discount, group, taxable */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1">Name</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={manualForm.name}
            onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
            placeholder="e.g., Consultation fee"
          />
        </div>
        {/* Unit */}
        <div>
          <label className="block text-xs mb-1">Unit</label>
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 w-full"
            value={manualForm.unit}
            onChange={(e) =>
              setManualForm({ ...manualForm, unit: Math.max(1, Number(e.target.value) || 1) })
            }
          />
        </div>
        {/* Price */}
        <div>
          <label className="block text-xs mb-1">Price</label>
          <input
            type="number"
            min={0}
            className="border rounded px-2 py-1 w-full"
            value={manualForm.price}
            onChange={(e) =>
              setManualForm({ ...manualForm, price: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </div>
        {/* Discount */}
        <div>
          <label className="block text-xs mb-1">Discount</label>
          <input
            type="number"
            min={0}
            className="border rounded px-2 py-1 w-full"
            value={manualForm.discount}
            onChange={(e) =>
              setManualForm({
                ...manualForm,
                discount: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </div>
        {/* Group label (visual grouping in tables/print) */}
        <div>
          <label className="block text-xs mb-1">Group</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={manualForm.groupLabel}
            onChange={(e) =>
              setManualForm({ ...manualForm, groupLabel: e.target.value || "OTHER" })
            }
          />
        </div>
        {/* Taxable toggle */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={manualForm.taxable}
            onChange={(e) => setManualForm({ ...manualForm, taxable: e.target.checked })}
          />
          Taxable
        </label>
      </div>

      {/* Add manual item button → addManual(manualForm) then reset form */}
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-1 rounded border"
          onClick={() => {
            if (!manualForm.name.trim()) {
              alert("Item name is required");
              return;
            }
            addManual(manualForm);
            setManualForm({ ...manualForm, name: "", unit: 1, price: 0, discount: 0 });
          }}
        >
          Add Manual Item
        </button>
      </div>
    </section>

    {/* =========================
        CURRENT DRAFT ITEMS TABLE
        - Shows what will be saved as InvoiceItems
        - Each row is editable (unit/price/discount/taxable), remove button calls removeItem(idx)
       ========================= */}
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Items</h2>

      {/* Only render table when there are rows */}
      {items.length > 0 && (
        <div className="overflow-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 w-28">Type</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-right px-3 py-2 w-20">Unit</th>
                <th className="text-right px-3 py-2 w-28">Price</th>
                <th className="text-right px-3 py-2 w-28">Discount</th>
                <th className="text-center px-3 py-2 w-24">Taxable</th>
                <th className="text-right px-3 py-2 w-28">Subtotal</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {/* Map each DraftItem to a row with inputs bound to updateItem(idx, key, value) */}
              {/* ... */}
            </tbody>
          </table>
        </div>
      )}
    </section>

    {/* =========================
        INVOICE-LEVEL DISCOUNT & PREVIEW TOTALS
        - invoiceLevelDiscount applies after line discounts
        - previewTotals recalculated from items + settings
       ========================= */}
    <section className="space-y-3">
      <div className="flex items-center gap-4">
        {/* Invoice-level flat discount input */}
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
      </div>

      {/* Totals summary (preview only; persisted on finalize) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
    </section>

    {/* =========================
        ACTIONS
        - Save Draft: creates Invoice + InvoiceItems, then navigates to Edit page
        - Cancel: route back
       ========================= */}
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