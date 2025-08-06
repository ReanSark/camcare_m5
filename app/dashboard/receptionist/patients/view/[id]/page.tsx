'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { databases } from '@/lib/appwrite.config';
import { DATABASE_ID } from '@/lib/appwrite.config';
import { COLLECTIONS } from '@/lib/collections';
import type { Patient } from '@/types';
import { Button } from '@/components/ui/Button';

export default function PatientViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchPatient = async () => {
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PATIENTS, id);
        setPatient({
        $id: doc.$id,
        fullName: doc.fullName,
        gender: doc.gender,
        dob: doc.dob,
        phone: doc.phone,
        email: doc.email,
        address: doc.address,
        bloodType: doc.bloodType,
        emergencyContact: doc.emergencyContact,
        medicalHistory: doc.medicalHistory,
        isArchived: doc.isArchived,
        createdBy: doc.createdBy,
        createdAt: doc.createdAt,
        updatedBy: doc.updatedBy,
        updatedAt: doc.updatedAt,
        other: doc.other,
        });

      } catch (err) {
        toast.error('Patient not found');
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!patient) return <div className="p-8">Patient not found.</div>;

  return (
    <div className="max-w-xl mx-auto py-8 space-y-2">
      <h1 className="text-2xl font-bold mb-4">Patient Details</h1>
      <div><strong>Name:</strong> {patient.fullName}</div>
      <div><strong>Gender:</strong> {patient.gender}</div>
      <div><strong>DOB:</strong> {patient.dob ?? '-'}</div>
      <div><strong>Blood Type:</strong> {patient.bloodType ?? '-'}</div>
      <div><strong>Phone:</strong> {patient.phone ?? '-'}</div>
      <div><strong>Email:</strong> {patient.email ?? '-'}</div>
      <div><strong>Emergency Contact:</strong> {patient.emergencyContact ?? '-'}</div>
      <div><strong>Medical History:</strong> {patient.medicalHistory ?? '-'}</div>
      <div><strong>Address:</strong> {patient.address ?? '-'}</div>
      <div><strong>Other:</strong> {patient.other ?? '-'}</div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => router.push(`/dashboard/receptionist/patients/edit/${patient.$id}`)}>
          Edit
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>
    </div>
  );
}
