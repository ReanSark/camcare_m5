'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import { Query } from "appwrite";
import type { LabResult, LabResultDetail, Patient } from '@/types';

export default function ViewLabResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [labResult, setLabResult] = useState<LabResult | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [details, setDetails] = useState<LabResultDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        // 1. Fetch LabResult
        const doc = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.LABRESULTS,
          id
        );
        setLabResult({
        $id: doc.$id,
        patientId: doc.patientId,
        diagnosisId: doc.diagnosisId,
        testName: doc.testName ?? '-',
        status: doc.status ?? 'pending',
        processedBy: doc.processedBy ?? '',
        labSource: doc.labSource ?? '',
        createdAt: doc.createdAt,
        });

        // 2. Fetch Patient (by patientId)
        if (doc.patientId) {
          try {
            const pat = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.PATIENTS,
              doc.patientId
            );
            setPatient({
            $id: pat.$id,
            fullName: pat.fullName ?? '',
            gender: pat.gender ?? "Other", // Provide a safe default
            dob: pat.dob,
            phone: pat.phone,
            email: pat.email,
            address: pat.address,
            other: pat.other,
          });
          } catch {
            setPatient(null);
          }
        }

        // 3. Fetch LabResultDetails (all details for this result)
        const res = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.LABRESULTDETAILS,
            [Query.equal('labResultId', id)]
            );

        setDetails(
        res.documents.map((doc) => ({
            $id: doc.$id,
            labResultId: doc.labResultId,
            testItem: doc.testItem,
            value: doc.value ?? '',
            unit: doc.unit ?? '',
            referenceRange: doc.referenceRange ?? '',
            flag: doc.flag ?? '',
            note: doc.note ?? '',
        }))
        );
      } catch (err) {
        console.error('Failed to load lab result:', err);
        toast.error('Failed to load lab result');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!labResult) {
    return <div className="p-6 text-red-500">Lab result not found.</div>;
  }

  return (
  <div className="max-w-3xl mx-auto py-6 space-y-6">
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Lab Result Details</h1>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/labtechnician/labresults/edit/${labResult.$id}`)}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>
    </div>

    {/* Main LabResult info ... (same as before) */}

    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">Test Result Details</h2>
        <Button
          onClick={() => router.push(`/dashboard/labtechnician/labresults/view/${labResult.$id}/details/new`)}
        >
          Add Test Result
        </Button>
      </div>
      {details.length === 0 ? (
        <p className="italic text-gray-500">No test details recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Test Item</th>
                <th className="text-left p-2 border">Value</th>
                <th className="text-left p-2 border">Unit</th>
                <th className="text-left p-2 border">Ref Range</th>
                <th className="text-left p-2 border">Flag</th>
                <th className="text-left p-2 border">Note</th>
                <th className="text-left p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.$id} className="border-t">
                  <td className="p-2 border">{d.testItem}</td>
                  <td className="p-2 border">{d.value ?? '-'}</td>
                  <td className="p-2 border">{d.unit ?? '-'}</td>
                  <td className="p-2 border">{d.referenceRange ?? '-'}</td>
                  <td className="p-2 border">{d.flag ?? '-'}</td>
                  <td className="p-2 border">{d.note ?? '-'}</td>
                  <td className="p-2 border flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/labtechnician/labresults/view/${labResult.$id}/details/edit/${d.$id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!window.confirm('Delete this test result?')) return;
                        try {
                          await databases.deleteDocument(
                            DATABASE_ID,
                            COLLECTIONS.LABRESULTDETAILS,
                            d.$id
                          );
                          toast.success('Test result deleted.');
                          // Optionally re-fetch details here or remove from local state
                          setDetails((prev) => prev.filter((item) => item.$id !== d.$id));
                        } catch (err) {
                          toast.error('Failed to delete.');
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </td>
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