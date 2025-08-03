'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import type { Appointment, Patient } from '@/types';
import Link from 'next/link';

export default function DoctorAppointmentsPage() {
  const { user } = useAuth(); // ✅ get logged-in doctor session
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientsMap, setPatientsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchData = async () => {
      try {
        const [apptRes, patRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.PATIENTS),
        ]);

        // ✅ Filter appointments where doctor is assigned
        const appointments = apptRes.documents
          .filter((doc) => doc.doctorIds?.includes(user.$id))
          .map((doc): Appointment => ({
            $id: doc.$id,
            patientId: doc.patientId,
            doctorIds: doc.doctorIds ?? [],
            date: doc.date,
            reason: doc.reason ?? '',
            status: doc.status ?? 'scheduled',
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

        setAppointments(appointments);
        setPatientsMap(map);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        toast.error('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.$id]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">My Appointments</h1>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Patient</th>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Status</th>
                <th className="text-left p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.$id} className="border-t">
                  <td className="p-2 border">{patientsMap[appt.patientId] ?? '-'}</td>
                  <td className="p-2 border">{new Date(appt.date).toLocaleString()}</td>
                  <td className="p-2 border capitalize">{appt.status}</td>
                  <td className="p-2 border">
                    <Link href={`/dashboard/doctor/appointments/${appt.$id}/diagnose`}>
                      <Button variant="outline" className="text-sm px-3 py-1.5 h-auto">Diagnose</Button>
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
