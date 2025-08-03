'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { Invoice, Patient } from '@/types';

export default function PharmacistInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);

        const invoices = invRes.documents.map((doc): Invoice => ({
          $id: doc.$id,
          patientId: doc.patientId,
          items: doc.items ?? [],
          totalAmount: doc.totalAmount ?? 0,
          status: doc.status ?? 'unpaid',
          paymentMethod: doc.paymentMethod ?? 'cash',
          dateIssued: doc.dateIssued ?? '',
          other: doc.other,
        }));

        const patients = patRes.documents.map((doc): Patient => ({
          $id: doc.$id,
          fullName: doc.fullName,
          gender: doc.gender,
          dob: doc.dob,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          other: doc.other,
        }));

        const map: Record<string, string> = {};
        patients.forEach((p) => (map[p.$id] = p.fullName));

        setInvoices(invoices);
        setPatientsMap(map);
      } catch (err) {
        console.error('Failed to load invoices:', err);
        toast.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePrint = () => {
    if (printRef.current) window.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button onClick={handlePrint} variant="outline">🖨 Export / Print</Button>
      </div>

      <div ref={printRef}>
        {loading ? (
          <p>Loading...</p>
        ) : invoices.length === 0 ? (
          <p>No invoices found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 border">Patient</th>
                  <th className="text-left p-2 border">Status</th>
                  <th className="text-left p-2 border">Payment</th>
                  <th className="text-left p-2 border">Date</th>
                  <th className="text-left p-2 border">Total ($)</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.$id} className="border-t">
                    <td className="p-2 border">{patientsMap[inv.patientId] ?? '-'}</td>
                    <td className="p-2 border capitalize">{inv.status}</td>
                    <td className="p-2 border capitalize">{inv.paymentMethod}</td>
                    <td className="p-2 border">
                      {inv.dateIssued
                        ? new Date(inv.dateIssued).toLocaleString()
                        : '-'}
                    </td>
                    <td className="p-2 border">${(inv.totalAmount ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
