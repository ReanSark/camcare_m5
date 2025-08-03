'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import type { Diagnosis, Appointment } from '@/types';

export default function PatientDiagnosesPage() {
  const { id: patientId } = useParams();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [appointmentsMap, setAppointmentsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;

    const fetchData = async () => {
      try {
        const [diagRes, apptRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DIAGNOSES),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
        ]);

        // ✅ Filter by patientId and remap
        const filtered = diagRes.documents
          .filter((doc) => doc.patientId === patientId)
          .map((doc): Diagnosis => ({
            $id: doc.$id,
            patientId: doc.patientId,
            doctorId: doc.doctorId,
            appointmentId: doc.appointmentId,
            diagnosis: doc.diagnosis,
            date: doc.date,
            other: doc.other,
          }));

        // ✅ Build appointment lookup
        const appointments = apptRes.documents.map((doc): Appointment => ({
          $id: doc.$id,
          patientId: doc.patientId,
          doctorIds: doc.doctorIds ?? [],
          date: doc.date,
          reason: doc.reason ?? '',
          status: doc.status ?? 'scheduled',
          other: doc.other,
        }));

        const map: Record<string, string> = {};
        appointments.forEach((appt) => {
          map[appt.$id] = appt.date;
        });

        setDiagnoses(filtered);
        setAppointmentsMap(map);
      } catch (err) {
        console.error('Error loading diagnoses:', err);
        toast.error('Failed to load diagnoses');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Past Diagnoses</h1>

      {loading ? (
        <p>Loading...</p>
      ) : diagnoses.length === 0 ? (
        <p>No diagnoses found for this patient.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Appointment</th>
                <th className="text-left p-2 border">Diagnosis</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map((d) => (
                <tr key={d.$id} className="border-t">
                  <td className="p-2 border">
                    {d.date ? new Date(d.date).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-2 border">
                    {d.appointmentId
                      ? new Date(appointmentsMap[d.appointmentId] ?? '').toLocaleString()
                      : '-'}
                  </td>
                  <td className="p-2 border whitespace-pre-wrap">{d.diagnosis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
