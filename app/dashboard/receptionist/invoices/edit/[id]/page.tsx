'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ID } from 'appwrite';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { Invoice, InvoiceItem, Patient } from '@/types';

const emptyItem: Omit<InvoiceItem, "$id" | "invoiceId"> = {
  type: "manual",
  refId: "",
  name: "",
  price: 0,
  unit: 1,
  discount: 0,
  discountType: "manual",
  discountNote: "",
  subtotal: 0,
};

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<Omit<Invoice, "$id">>({
    patientId: "",
    groupInvoiceId: "",
    totalAmount: 0,
    discount: 0,
    discountType: "manual",
    discountNote: "",
    status: "unpaid",
    paymentMethod: "cash",
    note: "",
    isArchived: false,
  });
  const [items, setItems] = useState<Omit<InvoiceItem, "$id" | "invoiceId">[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        // Load invoice, items, and patients in parallel
        const [invDoc, itemsRes, patRes] = await Promise.all([
          databases.getDocument(DATABASE_ID, COLLECTIONS.INVOICES, id),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [ // filter: invoiceId == id
            `invoiceId=${id}`
          ]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);
        setForm({
          patientId: invDoc.patientId,
          groupInvoiceId: invDoc.groupInvoiceId,
          totalAmount: invDoc.totalAmount,
          discount: invDoc.discount,
          discountType: invDoc.discountType,
          discountNote: invDoc.discountNote,
          status: invDoc.status,
          paymentMethod: invDoc.paymentMethod,
          note: invDoc.note,
          isArchived: invDoc.isArchived,
        });
        setItems(
          itemsRes.documents.map((doc) => ({
            type: doc.type,
            refId: doc.refId,
            name: doc.name,
            price: doc.price,
            unit: doc.unit,
            discount: doc.discount,
            discountType: doc.discountType,
            discountNote: doc.discountNote,
            subtotal: doc.subtotal,
          }))
        );
        setPatients(patRes.documents.map((doc) => ({
          $id: doc.$id,
          fullName: doc.fullName,
        } as Patient)));
      } catch {
        toast.error('Failed to load invoice data');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAll();
  }, [id, router]);

// Compute item subtotals and invoice total ONLY as variables
const calculatedItems = items.map(item => ({
  ...item,
  subtotal: Math.max((item.price * item.unit) - (item.discount || 0), 0)
}));
const invoiceSubtotal = calculatedItems.reduce((sum, i) => sum + i.subtotal, 0);
const invoiceTotal = Math.max(invoiceSubtotal - (form.discount || 0), 0);

// Use calculatedItems and invoiceTotal in your table/summary display.


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "discount" ? Number(value) : value,
    }));
  };

  const handleItemChange = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        [field]: field === "unit" || field === "price" || field === "discount" ? Number(value) : value,
      };
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || items.length === 0) {
      toast.error('Patient and at least one item required');
      return;
    }
    try {
// 1. Update Invoice (compute total just before save)
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.INVOICES,
      id,
      {
        ...form,
        totalAmount: invoiceTotal,
      }
    );
      // 2. Overwrite InvoiceItems: Delete all then re-create for simplicity
      const itemsRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, [`invoiceId=${id}`]);
      await Promise.all(
        itemsRes.documents.map((doc) =>
          databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, doc.$id)
        )
      );
      for (const item of calculatedItems) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.INVOICE_ITEMS, ID.unique(), {
        ...item,
        invoiceId: id,
        });
      }
      toast.success('Invoice updated');
      router.push('/dashboard/receptionist/invoices/view/' + id);
    } catch (err) {
      toast.error('Failed to update invoice');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Invoice</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Patient</Label>
            <select
              name="patientId"
              value={form.patientId}
              onChange={handleChange}
              className="w-full p-2 rounded border"
              required
            >
              <option value="">-- Select Patient --</option>
              {patients.map((p) => (
                <option key={p.$id} value={p.$id}>{p.fullName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full p-2 rounded border">
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div>
              <Label>Payment Method</Label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="w-full p-2 rounded border">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Discount (overall)</Label>
            <Input name="discount" type="number" min="0" value={form.discount ?? 0} onChange={handleChange} />
          </div>
          <div>
            <Label>Discount Type</Label>
            <select name="discountType" value={form.discountType} onChange={handleChange} className="w-full p-2 rounded border">
              <option value="manual">Manual</option>
              <option value="staff">Staff</option>
              <option value="disability">Disability</option>
              <option value="promotion">Promotion</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>
          <div>
            <Label>Discount Note</Label>
            <Input name="discountNote" value={form.discountNote ?? ''} onChange={handleChange} />
          </div>
          <div>
            <Label>Other Note</Label>
            <Input name="note" value={form.note ?? ''} onChange={handleChange} />
          </div>
          {/* Invoice Items Table */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Invoice Items</h2>
            <table className="w-full border mb-2">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 border">Type</th>
                  <th className="p-1 border">Name</th>
                  <th className="p-1 border">RefID</th>
                  <th className="p-1 border">Unit</th>
                  <th className="p-1 border">Price</th>
                  <th className="p-1 border">Discount</th>
                  <th className="p-1 border">Subtotal</th>
                  <th className="p-1 border"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-1 border">
                      <select
                        value={item.type}
                        onChange={e => handleItemChange(idx, 'type', e.target.value)}
                        className="p-1 border rounded"
                      >
                        <option value="manual">Manual</option>
                        <option value="lab">Lab</option>
                        <option value="service">Service</option>
                        <option value="pharmacy">Pharmacy</option>
                      </select>
                    </td>
                    <td className="p-1 border">
                      <Input value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} required />
                    </td>
                    <td className="p-1 border">
                      <Input value={item.refId ?? ''} onChange={e => handleItemChange(idx, 'refId', e.target.value)} />
                    </td>
                    <td className="p-1 border" style={{ minWidth: 70 }}>
                      <Input type="number" min={1} value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} />
                    </td>
                    <td className="p-1 border">
                      <Input type="number" min={0} step="0.01" value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                    </td>
                    <td className="p-1 border">
                      <Input type="number" min={0} value={item.discount} onChange={e => handleItemChange(idx, 'discount', e.target.value)} />
                    </td>
                    <td className="p-1 border font-semibold">
                      ${item.subtotal.toFixed(2)}
                    </td>
                    <td className="p-1 border">
                      <Button variant="destructive" onClick={() => removeItem(idx)} disabled={items.length === 1}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button type="button" variant="outline" onClick={addItem}>Add Item</Button>
          </div>
          {/* Totals */}
          <div className="text-right text-lg font-bold">
            Total: ${form.totalAmount.toFixed(2)}
          </div>
          <Button type="submit" className="w-full mt-4">Save Changes</Button>
        </form>
      )}
    </div>
  );
}
