'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';

export default function PharmacistDashboard() {
  const [diagnosisCount, setDiagnosisCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [diagRes, invRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DIAGNOSES),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.INVOICES),
        ]);

        setDiagnosisCount(diagRes.total);
        setInvoiceCount(invRes.total);
      } catch (err) {
        console.error('Failed to load pharmacist dashboard stats', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Pharmacist Dashboard</h1>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border rounded p-4 shadow-sm">
            <h2 className="text-sm text-muted-foreground">Total Diagnoses</h2>
            <p className="text-xl font-bold">{diagnosisCount}</p>
          </div>
          <div className="border rounded p-4 shadow-sm">
            <h2 className="text-sm text-muted-foreground">Total Invoices</h2>
            <p className="text-xl font-bold">{invoiceCount}</p>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Link href="/dashboard/pharmacist/diagnoses">
          <Button>🧾 View Diagnoses</Button>
        </Link>
        <Link href="/dashboard/pharmacist/invoices">
          <Button>💰 View Invoices</Button>
        </Link>
      </div>
    </div>
  );
}
