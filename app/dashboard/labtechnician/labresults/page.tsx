'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { Patient } from '@/types';

interface LabResult {
  $id: string;
  patientId: string;
  appointmentId?: string;
  testIds?: string[];
  status: 'pending' | 'completed';
  enteredBy: string;
}

export default function LabResultsPage() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.LABRESULTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);

        const results = resRes.documents.map((doc): LabResult => ({
          $id: doc.$id,
          patientId: doc.patientId,
          appointmentId: doc.appointmentId,
          testIds: doc.testIds ?? [],
          status: doc.status ?? 'pending',
          enteredBy: doc.enteredBy,
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

        const pMap: Record<string, string> = {};
        patients.forEach((p) => (pMap[p.$id] = p.fullName));

        setResults(results);
        setPatientsMap(pMap);
      } catch (err) {
        console.error('Failed to load lab results:', err);
        toast.error('Failed to load lab results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lab Results</h1>

      {loading ? (
        <p>Loading...</p>
      ) : results.length === 0 ? (
        <p>No lab results found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Patient</th>
                <th className="text-left p-2 border">Tests</th>
                <th className="text-left p-2 border">Status</th>
                <th className="text-left p-2 border">Entered By</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.$id} className="border-t">
                  <td className="p-2 border">{patientsMap[r.patientId] ?? '-'}</td>
                  <td className="p-2 border">
                    {r.testIds?.length ? r.testIds.join(', ') : '-'}
                  </td>
                  <td className="p-2 border capitalize">{r.status}</td>
                  <td className="p-2 border">{r.enteredBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
