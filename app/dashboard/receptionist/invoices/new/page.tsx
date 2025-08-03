'use client';

import { useEffect, useState } from 'react';
import { ID } from 'appwrite';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Patient } from '@/types';

export default function NewInvoicePage() {
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState<string[]>(['']);
  const [amounts, setAmounts] = useState<number[]>([0]);
  const [status, setStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [loading, setLoading] = useState(false);

  // ✅ Calculate total amount
  const totalAmount = amounts.reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PATIENTS
      );

      const docs = res.documents.map((doc) => ({
        $id: doc.$id,
        fullName: doc.fullName,
        gender: doc.gender,
        dob: doc.dob,
        phone: doc.phone,
        email: doc.email,
        address: doc.address,
        other: doc.other,
      }));

      setPatients(docs);

      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch patients');
      }
    };
    fetchPatients();
  }, []);

  // ✅ Handle item/amount changes
  const handleItemChange = (index: number, field: 'item' | 'amount', value: string) => {
    if (field === 'item') {
      const newItems = [...items];
      newItems[index] = value;
      setItems(newItems);
    } else {
      const newAmounts = [...amounts];
      newAmounts[index] = parseFloat(value) || 0;
      setAmounts(newAmounts);
    }
  };

  const addItem = () => {
    setItems([...items, '']);
    setAmounts([...amounts, 0]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setAmounts(amounts.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!patientId || totalAmount <= 0) {
      toast.warning('Patient and valid total amount required');
      return;
    }

    setLoading(true);
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.INVOICES,
        ID.unique(),
        {
          patientId,
          items,
          totalAmount: Math.round(totalAmount * 100) / 100, // ✅ Round to 2 decimals
          status,
          paymentMethod,
          dateIssued: new Date().toISOString(),
        }
      );

      toast.success('Invoice created successfully');
      // ✅ Reset form and redirect
      router.push('/dashboard/receptionist/invoices');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">New Invoice</h1>

      {/* ✅ Patient dropdown with fallback */}
      <div>
        <label className="block mb-1">Patient</label>
        <select
          className="w-full border rounded p-2"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        >
          <option value="">Select a patient</option>
          {patients.length === 0 ? (
            <option disabled>No patients found</option>
          ) : (
            patients.map((p) => (
              <option key={p.$id} value={p.$id}>
                {p.fullName}
              </option>
            ))
          )}
        </select>
      </div>

      {/* ✅ Dynamic invoice line items */}
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          <Input
            placeholder="Item description"
            value={item}
            onChange={(e) => handleItemChange(index, 'item', e.target.value)}
          />
          <Input
            type="number"
            placeholder="Amount"
            value={amounts[index]}
            onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
          />
          {index > 0 && (
            <Button type="button" onClick={() => removeItem(index)} variant="destructive">
              ✕
            </Button>
          )}
        </div>
      ))}

      <Button type="button" onClick={addItem} variant="outline">
        + Add Item
      </Button>

      {/* ✅ Status and payment method */}
      <div className="space-y-2">
        <p className="font-medium">Total: ${totalAmount.toFixed(2)}</p>

        <div>
          <label className="block mb-1">Status</label>
          <select
            className="w-full border rounded p-2"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'paid' | 'unpaid' | 'partial')
            }
          >
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div>
          <label className="block mb-1">Payment Method</label>
          <select
            className="w-full border rounded p-2"
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as 'cash' | 'card' | 'mobile')
            }
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile">Mobile</option>
          </select>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Creating...' : 'Create Invoice'}
      </Button>
    </div>
  );
}
