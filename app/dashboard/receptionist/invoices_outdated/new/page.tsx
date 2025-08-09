'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { ID } from 'appwrite';
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

export default function NewInvoicePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Invoice state
  const [form, setForm] = useState<Omit<Invoice, "$id" | "totalAmount">>({
    patientId: "",
    groupInvoiceId: "",
    discount: 0,
    discountType: "manual",
    discountNote: "",
    status: "unpaid",
    paymentMethod: "cash",
    note: "",
    isArchived: false,
  });

  // Invoice items (not yet saved to DB)
  const [items, setItems] = useState<Omit<InvoiceItem, "$id" | "invoiceId">[]>([
    { ...emptyItem }
  ]);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS);
        setPatients(res.documents.map((doc) => ({
          $id: doc.$id,
          fullName: doc.fullName,
        } as Patient)));
      } catch {
        toast.error('Failed to load patients');
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // All subtotal and total calculation are now derived only, never set state in useEffect!
  const calculatedItems = items.map(item => ({
    ...item,
    subtotal: Math.max((item.price * item.unit) - (item.discount || 0), 0)
  }));
  const invoiceSubtotal = calculatedItems.reduce((sum, i) => sum + i.subtotal, 0);
  const invoiceTotal = Math.max(invoiceSubtotal - (form.discount || 0), 0);

  // Handlers for invoice fields
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
      // 1. Create Invoice (compute total just before save)
      const invoiceRes = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.INVOICES,
        ID.unique(),
        {
          ...form,
          totalAmount: invoiceTotal,
        }
      );
      // 2. Create all InvoiceItems with calculated subtotals
      for (const item of calculatedItems) {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.INVOICE_ITEMS,
          ID.unique(),
          {
            ...item,
            invoiceId: invoiceRes.$id,
          }
        );
      }
      toast.success('Invoice created');
      router.push('/dashboard/receptionist/invoices');
    } catch (err) {
      toast.error('Failed to create invoice');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">New Invoice</h1>
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
                      ${calculatedItems[idx].subtotal.toFixed(2)}
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
            Total: ${invoiceTotal.toFixed(2)}
          </div>
          <Button type="submit" className="w-full mt-4">Create Invoice</Button>
        </form>
      )}
    </div>
  );
}
