'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthProvider';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [apptCount, setApptCount] = useState(0);
  const [diagnosisCount, setDiagnosisCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchCounts = async () => {
      try {
        const [apptRes, diagRes] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.APPOINTMENTS),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.DIAGNOSES),
        ]);

        // Appointments assigned to doctor
        const assigned = apptRes.documents.filter((doc) =>
          doc.doctorIds?.includes(user.$id)
        );
        setApptCount(assigned.length);

        // Diagnoses created by doctor
        const diag = diagRes.documents.filter(
          (doc) => doc.doctorId === user.$id
        );
        setDiagnosisCount(diag.length);
      } catch (err) {
        console.error('Failed to load doctor stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [user?.$id]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Doctor Dashboard</h1>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border rounded p-4 shadow-sm">
            <h2 className="text-sm text-muted-foreground">My Appointments</h2>
            <p className="text-xl font-bold">{apptCount}</p>
          </div>
          <div className="border rounded p-4 shadow-sm">
            <h2 className="text-sm text-muted-foreground">My Diagnoses</h2>
            <p className="text-xl font-bold">{diagnosisCount}</p>
          </div>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Link href="/dashboard/doctor/appointments">
          <Button>📅 View Appointments</Button>
        </Link>
        <Link href="/dashboard/doctor/patients">
          <Button>🧾 Patient Diagnoses</Button>
        </Link>
      </div>
    </div>
  );
}
