'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import type { Diagnosis, Patient } from '@/types';

export default function LabTechnicianDiagnosesPage() {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [diagRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DIAGNOSES),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);

        const diagnoses = diagRes.documents.map((doc): Diagnosis => ({
          $id: doc.$id,
          patientId: doc.patientId,
          doctorId: doc.doctorId,
          appointmentId: doc.appointmentId,
          diagnosis: doc.diagnosis,
          date: doc.date,
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

        setDiagnoses(diagnoses);
        setPatientsMap(map);
      } catch (err) {
        console.error('Failed to load lab diagnoses:', err);
        toast.error('Failed to load diagnoses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lab Diagnoses</h1>

      {loading ? (
        <p>Loading...</p>
      ) : diagnoses.length === 0 ? (
        <p>No diagnoses found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Patient</th>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Diagnosis</th>
                <th className="text-left p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map((d) => (
                <tr key={d.$id} className="border-t">
                  <td className="p-2 border">{patientsMap[d.patientId] ?? '-'}</td>
                  <td className="p-2 border">
                    {d.date ? new Date(d.date).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-2 border whitespace-pre-wrap">{d.diagnosis}</td>
                  <td className="p-2 border">
                    <Link
                      href={`/dashboard/labtechnician/labresults/new?patientId=${d.patientId}&diagnosisId=${d.$id}`}
                    >
                      <Button variant="outline" className="text-sm px-3 py-2 h-auto">
                        Log Result
                      </Button>
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
