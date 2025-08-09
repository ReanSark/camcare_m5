'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { Invoice, Patient } from '@/types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [invRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);
        setInvoices(invRes.documents.map((doc) => ({
          $id: doc.$id,
          patientId: doc.patientId,
          groupInvoiceId: doc.groupInvoiceId,
          totalAmount: doc.totalAmount,
          discount: doc.discount,
          discountType: doc.discountType,
          discountNote: doc.discountNote,
          status: doc.status,
          paymentMethod: doc.paymentMethod,
          paidAt: doc.paidAt,
          paidBy: doc.paidBy,
          source: doc.source,
          note: doc.note,
          isArchived: doc.isArchived,
          updatedBy: doc.updatedBy,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        })));
        setPatients(patRes.documents.map((doc) => ({
          $id: doc.$id,
          fullName: doc.fullName,
        } as Patient)));
      } catch {
        toast.error('Failed to load invoices or patients');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const patientMap = Object.fromEntries(patients.map((p) => [p.$id, p.fullName]));

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVOICES, id);
      setInvoices((prev) => prev.filter((inv) => inv.$id !== id));
      toast.success('Invoice deleted');
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Link href="/dashboard/receptionist/invoices/new">
          <Button>New Invoice</Button>
        </Link>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : invoices.length === 0 ? (
        <p>No invoices found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Patient</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Discount</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Paid At</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.$id} className="border-t">
                  <td className="p-2 border">{patientMap[inv.patientId] ?? inv.patientId}</td>
                  <td className="p-2 border">${inv.totalAmount?.toFixed(2)}</td>
                  <td className="p-2 border">${inv.discount?.toFixed(2) ?? 0}</td>
                  <td className="p-2 border capitalize">{inv.status}</td>
                  <td className="p-2 border">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-2 border flex gap-2">
                    <Link href={`/dashboard/receptionist/invoices/view/${inv.$id}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                    <Link href={`/dashboard/receptionist/invoices/edit/${inv.$id}`}>
                      <Button variant="outline">Edit</Button>
                    </Link>
                    {/* <Button variant="destructive" onClick={() => handleDelete(inv.$id)}>
                      Delete
                    </Button> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
