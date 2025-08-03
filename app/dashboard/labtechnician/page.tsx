'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';

export default function LabTechnicianDashboard() {
  const [diagnosisCount, setDiagnosisCount] = useState(0);
  const [labResultCount, setLabResultCount] = useState(0);
  const [catalogCount, setCatalogCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [diagRes, resultRes, testRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DIAGNOSES),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.LABRESULTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.LABTESTCATALOG),
        ]);

        setDiagnosisCount(diagRes.total);
        setLabResultCount(resultRes.total);
        setCatalogCount(testRes.total);
      } catch (err) {
        console.error('Failed to load lab dashboard data', err);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Lab Technician Dashboard</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border rounded p-4 shadow-sm">
            <h2 className="text-sm text-muted-foreground">Diagnoses</h2>
            <p className="text-xl font-bold">{diagnosisCount}</p>
          </div>
          <div className="border rounded p-4 shadow-sm">
            <h2 className="text-sm text-muted-foreground">Lab Results Logged</h2>
            <p className="text-xl font-bold">{labResultCount}</p>
          </div>
          <div className="border rounded p-4 shadow-sm">
            <h2 className="text-sm text-muted-foreground">Test Catalog</h2>
            <p className="text-xl font-bold">{catalogCount}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 pt-4">
        <Link href="/dashboard/labtechnician/diagnoses">
          <Button>🧬 Lab Diagnoses</Button>
        </Link>
        <Link href="/dashboard/labtechnician/labresults">
          <Button>🧪 View Results</Button>
        </Link>
        <Link href="/dashboard/labtechnician/labtests">
          <Button>📚 Test Catalog</Button>
        </Link>
      </div>
    </div>
  );
}
