'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';

interface LabTest {
  $id: string;
  name: string;
  price: number;
  category?: string;
  notes?: string;
}

export default function LabTestCatalogPage() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LABTESTCATALOG);
        const docs = res.documents.map((doc): LabTest => ({
          $id: doc.$id,
          name: doc.name,
          price: doc.price,
          category: doc.category,
          notes: doc.notes,
        }));
        setTests(docs);
      } catch (err) {
        console.error('Failed to load lab tests:', err);
        toast.error('Failed to load lab tests');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Lab Test Catalog</h1>
        <Link href="/dashboard/labtechnician/labtests/new">
          <Button>➕ Add Test</Button>
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : tests.length === 0 ? (
        <p>No lab tests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Name</th>
                <th className="text-left p-2 border">Price</th>
                <th className="text-left p-2 border">Category</th>
                <th className="text-left p-2 border">Notes</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.$id} className="border-t">
                  <td className="p-2 border">{t.name}</td>
                  <td className="p-2 border">${t.price.toFixed(2)}</td>
                  <td className="p-2 border">{t.category ?? '-'}</td>
                  <td className="p-2 border">{t.notes ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
