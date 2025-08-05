'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { Diagnosis, Patient } from '@/types';

export default function DiagnosesPage() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, Patient>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [diagRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DIAGNOSES),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);
        setDiagnoses(
          diagRes.documents.map((doc) => ({
            $id: doc.$id,
            patientId: doc.patientId,
            doctorId: doc.doctorId,
            diagnosis: doc.diagnosis,
            date: doc.date,
            appointmentId: doc.appointmentId, // if present
            other: doc.other,                 // if present
          }))
        );

        const pMap: Record<string, Patient> = {};
        patRes.documents.forEach((doc) => {
        pMap[doc.$id] = {
          $id: doc.$id,
          fullName: doc.fullName ?? '',
          gender: doc.gender ?? 'Other',
          dob: doc.dob,
          phone: doc.phone,
          email: doc.email,
          address: doc.address,
          other: doc.other,
        };
      });
        setPatientsMap(pMap);
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // TODO: Once 'requestLaboratory' is added to Diagnosis schema,
  // filter like: diagnoses.filter(d => d.requestLaboratory === true)
  let filtered = diagnoses;
  if (search.trim()) {
    const s = search.toLowerCase();
    filtered = diagnoses.filter(
      (d) =>
        (patientsMap[d.patientId]?.fullName?.toLowerCase().includes(s) ?? false) ||
        d.diagnosis.toLowerCase().includes(s) ||
        d.date?.toLowerCase().includes(s)
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Diagnoses</h1>
        <input
          type="text"
          className="border rounded p-2"
          placeholder="Search by patient, diagnosis, date"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p>No diagnoses found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Patient</th>
                <th className="text-left p-2 border">Gender</th>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Diagnosis</th>
                <th className="text-left p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.$id} className="border-t">
                  <td className="p-2 border">
                    {patientsMap[d.patientId]
                      ? `${patientsMap[d.patientId].fullName} (${d.patientId})`
                      : d.patientId}
                  </td>
                  <td className="p-2 border">
                    {patientsMap[d.patientId]?.gender ?? '-'}
                  </td>
                  <td className="p-2 border">{d.date}</td>
                  <td className="p-2 border">{d.diagnosis}</td>
                  <td className="p-2 border">
                    <Link
                      href={{
                        pathname: '/dashboard/labtechnician/labresults/new',
                        query: { patientId: d.patientId, diagnosisId: d.$id },
                      }}
                    >
                      <Button>Log Result</Button>
                    </Link>
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
